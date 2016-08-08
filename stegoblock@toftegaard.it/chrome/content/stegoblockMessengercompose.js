const sbCommon = window.StegoBlock();
window.sb = {
	ui: {
		addressNodeRegEx: /addressCol2/,
		addressRegEx: /<(.*)>/,
		map: {},
		key: null,
		maxMessageLength: 255,

		elementMap: function(id) {
			
			if (this.map[id] === undefined)
				this.map[id] = document.getElementById(id);
			return this.map[id];
		},

		NotifyComposeFieldsReady: function() {		

			let label = this.elementMap('stegoblock-message-length');
			label.value = this.maxMessageLength + ' chars left';

			this.elementMap('stegoblock-textbox').addEventListener('keydown', this.validateLength, true);

			this.observeRecipientsByPolling();
		},

		observeRecipientsByPolling: function() {

			let that = this;
			setInterval(function() {

				let els = document.getElementsByTagName('*'); // get fresh collection each iteration
				let addresses = that.getRecipients(els);
				
				if (addresses.length > 1)
					that.disable('toomany');
				else if (addresses[0] !== undefined)
					that.validateRecipientAndKey(addresses[0]);
				else
					that.enable(null); //needed??

			}, 500);
		},

		getRecipients: function(elementsCollection){

			let addresses = [];
			for each (let element in elementsCollection) {
				if (this.addressNodeRegEx.test(element.id)) {
					let val = document.getElementById(element.id).value.trim();
					if (val.length > 0)
						addresses.push(val);
				}
			}
			return addresses;
		},

		validateRecipientAndKey: function(recipient){

			let prefs = sbCommon.getCharPref('addressesAndKeys');

			// handle name <email> format

			if (recipient.indexOf('<') > 0)
				recipient = this.addressRegEx.exec(recipient)[1]

			// check if key is known for recipient

			let foundKey = false;
			for (let i = 0; i < prefs.length; i++)
				if (prefs[i].addr && (prefs[i].addr == recipient))
					foundKey = prefs[i].key;

			if (foundKey)
				this.enable(foundKey);
			else
				this.disable('nokey', recipient);
		},

		disable: function (reason, extra) {
			// runs every 500ms, fix.

			let label = this.elementMap('stegoblock-disabled-label');
			let box = this.elementMap('stegoblock-disabled-box');
			let textbox = this.elementMap('stegoblock-textbox');
			let addbox = this.elementMap('stegoblock-add-key-box');

			let reasonText;
			switch (reason) {
				case 'toomany': {
					reasonText = 'Stego Block only supports one recipient';
					addbox.collapsed = true;
					break;
				}
				case 'nokey': {
					window.recipient = extra; // NOT HERE!!!
					//this.elementMap('stegoblock-add-key').value = '';
					reasonText = 'No StegoKey found for ' + extra;
					addbox.collapsed = false;
					this.validateKey();
					break;
				}
			}

			this.key = null;
			label.value = reasonText;
			box.collapsed = false;
			textbox.collapsed = true;
		},

		enable: function (key) {

			let box = this.elementMap('stegoblock-disabled-box');
			let textbox = this.elementMap('stegoblock-textbox');

			this.key = key;
			box.collapsed = true;
			textbox.collapsed = false;
		},

		validateKey: function () {

			let value = this.elementMap('stegoblock-add-key').value;
			let button = this.elementMap('stegoblock-add-button');
			
			if (value === undefined || value.length < 8) {
				button.disabled = true;
				return;
			}

			button.disabled = false;
		},

		validateLength: function(event) {

			let textboxValue = window.sb.ui.elementMap('stegoblock-textbox').value;
			let remaining = window.sb.ui.maxMessageLength - textboxValue.length;
			let keyCode = event.keyCode;

			if(remaining <= 0 && event.keyCode !== 8 && event.keyCode !== 46){
				event.preventDefault();
				return false;
			}
		},

		setRemainingCharCount: function(event) {

			let label = this.elementMap('stegoblock-message-length');
			let textbox = this.elementMap('stegoblock-textbox');

			if(textbox.value.length > this.maxMessageLength) // prevents pasting of long texts
				textbox.value = textbox.value.substring(0, this.maxMessageLength);

			let remaining = this.maxMessageLength - textbox.value.length;

			label.value = (remaining === 1 ? (remaining + ' char left') : (remaining + ' chars left'));
		},

		addKey: function () {

			let textbox = this.elementMap('stegoblock-add-key');
			let key = textbox.value;

			let prefs = sbCommon.getCharPref('addressesAndKeys');
			prefs.push({ addr: window.recipient, key: key });

			sbCommon.setCharPref('addressesAndKeys', prefs);
			textbox.value = '';
		}
	},

	injectStegoBlockInMessageHeader: function (event) {

		let prefs = sbCommon.getCharPref('addressesAndKeys');
		let plaintext = document.getElementById('stegoblock-textbox').value;
alert('pt length: ' + plaintext.length);
		plaintext = window.sb.padRemaining(plaintext);
alert('pt length: ' + plaintext.length);
		let ciphertext = CryptoJS.AES.encrypt(plaintext, window.sb.ui.key, {
			mode: CryptoJS.mode.CBC,
			padding: CryptoJS.pad.Pkcs7
		}).toString();
alert('ct length: ' + ciphertext.length);
		ciphertext = window.sb.fold(ciphertext);
alert('ct length: ' + ciphertext.length);
		gMsgCompose.compFields.setHeader('X-Stegoblock', ciphertext);
	},

	padRemaining: function(text) {

		text = text.substring(0, this.ui.maxMessageLength);
		text += '//'; // no need to escape, this is the last occurence of //. cannot be generated by the random text generator

		let random = this.randomString(this.ui.maxMessageLength + 2);
		return this.pad(text, random);
	},

	pad: function (text, pad) {

		if (typeof text === 'undefined') 
			return pad;

		return (text + pad).substring(0, pad.length);
	},

	randomString: function(length) {
		let text = '';
		let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		
		for(let i = 0; i < length; i++)
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		
		return text;
	},

	fold: function (str) {

		let ret = [];
		let len;
		let n = 50;

		for(let i = 0, len = str.length; i < len; i += n)
			ret.push(str.substr(i, n))

		return ret.join(' ');
	},

	ascii: function (string) {

		let arr = [];
		for (let i = 0; i < string.length; i++)
			arr.push(string.charCodeAt(i));

		return arr.join('');
	}
};

window.addEventListener('compose-send-message', window.sb.injectStegoBlockInMessageHeader, true);
window.addEventListener('compose-window-init', function(){ gMsgCompose.RegisterStateListener(window.sb.ui); }, true);