const sbCommon = window.SBCommon();
var sb = {

	// the selected StegoKeys
	selectedPrefIndexes: [],

	// service for prompting users
	promptservice: Components.classes['@mozilla.org/embedcomp/prompt-service;1'].getService(Components.interfaces.nsIPromptService),

	// initializes a list with all stored StegoKeys.
	// keys are not stored encrypted, it is considered unnecessary
	init: function() {

		let list = document.getElementById('stegoblock-address-key-list');
		let purgebutton = document.getElementById('stegoblock-purge');
		let prefs = sbCommon.getCharPref('addressesAndKeys');

		// remove any previously added list items in the list
		for (let i = list.getRowCount() -1; i >= 0; i--)
			list.removeItemAt(i);

		// add list items with each StegoKey
		for (let i = 0; i < prefs.length; i++) {

			let row = document.createElement('listitem');
			let cell = document.createElement('listcell');
			row.setAttribute('value', i);
			cell.setAttribute('label', prefs[i].addr);
			row.appendChild(cell);

			cell = document.createElement('listcell');
			cell.setAttribute('label',  prefs[i].key );
			row.appendChild(cell);

			list.appendChild(row);
		}

		purgebutton.disabled = prefs.length === 0;
	},

	// fired when one or more items are selected in the list.
	// maintains an array of selected StegoKeys
	onlistselect: function(items) {

		this.selectedPrefIndexes = [];
		for (let item in items) {
			
			try {
				
				this.selectedPrefIndexes.push(parseInt(items[item].getAttribute('value')));
			} catch(e) {

			}
		}

		let button = document.getElementById('stegoblock-delete-key');
		if (this.selectedPrefIndexes.length > 0)
			button.disabled = false;
		else
			button.disabled = true;
	},

	// fired when Delete button is clicked. deletes the selected
	// StegoKeys if user confirms.
	onDelete: function() {

		var text = this.selectedPrefIndexes.length > 1 ? 'Are you sure you want to delete these StegoKeys? This action cannot be undone.' : 'Are you sure you want to delete this StegoKey? This action cannot be undone.';
		if (this.promptservice.confirm(window, 'Confirm deletion', text)) {
			
			let prefs = sbCommon.getCharPref('addressesAndKeys');
			for (let i = 0; i < this.selectedPrefIndexes.length; i++)
				prefs.splice(this.selectedPrefIndexes[i], 1);

			sbCommon.setCharPref('addressesAndKeys', prefs);
			this.init();
		}
	},

	// fired when Purge button is clicked. deletes all stored StegoKeys.
	onPurge: function() {

		if (this.promptservice.confirm(window, 'Confirm purge', 'Are you sure you want to delete all stored StegoKeys? This action cannot be undone.')) {
			
			sbCommon.setCharPref('addressesAndKeys', []);
			this.init();
		}
	}
};

window.addEventListener('load', function() { sb.init(); }, false);
