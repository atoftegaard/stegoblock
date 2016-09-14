const sbCommon = window.SBCommon();
const sbStego = window.SBStego();

var sb = {

	// stores references to elements, for fast access
	map: {},

	// storage for the sender of a selected email
	sender: null,

	// gets an element by id, from the map or DOM, if not already in the map
	elementMap: function (id) {
		
		if (this.map[id] === undefined)
			this.map[id] = document.getElementById(id);

		return this.map[id];
	},
	
	// add listener messagepane loading
	startup: function (event) {	
		
		let messagepane = this.elementMap('messagepane');
		let that = this;
		
		messagepane.addEventListener('load', function (event) {

			that.onPageLoad(event);
		}, true);
	},

	// fired when messagepane is ready
	onPageLoad: function (event) {

		this.handleMessageSelection();
	},

	// when a message is selected, headers are checked for a StegoBlock.
	// if one is present, it will be tried shown to the user.
	handleMessageSelection: function () {

		let enumerator = gFolderDisplay.selectedMessages;
		let that = this;

		// iterate over all selected emails
		for (let msgHdr in fixIterator(enumerator, Ci.nsIMsgDBHdr)) {          
			
			// extract all headers as MIME messages
			MsgHdrToMimeMessage(msgHdr, null, function (aMsgHdr, aMimeMsg) {

				try {

					// trial and error. first from then to - ensures that StegoBlocks in
					// sent mails can be read. not very elegant, but apparently there is
					// no way to distinguish if a mail is in a "sent" folder.
					if (!that.extractStegoHeader(aMimeMsg.headers.from.toString().trim(), aMimeMsg))
						that.extractStegoHeader(aMimeMsg.headers.to.toString().trim(), aMimeMsg);

				} catch (err) {

				}
			}, true, { examineEncryptedParts: true });
		}
	},

	extractStegoHeader: function (sender, aMimeMsg) {

		let cont = this.elementMap('stegoblock-content');
		let contentBox = this.elementMap('stegoblock-content-box');
		let disabledBox = this.elementMap('stegoblock-disabled-box');
		let disabledLabel = this.elementMap('stegoblock-disabled-label');
		let prefs = sbCommon.getCharPref('addressesAndKeys');
		let addressRegEx = /<(.*)>/;

		contentBox.collapsed = true;
		disabledBox.collapsed = true;
		cont.collapsed = false;
		contentBox.collapsed = true;
		cont.childNodes[0].nodeValue = ''; // hacky way to set value of a description node

		// handle "name <email>" format
		if (sender.indexOf('<') > 0) {

			sender = addressRegEx.exec(sender)[1];
			this.sender = sender;
		}

		// find matching StegoKey for sender
		let key;
		for (let i = 0; i < prefs.length; i++) {
			if (prefs[i].addr === sender)
				key = prefs[i].key;
		}
		
		// extract header
		let ciphertext = aMimeMsg.get('X-StegoBlock').toString();
		let date = aMimeMsg.get('X-SBDate').toString();

		ciphertext = ciphertext.replace(new RegExp('\\s+|\r|\n', 'g'), '');

		// do not show any StegoBlock UI if email does not contain a StegoBlock
		if (ciphertext.length === 0) {

			contentBox.collapsed = true;
			return false;
		}

		// there is a StegoBlock, but no matching StegoKey. show UI for adding one.
		if (key === undefined) {

			contentBox.collapsed = false;
			disabledBox.collapsed = false;
			cont.collapsed = true;
			disabledLabel.value = 'You have no shared StegoKey with ' + sender;
			return false;
		}

		// show the StegoBlock
		var plaintext;
		try {

			plaintext = sbStego.decode(ciphertext, date, key);
		} catch (e) {

			contentBox.collapsed = false;
			cont.childNodes[0].nodeValue = e;
		}

		// strip away any random right padding (if message is less than maxMessageLength)
		//plaintext = plaintext.substring(0, plaintext.lastIndexOf('//'));

		contentBox.collapsed = false;
		cont.childNodes[0].nodeValue = plaintext;

		return true;
	},
	
	// fired on keyup when trying to add a new StegoKey
	// validates if the key meets basic requirements, like length
	validateKey: function () {

		let value = this.elementMap('stegoblock-add-key').value;
		let button = this.elementMap('stegoblock-add-button');

		if (value === undefined || value.length < 8) {

			button.disabled = true;
			return;
		}

		button.disabled = false;
	},

	// adds a new (valid) StegoKey to the preferences
	addKey: function () {

		let textbox = this.elementMap('stegoblock-add-key');
		let key = textbox.value;

		let prefs = sbCommon.getCharPref('addressesAndKeys');
		prefs.push({ addr: this.sender, key: key });

		sbCommon.setCharPref('addressesAndKeys', prefs);
		this.handleMessageSelection();

		textbox.value = '';
	}
};

window.addEventListener('load', function (event) {

	sb.startup(event);
}, false);