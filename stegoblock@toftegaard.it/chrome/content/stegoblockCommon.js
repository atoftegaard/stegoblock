var StegoBlock = function(){

	// gets the StegoBlock extension preferences.
	var initPreferences = function(obj) {
		
		if (obj.prefs)
			return;

		obj.prefs = Components.classes['@mozilla.org/preferences-service;1']
			.getService(Components.interfaces.nsIPrefService)
			.getBranch('stegoblock.');
	};

	return {

		// shortcut for the extensions preferences
		prefs: null,

		// stores callbacks for the preference observer
		observeCallbacks: {},

		// convenience utilities, nice to have
		utils: {

			// native JS implementation for extending objects. somewhat similar to jQuery.extend()
			extend: function extend() {

				if (typeof(arguments[0]) === undefiend)
					arguments[0] = {};

				for (let i = 1; i < arguments.length; i++)
					for (let key in arguments[i])
						if (arguments[i].hasOwnProperty(key))
							arguments[0][key] = arguments[i][key];

				return arguments[0];
			}
		},

		steganography: {

			blockLength: 4096,
				
			alphabetFrequencies: {
				
				' ': 18.31685753,
				'e': 10.21787708,
				't': 7.50999398,
				'a': 6.55307059,
				'o': 6.20055405,
				'n': 5.70308374,
				'i': 5.73425524,
				's': 5.32626738,
				'r': 4.97199926,
				'h': 4.86220925,
				'l': 3.35616550,
				'd': 3.35227377,
				'u': 2.29520040,
				'c': 2.26508836,
				'm': 2.01727037,
				'f': 1.97180888,
				'w': 1.68961396,
				'g': 1.63586607,
				'p': 1.50311560,
				'y': 1.46995463,
				'b': 1.27076566,
				'v': 0.78804815,
				'k': 0.56916712,
				'x': 0.14980832,
				'j': 0.11440544,
				'q': 0.08809302,
				'z': 0.05979301
			},
			
			generateNoise: function(plaintext) {
				
				let noise = [];
				let ptDict = {};

				// verify that all chars in plaintext exist in the alphabet.
				// track how many times each char occur.
				for (let i = 0; i < plaintext.length; i++) {

					// match with alphabet
					//if (this.alphabetFrequencies[plaintext[i]] === undefined) // given char is not in alphabet. notify about this later.

					// init bucket if no one exists.
					if (ptDict[plaintext[i]] === undefined)
						ptDict[plaintext[i]] = 0;
					
					// increment char count.
					ptDict[plaintext[i]]++;
				}
				
				// run through all chars of the alphabet.
				for (let x in this.alphabetFrequencies) {
					
					// calculate the char frequency given the specified block length (4096)
					let frequency = Math.ceil(this.blockLength / 100 * this.alphabetFrequencies[x]);
					let ptFreq = ptDict[x] || 0;

					frequency = frequency - ptFreq; // subtract the char frequency in the plaintext, from the calculated.
					if (frequency < 0)
						frequency = 0; // there are too many of the given char, to maintain correct frequency. notify about this later.
					
					// as the frequency calculated is now with respect to the plaintext, push the char onto the noise array "frequency" times.
					for (let i = 0; i < frequency; i++)
						noise.push(x);
				}

				// generated noise may not be exactly the desired length, because the rounding up of (blocklength / frequency) will
				// be slightly off. remedy by removing random chars until noise has correct length.
				while (noise.length !== this.blockLength - plaintext.length)
					noise.splice(this.getRandomInRange(Math.random, 0, noise.length - 1), 1);
				
				return noise;
			},

			checkFrequency: function(string) {

				let dict = {};
				for (let i = 0; i < string.length; i++) {

					if (dict[string[i]] === undefined)
						dict[string[i]] = 0;
					
					dict[string[i]]++;
				}

				let frequencies = [];
				let sortedKeys = Object.keys(dict).sort();
				for (let i = 0; i < sortedKeys.length; i++) {

					let f = dict[sortedKeys[i]] / string.length * 100;
					let af = this.alphabetFrequencies[sortedKeys[i]];
					let isInAlphabet = af !== undefined;
					let isFrequencyWithinBounds = isInAlphabet && Math.abs(af - f) < 0.1;

					frequencies.push(sortedKeys[i] + ': f: ' + f + ' isInAlphabet: ' + isInAlphabet + ' fbound: ' + (isFrequencyWithinBounds ? isFrequencyWithinBounds : ( 'F ' + dict[sortedKeys[i]] + ' AF ' + string.length / 100 * this.alphabetFrequencies[sortedKeys[i]] )));
				}

				alert(frequencies.join('\r\n'));
			},
			
			hide: function(plaintext, key) {
				
				let plaintextArr = typeof plaintext === 'string' ? plaintext.split('') : plaintext; // convert plaintext to string array
				let prng = new Math.seedrandom(key); // seed the prng with desired key
				let plaintextLength = this.leftPad(plaintextArr.length.toString(), '000').split(''); // 3 digit length of plaintext
				let block = []; // the stegoblock

				plaintextArr = plaintextLength.concat(plaintextArr); // prepend plaintext length to plaintext
				let noise = this.generateNoise(plaintextArr.join('')); // generate noise with correct letter frequencies
				
				// iterate until entire block has been filled with message and noise
				while (block.length < this.blockLength) {

					let insertIndex = this.getRandomInRange(prng, 0, block.length);
					// pitfall: to avoid overriding any previously added char, new chars are inserted, as
					// opposed to setting the value at a given index to some char. this means later extraction
					// indexes are relative to their insertion order.
					block.splice(insertIndex, 0, this.getChar(plaintextArr, noise));
				}
				
				this.checkFrequency(block);
				return window.btoa(block.join('')); // b64 encode for now, to avoid multiple concurrent whitespaces (will be stripped).
			},
			
			show: function(ciphertext, key) {

				let ciphertextArr = window.atob(ciphertext).split('');
				let prng = new Math.seedrandom(key);
				let insertionIndexes = [];
				let chars = [];
				
				// we can only generate the indexes forward, but need to pull chars out reversed.
				// therefore we will need to iterate twice.
				// because chars are always inserted, extraction indexes are relative to the block length.
				for (let i = 0; i < ciphertextArr.length; i++) {
				
					let insertIndex = this.getRandomInRange(prng, 0, insertionIndexes.length);
					insertionIndexes.unshift(insertIndex);
				}

				// we now have the reverse order of indexes the plaintext was inserted with. extract the correct chars.
				for (let i = 0; i < insertionIndexes.length; i++)
					chars.unshift(ciphertextArr.splice(insertionIndexes[i], 1)[0]);
				
				// parse the size of the plaintext to an int, so we can slice it off
				let size = parseInt(chars.slice(0, 3).join(''));

				return chars.slice(3, 3 + size).join('');
			},
			
			// returns the next char of a plaintext array, or noise, if the first is empty.
			getChar: function(plaintext, noise) {

				if (plaintext.length > 0)
					return plaintext.shift();
					
				return noise.shift();
			},
			
			// returns a random int in the specified range (including), using the provided function.
			getRandomInRange: function(prng, min, max) {
				
				min = Math.ceil(min);
				max = Math.floor(max);
				return Math.floor(prng() * (max - min + 1)) + min;
			},
			
			// left pads some string with some other string
			leftPad: function (text, pad) {

				if (typeof text === 'undefined') 
					return pad;

				return (pad + text).substring(text.length, text.length + pad.length);
			}
		},

		// register a callback that gets fired when preferences change
		observeCharPreferences: function(id, callback) {

			if (this.prefs === null){
				let that = this;
				let observingObject = {

					observe: function(subject, topic, data) {

						if (topic != 'nsPref:changed')
							return;
						
						for (let callbackId in that.observeCallbacks)
							that.observeCallbacks[callbackId](JSON.parse(that.prefs.getCharPref(data)));
					} 
				};

				initPreferences(this);

				this.prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
				this.prefs.addObserver('', observingObject, false);
			}

			if (this.observeCallbacks[id] === undefined)
				this.observeCallbacks[id] = callback;
		},

		// get specific char preference as an object
		getCharPref: function(key) {
			
			initPreferences(this);

			return JSON.parse(this.prefs.getCharPref(key));
		},

		// set specific char preference with an object. object gets stored serialied.
		setCharPref: function(key, value) {
			
			initPreferences(this);

			this.prefs.setCharPref(key, JSON.stringify(value));
		},

		// unregister a previously registered callback for preference change
		forget: function(id) {

			delete this.observeCallbacks[id];
		}
	};
};

// extend the global variable with common functionality, for easy access
StegoBlock.utils.extend(window.StegoBlock, StegoBlock());