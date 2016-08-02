window.addEventListener('load', function(event) { load(event); }, false);

function load() {

	let content = document.getElementById('stegoblock-content');
	let messagepane = document.getElementById('messagepane');
	
	messagepane.addEventListener('load', function(event) { onPageLoad(event); }, true);
}

function onPageLoad(event) {

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
}