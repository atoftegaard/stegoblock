var StegoBlock = {
	prefs: null,
	keys: [],
	
	// Initialize the extension
	
	startup: function(event) {	
		
		// Register listener for messagepane load

		let messagepane = document.getElementById('messagepane');
		messagepane.addEventListener('load', function(event) { this.onPageLoad(event); }, true);

		// Register to receive notifications of preference changes
		
		this.prefs = Components.classes['@mozilla.org/preferences-service;1']
				.getService(Components.interfaces.nsIPrefService)
				.getBranch('stegoblock.');
		this.prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
		this.prefs.addObserver('', this, false);
		
		this.keys = this.prefs.getCharPref('symbol');
	},

	onPageLoad: function(event) {

		let content = document.getElementById('stegoblock-content');
		let enumerator = gFolderDisplay.selectedMessages;

		for each (let msgHdr in fixIterator(enumerator, Ci.nsIMsgDBHdr)) {

			MsgHdrToMimeMessage(msgHdr, null, function (aMsgHdr, aMimeMsg) {
				try {
					let ciphertext = aMimeMsg.get('X-Stegoblock');
					let plaintext = CryptoJS.AES.decrypt(ciphertext, 'Secret').toString(CryptoJS.enc.Utf8);

					content.value = plaintext;
				} catch (err) {
					//alert(err);
				}
			}, true, { examineEncryptedParts: true });
		}
	},
	
	shutdown: function() {

		this.prefs.removeObserver('', this);
	},
	
	observe: function(subject, topic, data) {

		if (topic != 'nsPref:changed')
			return;

		//alert('Pref changed: ' + data);
	}
}

window.addEventListener('load', function(event) { StegoBlock.startup(event); }, false);
window.addEventListener('unload', function(event) { StegoBlock.shutdown(event); }, false);