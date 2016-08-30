var StegoBlock = function(){

	// gets the StegoBlock extension preferences.
	var initPreferences = function(obj) {
		
		if (obj.prefs)
			return;

		obj.prefs = Components.classes['@mozilla.org/preferences-service;1']
			.getService(Components.interfaces.nsIPrefService)
			.getBranch('stegoblock.');
	};

	return {

		// shortcut for the extensions preferences
		prefs: null,

		// stores callbacks for the preference observer
		observeCallbacks: {},

		// convenience utilities, nice to have
		utils: {

			// native JS implementation for extending objects. somewhat similar to jQuery.extend()
			extend: function extend() {

				if (typeof(arguments[0]) === undefiend)
					arguments[0] = {};

				for (let i = 1; i < arguments.length; i++)
					for (let key in arguments[i])
						if (arguments[i].hasOwnProperty(key))
							arguments[0][key] = arguments[i][key];

				return arguments[0];
			}
		},

		// register a callback that gets fired when preferences change
		observeCharPreferences: function(id, callback) {

			if (this.prefs === null){
				let that = this;
				let observingObject = {

					observe: function(subject, topic, data) {

						if (topic != 'nsPref:changed')
							return;
						
						for (let callbackId in that.observeCallbacks)
							that.observeCallbacks[callbackId](JSON.parse(that.prefs.getCharPref(data)));
					} 
				};

				initPreferences(this);

				this.prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
				this.prefs.addObserver('', observingObject, false);
			}

			if (this.observeCallbacks[id] === undefined)
				this.observeCallbacks[id] = callback;
		},

		// get specific char preference as an object
		getCharPref: function(key) {
			
			initPreferences(this);

			return JSON.parse(this.prefs.getCharPref(key));
		},

		// set specific char preference with an object. object gets stored serialied.
		setCharPref: function(key, value) {
			
			initPreferences(this);

			this.prefs.setCharPref(key, JSON.stringify(value));
		},

		// unregister a previously registered callback for preference change
		forget: function(id) {

			delete this.observeCallbacks[id];
		}
	};
};

// extend the global variable with common functionality, for easy access
StegoBlock.utils.extend(window.StegoBlock, StegoBlock());