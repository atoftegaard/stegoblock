var SBStego = function () {

	return {

		maxPlaintextLength: 200,
		blockLength: 4400,

		alphabetFrequencies: {
			
			' ': 16.06718960,
			'e': 8.38191046,
			't': 5.97449455,
			'o': 5.49426190,
			'a': 5.49365722,
			'n': 5.17089898,
			'i': 4.87451515,
			'r': 4.55353236,
			's': 4.31688330,
			'l': 2.93379732,
			'h': 2.70875299,
			'd': 2.40453403,
			'c': 2.26601057,
			'u': 1.97602092,
			'm': 1.76507724,
			'p': 1.50065145,
			'f': 1.34908232,
			'y': 1.34689517,
			'g': 1.32540969,
			'.': 1.14563926,
			'w': 1.13791993,
			'b': 0.92085225,
			',': 0.83979924,
			'0': 0.83385535,
			'v': 0.74238124,
			'-': 0.70177754,
			'E': 0.68850029,
			'=': 0.64724045,
			'k': 0.58342728,
			'T': 0.56770557,
			'2': 0.51566439,
			'C': 0.51247374,
			'/': 0.47558818,
			'S': 0.47345250,
			'1': 0.43507454,
			'A': 0.43493302,
			'I': 0.42157858,
			'_': 0.36992336,
			'M': 0.36024846,
			'N': 0.33621560,
			'P': 0.32306700,
			'O': 0.32287402,
			'D': 0.31618393,
			'R': 0.30635465,
			'>': 0.27271121,
			':': 0.26795096,
			'3': 0.26488896,
			'\'': 0.22384783,
			'B': 0.21430158,
			'H': 0.21057057,
			'L': 0.20983724,
			'F': 0.19583951,
			'\t': 0.19488746,
			'@': 0.19023013,
			'5': 0.18643479,
			'9': 0.18505817,
			'W': 0.18344998,
			'x': 0.18092833,
			'?': 0.18050377,
			'G': 0.17274584,
			'4': 0.16012472,
			'7': 0.15750015,
			'U': 0.14626852,
			'8': 0.14083925,
			'6': 0.13537139,
			'J': 0.13009651,
			')': 0.12981347,
			'(': 0.12127074,
			'<': 0.10048000,
			'q': 0.09605425,
			'j': 0.09571974,
			'K': 0.08672672,
			'z': 0.08664953,
			'V': 0.08546590,
			'Y': 0.07774656,
			';': 0.06578159,
			'*': 0.06518978,
			'&': 0.05738038,
			'$': 0.05343066,
			'"': 0.05126925,
			'!': 0.04618735,
			'X': 0.04392301,
			'+': 0.03535455,
			'Z': 0.02887031,
			'Q': 0.02826563,
			'|': 0.02237320,
			'~': 0.02202583,
			']': 0.01722698,
			'[': 0.01717552,
			'%': 0.01478253,
			'\\': 0.01220941,
			'#': 0.01201643,
			'`': 0.00562225,
			'{': 0.00015439,
			'}': 0.00014152
		},
		
		generateNoise: function (sizeArr, plaintextArr) {
			
			let input = sizeArr.concat(plaintextArr);
			let noise = [];
			let ptDict = {};

			// verify that all chars in plaintext exist in the alphabet.
			// track how many times each char occur.
			for (let i = 0; i < input.length; i++) {

				// init bucket if none exists.
				if (ptDict[input[i]] === undefined)
					ptDict[input[i]] = 0;
				
				// increment char count.
				ptDict[input[i]]++;
			}
			
			// run through all chars of the alphabet.
			for (let x in this.alphabetFrequencies) {
				
				// calculate the char count given the specified block length (4400) and frequency
				let charCount = Math.round(this.blockLength / 100 * this.alphabetFrequencies[x]);
				let ptFreq = ptDict[x] || 0;

				charCount = charCount - ptFreq; // subtract the char count in the plaintext, from the calculated.
				if (charCount < 0)
					charCount = 0; // there is already too many of the given char, to maintain correct frequency. notify about this later.
				
				// as the frequency and char count calculated is now with respect to the plaintext, push the char onto the noise
				// array "charCount" times.
				for (let i = 0; i < charCount; i++)
					noise.push(x);
			}
			
			// shuffle noise, as we would otherwise reveal if some key is fake and ruin plausible deniability.
			this.shuffle(new Math.seedrandom(), noise);
			
			return noise;
		},
		
		encode: function (plaintext, seed, key) {

			if(plaintext.length > this.maxPlaintextLength)
				throw 'Plaintext too long';
			
			let plaintextArr = typeof plaintext === 'string' ? plaintext.split('') : plaintext; // convert plaintext to string array
			let length = plaintextArr.length.toString();
			
			if (plaintextArr.length === 0) {

				while (this.isPositiveInteger(length))
					length = this.getRandomString(3);
			}

			let prng = new Math.seedrandom(seed + key); // seed the prng with desired key
			let sizeArr = this.leftPad(length, '000').split('');
			let noise = this.generateNoise(sizeArr, plaintextArr); // generate noise with correct letter frequencies
			let block = sizeArr.concat(plaintextArr).concat(noise);

			this.shuffle(prng, block);

			return block;
		},
		
		decode: function (block, seed, key) {

			let prng = new Math.seedrandom(seed + key);
			block = block.split('');

			this.unshuffle(prng, block);

			let sizeStr = block.slice(0, 3).join('');

			// 3 first chars must be digits to be valid 
			if (!this.isPositiveInteger(sizeStr))
				return '';
			
			// parse the size of the plaintext to an int, so we can slice it off
			let size = parseInt(sizeStr);

			// must be valid length
			if (size < 0 || size > this.maxPlaintextLength)
				return '';

			return block.slice(3, 3 + size).join('');
		},

		// knuth-fisher-yates shuffle
		shuffle: function (prng, arr) {

			for (let i = arr.length - 1; i > 0; i--) {

				let j = this.getRandomInRange(prng, 0, i);
				let temp = arr[i];

				arr[i] = arr[j];
				arr[j] = temp;
			}
			
			return arr;
		},

		// reverse knuth-fisher-yates shuffle. only works if prng is in same state as when shuffled.
		unshuffle: function (prng, arr) {

			// generate all swapping positions needed, so we may start with the last one.
			let indexes = [];
			for (let i = arr.length - 1; i > 0; i--)
				indexes.unshift(this.getRandomInRange(prng, 0, i));
		
			// reverse knuth-fisher-yates shuffle
			for (let i = 1; i < arr.length; i++) {

				let j = indexes.shift();
				let temp = arr[i];

				arr[i] = arr[j];
				arr[j] = temp;
			}
			return arr;
		},

		// checks if a string has correct frequency of each char, according to alphabetFrequencies.
		checkFrequency: function (string) {

			let dict = {};
			let ret = {

				notInAlphabet: [],
				outsideFrequencyBounds: []
			};

			for (let i = 0; i < string.length; i++) {

				if (dict[string[i]] === undefined)
					dict[string[i]] = 0;
				
				dict[string[i]]++;
			}

			let frequencies = [];
			let sortedKeys = Object.keys(dict).sort();
			
			for (let k in sortedKeys) {

				let charCount = Math.round(this.blockLength / 100 * this.alphabetFrequencies[sortedKeys[k]]);
				let isInAlphabet = this.alphabetFrequencies[sortedKeys[k]] !== undefined;
				let isFrequencyWithinBounds = isInAlphabet && charCount === dict[sortedKeys[k]];

				if (!isInAlphabet)
					ret.notInAlphabet.push(sortedKeys[k]);
				if (!isFrequencyWithinBounds)
					ret.outsideFrequencyBounds.push(sortedKeys[k]);
			}
			
			return ret;
		},
		
		// returns the next char of a plaintext array or noise, if the first is empty.
		getChar: function (plaintext, noise) {

			if (plaintext.length > 0)
				return plaintext.shift();

			return noise.shift();
		},

		// checks if some input is a positive integer. from: http://stackoverflow.com/a/10835227
		isPositiveInteger: function (input) {
			return 0 === input % (!isNaN(parseFloat(input)) && 0 <= ~~input);
		},
		
		// returns a random int in the specified range (including), using the provided function.
		getRandomInRange: function (prng, min, max) {
			
			min = Math.ceil(min);
			max = Math.floor(max);
			
			return Math.floor(prng() * (max - min + 1)) + min;
		},
		
		// left pads some string with some other string
		leftPad: function (text, pad) {

			if (typeof text === 'undefined') 
				return pad;

			return (pad + text).substring(text.length, text.length + pad.length);
		},

		// generates random string of given length. only alpha numeric chars.
		getRandomString: function (length, prng) {

			let text = '';
			let possible = Object.keys(this.alphabetFrequencies).join('');

			if (!prng)
				prng = new Math.seedrandom();
			
			for (let i = 0; i < length; i++)
				text += possible.charAt(Math.floor(prng() * possible.length));
			
			return text;
		}
	};
};

// extend the global variable with common functionality, for easy access
window.SBCommon.utils.extend(window.SBStego, SBStego());