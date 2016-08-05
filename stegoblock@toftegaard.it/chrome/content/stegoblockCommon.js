var StegoBlock = function(){

	var initPreferences = function(obj) {
		
		if(obj.prefs)
			return;

		obj.prefs = Components.classes['@mozilla.org/preferences-service;1']
			.getService(Components.interfaces.nsIPrefService)
			.getBranch('stegoblock.');
	};

	return {

		prefs: null,
		observeCallbacks: {},

		utils: {

			// native JS implementation for extending objects. somewhat similar to jQuery.extend()
			extend: function extend() {

				if(typeof(arguments[0]) === undefiend)
					arguments[0] = {};

				for(var i = 1; i < arguments.length; i++)
					for(var key in arguments[i])
						if(arguments[i].hasOwnProperty(key))
							arguments[0][key] = arguments[i][key];
				return arguments[0];
			}
		},

		observeCharPreferences: function(id, callback) {

			if(this.prefs === null){
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

			if(this.observeCallbacks[id] === undefined)
				this.observeCallbacks[id] = callback;
		},

		getCharPref: function(key) {
			
			initPreferences(this);

			return JSON.parse(this.prefs.getCharPref(key));
		},

		setCharPref: function(key, value) {
			
			initPreferences(this);

			this.prefs.setCharPref(key, JSON.stringify(value));
		},

		forget: function(id) {
			delete this.observeCallbacks[id];
		}
	};
};

StegoBlock.utils.extend(window.StegoBlock, StegoBlock());