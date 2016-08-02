window.addEventListener('compose-send-message', composeSendMessageHandler, true);

function composeSendMessageHandler(event) {

	let plaintext = document.getElementById('stegoblock-textbox').value;
	let ciphertext = CryptoJS.AES.encrypt(plaintext, 'Secret').toString();
	//let foldedCiphertext = fold(ciphertext);

	gMsgCompose.compFields.setHeader('X-Stegoblock', ciphertext);
}

function fold(text) {

	let textArr = [];
	let fold = [];
	let len = 66;

	for (let i = 0; i < text.length; i++) {
		if (i % len === 0){
			len = 78;
			textArr.push(fold.join(''));
			fold = [];
		}
		fold.push(text[i]);
	}

	return textArr.join(' ');
}

function ascii(string) {

	let arr = [];
	for(let i = 0; i < string.length; i++)
		arr.push(string.charCodeAt(i));

	return arr.join('');
}