const sbCommon = window.StegoBlock();
window.sb = {

	selectedPrefIndexes: [],

	init: function() {

		let list = document.getElementById('stegoblock-address-key-list');
		let prefs = sbCommon.getCharPref('addressesAndKeys');

		for (let i = list.getRowCount() -1; i >= 0; i--)
			list.removeItemAt(i);

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
	},

	onlistselect: function(items) {

		this.selectedPrefIndexes = [];
		for each (let item in items) {
			
			try {
				this.selectedPrefIndexes.push(parseInt(item.getAttribute('value')));
			} catch(e) {

			}
		}

		let button = document.getElementById('stegoblock-delete-key');
		if (this.selectedPrefIndexes.length > 0)
			button.disabled = false;
		else
			button.disabled = true;
	},

	onDelete: function(){

		let prefs = sbCommon.getCharPref('addressesAndKeys');
		for (let i = 0; i < this.selectedPrefIndexes.length; i++)
			prefs.splice(this.selectedPrefIndexes[i], 1);

		sbCommon.setCharPref('addressesAndKeys', prefs);
		this.init();
	}
};

window.addEventListener('load', function() { window.sb.init(); }, false);
