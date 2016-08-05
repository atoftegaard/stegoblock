window.addEventListener('load', function(event) {

  var theList = document.getElementById('stegoblock-address-key-list');

  var addressesAndKeys = [  {address: "andreas@toftegaard.it", key: "we didn't know"},
           {address: "Emerald", key: "foo at the bar"},
           {address: "Blue Sapphire", key: "hush hush"},
           {address: "Diamond", key: "very down low"}  ];

  for (var i = 0; i < addressesAndKeys.length; i++) {
      var row = document.createElement('listitem');
      var cell = document.createElement('listcell');
      cell.setAttribute('label', addressesAndKeys[i].address);
      row.appendChild(cell);

      cell = document.createElement('listcell');
      cell.setAttribute('label',  addressesAndKeys[i].key );
      row.appendChild(cell);

      theList.appendChild(row);
  }

}, false);