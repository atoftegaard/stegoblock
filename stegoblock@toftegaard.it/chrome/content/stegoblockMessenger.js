const sbCommon = window.StegoBlock();
var sb = {
	run: 0,
	map: {},

	elementMap: function(id) {
		
		if (this.map[id] === undefined)
			this.map[id] = document.getElementById(id);
		return this.map[id];
	},
	
	startup: function(event) {	
		
		// Register listener for messagepane load
		let messagepane = document.getElementById('messagepane');
		let that = this;
		messagepane.addEventListener('load', function(event) { that.onPageLoad(event); }, true);

		/*sbCommon.observeCharPreferences('messagepane', function(prefs){
			
		});*/
	},

	onPageLoad: function(event) {
		this.extractStegoBlockMessageHeader();
	},

	extractStegoBlockMessageHeader: function() {

		let content = document.getElementById('stegoblock-content');
		let contentBox = document.getElementById('stegoblock-content-box');
		let disabledBox = document.getElementById('stegoblock-disabled-box');
		let disabledLabel = document.getElementById('stegoblock-disabled-label');
		let enumerator = gFolderDisplay.selectedMessages;
		let prefs = sbCommon.getCharPref('addressesAndKeys');
		let addressRegEx = /<(.*)>/;
		contentBox.collapsed = true;
		disabledBox.collapsed = true;
		content.collapsed = false;
		contentBox.collapsed = true;
		content.value = '';
		
		for each (let msgHdr in fixIterator(enumerator, Ci.nsIMsgDBHdr)) {          
			
			MsgHdrToMimeMessage(msgHdr, null, function (aMsgHdr, aMimeMsg) {
				try {

					let sender = aMimeMsg.headers.from.toString().trim();

					// handle name <email> format

					if (sender.indexOf('<') > 0) {

						sender = addressRegEx.exec(sender)[1];
						window.sender = sender;
					}

					let key;
					for (let i = 0; i < prefs.length; i++)
						if (prefs[i].addr === sender)
							key = prefs[i].key;

					let ciphertext = aMimeMsg.get('X-Stegoblock');
					if(ciphertext.length === 0){
						contentBox.collapsed = true;
						return;
					}

					if (key === undefined) {
						contentBox.collapsed = false;
						disabledBox.collapsed = false;
						content.collapsed = true;
						disabledLabel.value = 'You have no shared StegoKey with ' + sender;
					}

					let plaintext = CryptoJS.AES.decrypt(ciphertext, key).toString(CryptoJS.enc.Utf8);

					contentBox.collapsed = false;
					content.value = plaintext;
				} catch (err) {
					//alert(err);
				}
			}, true, { examineEncryptedParts: true });
		}
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
		prefs.push({ addr: window.sender, key: key });

		sbCommon.setCharPref('addressesAndKeys', prefs);
		this.extractStegoBlockMessageHeader();
	}
};




//window.addEventListener('mail-startup-done', function (){ sb.startup(); }, false);
//window.addEventListener('messagepane-loaded', function (){ sb.startup(); }, false);
window.addEventListener('load', function (event) { sb.startup(event); }, false);