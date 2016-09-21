const sbCommon = window.SBCommon();
const sbStego = window.SBStego();

var sb = {

	ui: {
		
		// service for prompting users
		promptservice: Components.classes['@mozilla.org/embedcomp/prompt-service;1'].getService(Components.interfaces.nsIPromptService),

		// maximum StegoBlock message length
		maxMessageLength: sbStego.maxPlaintextLength,

		// regexp for extracting textboxes with email recipient addresses
		addressNodeRegEx: /addressCol2/,

		// regexp for extracting email from "name <email>" format
		addressRegEx: /<(.*)>/,

		// storage for key of recipient
		key: null,

		// storage for recipient of the message
		recipient: null,

		// gets an element by id, from the map or DOM, if not already in the map
		elementMap: function (id) {
					
			if (this.map === undefined)
				this.map = {};
			
			if (this.map[id] === undefined)
				this.map[id] = document.getElementById(id);

			return this.map[id];
		},

		// fired when compose window is ready
		NotifyComposeFieldsReady: function () {		

			let label = this.elementMap('stegoblock-message-length');
			document.getElementById('stegoblock-textbox').value = '';
			label.value = this.maxMessageLength + ' chars left';

			this.elementMap('stegoblock-textbox').addEventListener('keydown', this.validateLength, true);

			this.observeRecipientsByPolling();
		},

		// observes the recipients of an email by polling.
		observeRecipientsByPolling: function () {

			let _this = this;
			setInterval(function () {

				let els = document.getElementsByTagName('*'); // get fresh collection each iteration
				let addresses = _this.getRecipients(els);

				if (addresses.length > 1)
					_this.disable('toomany');
				else if (addresses[0] !== undefined)
					_this.validateRecipientAndKey(addresses[0]);
				else
					_this.enable(null); // in case of no recipient, just show the textarea

			}, 500);
		},

		// extracts recipients (email addresses) from a collection of DOM nodes
		getRecipients: function (elementsCollection) {

			let addresses = [];
			for (let element in elementsCollection) {

				if (this.addressNodeRegEx.test(elementsCollection[element].id)) {

					let val = document.getElementById(elementsCollection[element].id).value.trim();
					if (val.length > 0)
						addresses.push(val);
				}
			}
			return addresses;
		},

		// validates of there is a key for a single recipient.
		// maintains UI accordingly, by disabling or enabling textarea.
		validateRecipientAndKey: function (recipient) {

			let prefs = sbCommon.getCharPref('addressesAndKeys');

			// handle "name <email>"" format
			if (recipient.indexOf('<') > 0)
				recipient = this.addressRegEx.exec(recipient)[1];

			// check if key is known for recipient
			let foundKey = false;
			for (let i = 0; i < prefs.length; i++) {
				if (prefs[i].addr && (prefs[i].addr === recipient))
					foundKey = prefs[i].key;
			}

			if (foundKey)
				this.enable(foundKey);
			else
				this.disable('nokey', recipient);
		},

		// disables the StegoBlock textarea for a specified reason.
		disable: function (reason, extra) {

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

					this.recipient = extra;
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

		// enables a previously disabled StegoBlock textarea
		enable: function (key) {

			let box = this.elementMap('stegoblock-disabled-box');
			let textbox = this.elementMap('stegoblock-textbox');

			this.key = key;
			box.collapsed = true;
			textbox.collapsed = false;
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

		// fired on keydown of the StegoBlock textarea. ensures message length does
		// not exceed maxMessageLength.
		validateLength: function (event) {

			let textboxValue = sb.ui.elementMap('stegoblock-textbox').value;
			let remaining = sb.ui.maxMessageLength - textboxValue.length;
			let keyCode = event.keyCode;

			if (remaining <= 0 && event.keyCode !== 8 && event.keyCode !== 46) {

				event.preventDefault();
				return false;
			}
			return true;
		},

		// maintains a counter for remaining characters in the StegoBlock textarea
		setRemainingCharCount: function (event) {

			let label = this.elementMap('stegoblock-message-length');
			let textbox = this.elementMap('stegoblock-textbox');

			if (textbox.value.length > this.maxMessageLength) // prevents pasting of long texts
				textbox.value = textbox.value.substring(0, this.maxMessageLength);

			let remaining = this.maxMessageLength - textbox.value.length;
			label.value = (remaining === 1 ? (remaining + ' char left') : (remaining + ' chars left'));
		},

		// adds a new (valid) StegoKey to the preferences
		addKey: function () {

			let textbox = this.elementMap('stegoblock-add-key');
			let key = textbox.value;
			let prefs = sbCommon.getCharPref('addressesAndKeys');

			prefs.push({ addr: this.recipient, key: key });
			sbCommon.setCharPref('addressesAndKeys', prefs);
			textbox.value = '';
		}
	},

	// fired after user clicks Send. injects the StegoBlock message in the email header
	injectStegoBlockInMessageHeader: function (event) {

		try {

			let plaintext = document.getElementById('stegoblock-textbox').value;
			let date = (new Date()).toString();
		
			// hide!
			let block = sbStego.encode(plaintext, date, sb.ui.key || sb.randomString(128));

			// fold headers, as lines cannot exceed 78 chars
			block = sb.fold(block);
			gMsgCompose.compFields.setHeader('X-StegoBlock', block);
			gMsgCompose.compFields.setHeader('X-SBDate', date);

			return true;

		} catch (e) {

			// it is crucial to cancel all emails without a StegoBlock, to preserve plausible deniability.
			this.promptservice.alert(window, 'Fatal error', 'An unrecoverable error occured during StegoBlock generation. ' +
				'To preserve "Plausible deniability", it is crucial that all outgoing emails contain a StegoBlock. Your email ' +
				'has been cancelled.');
			
			// prevent from bubbling, cancelling sending.
			event.preventDefault();
			return false;
		}
	},

	// right pads a text with random generated text
	padRemaining: function (text) {

		text = text.substring(0, this.ui.maxMessageLength);
		text += '//';

		// no need to escape, this is the last occurence of "//".
		// cannot be generated by the random text right padding

		let random = this.randomString(this.ui.maxMessageLength + 2);
		return this.pad(text, random);
	},

	// right padding function
	pad: function (text, pad) {

		if (typeof text === 'undefined') 
			return pad;

		return (text + pad).substring(0, pad.length);
	},

	// generates random string of given length. only alpha numeric chars
	randomString: function (length) {

		let text = '';
		let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		
		for (let i = 0; i < length; i++)
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		
		return text;
	},

	// adds spaces in a string by an interval. used for folding header
	fold: function (str) {

		let ret = [];
		let len;
		let n = 63;

		for (let i = 0, len = str.length; i < len; i += n) {

			if (i === n)
				n += 13;
			ret.push(str.substr(i, n));
		}

		return ret.join(' ');
	}
};

window.addEventListener('compose-send-message', sb.injectStegoBlockInMessageHeader, true);
window.addEventListener('compose-window-init', function () {

	gMsgCompose.RegisterStateListener(sb.ui);
}, true);