const sbCommon = window.StegoBlock();
window.sb = {
	ui: {
		addressNodeRegEx: /addressCol2/,
		addressRegEx: /<(.*)>/,
		map: {},
		key: null,

		elementMap: function(id) {
			
			if (this.map[id] === undefined)
				this.map[id] = document.getElementById(id);
			return this.map[id];
		},

		NotifyComposeFieldsReady: function() {			

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

		addKey: function () {

			let textbox = this.elementMap('stegoblock-add-key');
			let key = textbox.value;

			let prefs = sbCommon.getCharPref('addressesAndKeys');
			prefs.push({ addr: window.recipient, key: key });

			sbCommon.setCharPref('addressesAndKeys', prefs);
		}
	},

	injectStegoBlockInMessageHeader: function (event) {

		let prefs = sbCommon.getCharPref('addressesAndKeys');
		let plaintext = document.getElementById('stegoblock-textbox').value;
		let ciphertext = CryptoJS.AES.encrypt(plaintext, window.sb.ui.key).toString();
		//let foldedCiphertext = this.fold(ciphertext);

		gMsgCompose.compFields.setHeader('X-Stegoblock', ciphertext);
	},

	fold: function (text) {

		let textArr = [];
		let fold = [];
		let len = 66;

		// iterate chars and break after max length

		for (let i = 0; i < text.length; i++) {
			if (i % len === 0) {
				len = 78;
				textArr.push(fold.join(''));
				fold = [];
			}
			fold.push(text[i]);
		}

		return textArr.join(' ');
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