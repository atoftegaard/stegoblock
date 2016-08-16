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

				for (var i = 1; i < arguments.length; i++)
					for (var key in arguments[i])
						if (arguments[i].hasOwnProperty(key))
							arguments[0][key] = arguments[i][key];

				return arguments[0];
			}
		},

		steganography: {

			blockLength: 4096,
				
			alphabet: null,
			
			alphabetCount: 0,

			lettersAndFrequency: {
				
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
			
			init: function() {
				
				let resultElm = document.getElementById('result');
				let freqStr = [];
				
				for (let x in this.lettersAndFrequency) {
					
					let freq = Math.ceil(this.blockLength / 100 * this.lettersAndFrequency[x]);
					
					for (let i = 0; i < freq; i++)
						freqStr.push(x);
				}
				
				this.alphabet = this.shuffle(freqStr).splice(0, this.blockLength);
			},
			
			show: function(ciphertext, key) {

				let ciphertextArr = window.atob(ciphertext).split('');
				let prng = new Math.seedrandom(key);
				let numbers = [];
				let chars = [];
				
				for (let i = 0; i < ciphertextArr.length; i++) {
				
					let insertIndex = this.getRandomInRange(prng, 0, this.blockLength) % (numbers.length + 1);
					numbers.unshift(insertIndex);
				}

				for (let i = 0; i < numbers.length; i++)
					chars.unshift(ciphertextArr.splice(Math.min(numbers[i], ciphertextArr.length - 1), 1)[0]);
				
				let size = parseInt(chars.slice(0, 3).join(''));

				return chars.slice(3, 3 + size).join('');
			},
			
			hide: function(plaintext, key) {
				
				this.init();

				let plaintextArr = plaintext.split('');
				let prng = new Math.seedrandom(key);
				let inserts = 0;
				let block = [];
				let size = this.leftPad(plaintextArr.length.toString(), '000').split('');
				
				while (inserts < this.blockLength) {

					let insertIndex = this.getRandomInRange(prng, 0, this.blockLength) % (block.length + 1);
					block.splice(insertIndex, 0, this.getChar(size, plaintextArr));
					inserts++;
				}
				
				return window.btoa(block.join(''));
			},
			
			getChar: function(size, inputArr) {

				if (size.length > 0)
					return size.shift();

				if (inputArr.length > 0)
					return inputArr.shift();
					
				return this.alphabet[this.alphabetCount++];
			},
			
			getRandomInRange: function(prng, min, max) {
				
				min = Math.ceil(min);
				max = Math.floor(max);
				return Math.floor(prng() * (max - min + 1)) + min;
			},
			
			leftPad: function (text, pad) {

				if (typeof text === 'undefined') 
					return pad;

				return (pad + text).substring(text.length, text.length + pad.length);
			},
				
			shuffle: function (a) {

				let n = a.length;
				for (let i = n - 1; i > 0; i--) {

					let j = Math.floor(Math.random() * (i + 1));
					let tmp = a[i];
					a[i] = a[j];
					a[j] = tmp;
				}
				return a;
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