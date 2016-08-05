var sbCommon = window.StegoBlock();
window.sb = {
	ui: {
		NotifyComposeFieldsReady: function() {			
			sbCommon.observeCharPreferences('compose', function(prefs){
				alert(prefs);
			});

			this.observeRecipientsByPolling();
		},

		observeRecipientsByPolling: function() {

			//TODO: divide and conquer. element map
			let addressingWidget = document.getElementById('addressingWidget');

			var that = this;
			setInterval(function() {

				let dateRE = /addressCol2/;
				let addrRE = /<(.*)>/;
				let addresses = [];
				let els = document.getElementsByTagName('*');

				for each (let el in els)
					if (dateRE.test(el.id)){
						var val = document.getElementById(el.id).value.trim();
						if(val.length > 0)
							addresses.push(val);
					}
				
				if (addresses.length > 1)
					that.disable('toomany');
				else if(addresses[0] !== undefined){

					let p = sbCommon.getCharPref('addressesAndKeys');
					let recipient = addresses[0];

					// handle name <email> format

					if(recipient.indexOf('<') > 0)
						recipient = addrRE.exec(recipient)[1]

					// check if key is known for recipient

					var found = false;
					for(let i = 0; i < p.length; i++)
						if(p[i].addr && (p[i].addr == recipient))
							found = true;

					if(found)
						that.enable();
					else
						that.disable('nokey', recipient);
				}
				else
					that.enable();

			}, 500);
		},

		disable: function (reason, extra) {
			// runs every 500ms, fix.

			let label = document.getElementById('stegoblock-disabled-label');
			let box = document.getElementById('stegoblock-disabled-box');
			let textbox = document.getElementById('stegoblock-textbox');
			let addbox = document.getElementById('stegoblock-add-key-box');

			let reasonText;
			switch(reason) {
				case 'toomany': {
					reasonText = 'Stego Block only supports one recipient';
					addbox.collapsed = true;
					break;
				}
				case 'nokey': {
					window.recipient = extra; // NOT HERE!!!
					//document.getElementById('stegoblock-add-key').value = '';
					reasonText = 'No key found for ' + extra;
					addbox.collapsed = false;
					this.validateKey();
					break;
				}
			}

			label.value = reasonText;
			box.collapsed = false;
			textbox.collapsed = true;
		},

		enable: function () {

			let box = document.getElementById('stegoblock-disabled-box');
			let textbox = document.getElementById('stegoblock-textbox');

			box.collapsed = true;
			textbox.collapsed = false;
		},

		validateKey: function () {

			let value = document.getElementById('stegoblock-add-key').value;
			let button = document.getElementById('stegoblock-add-button');
			
			if(value === undefined || value.length < 8) {
				button.disabled = true;
				return;
			}

			button.disabled = false;
		},

		addKey: function () {

			let textbox = document.getElementById('stegoblock-add-key');
			var key = textbox.value;

			let prefs = Components.classes['@mozilla.org/preferences-service;1']
						.getService(Components.interfaces.nsIPrefService)
						.getBranch('stegoblock.');
			
			let p = JSON.parse(prefs.getCharPref('addressesAndKeys'));
			p.push({ addr: window.recipient, key: key });

			prefs.setCharPref('addressesAndKeys', JSON.stringify(p));
		}
	},

	composeSendMessageHandler: function (event) {

		let plaintext = document.getElementById('stegoblock-textbox').value;
		let ciphertext = CryptoJS.AES.encrypt(plaintext, 'Secret').toString();
		//let foldedCiphertext = this.fold(ciphertext);

		gMsgCompose.compFields.setHeader('X-Stegoblock', ciphertext);
	},

	fold: function (text) {

		let textArr = [];
		let fold = [];
		let len = 66;

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
		for(let i = 0; i < string.length; i++)
			arr.push(string.charCodeAt(i));

		return arr.join('');
	}
};

window.addEventListener('compose-send-message', window.sb.composeSendMessageHandler, true);
window.addEventListener('compose-window-init', function(){ gMsgCompose.RegisterStateListener(window.sb.ui); }, true);