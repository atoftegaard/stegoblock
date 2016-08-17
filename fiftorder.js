var fs = require('fs');
var util = require('util');
var stream = require('stream');
var es = require('event-stream');
var json = require('JSON2');

var prev = null;
var wordList = {};
var testStegoBlock = [];
var wordlistPath = './wordlist.lst';

function embedWords(block, list) {

    var orgblock = block.join('');

    //init
    block = list[getRandomInRange(0,Math.floor(list.length/10))].split('').concat(block);

    embedWordsRecursively(list, toObject(list), block, 0, []);

    var newblock = block.join('');
    console.log('\r\noriginal block  : ' + orgblock);
    console.log('obfuscated block: ' + newblock);

    sanityCheck(newblock, list);
    console.log('done');
}

function sanityCheck(blockString, list) {

    var dict = toObject(list);
    for (var i = 0; i < blockString.length; i++) {

        var string = blockString.substring(i, i + 5);
        
        if (!dict[string] && string.length === 5)
            console.log('"' + string + '" of length ' + string.length + ' is not in wordlist');
    }
}

function toObject(arr) {

    var rv = {};
    for (var i = 0; i < arr.length; ++i)
        rv[arr[i]] = true;
    return rv;
}

function embedWordsRecursively(list, dict, block, index) {

    //console.log('Block           : ' + block.join(''));
    if (index === block.length)
        return true;
    
    var pattern = block.slice(index - 4, index).join('');
    var possibleLetters = [];

    if (block[index] !== undefined && block[index] !== '*' && dict[block.slice(index - 4, index)])
        possibleLetters.push(block[index]);

    if (possibleLetters.length === 0)
        for (var l = 0; l < list.length; l++)
            if (list[l].indexOf(pattern) === 0 && list[l][4] !== undefined)
                possibleLetters.push(list[l][4]);

    var shuf = possibleLetters.splice(0, Math.ceil(possibleLetters.length / 3));
    shuffle(shuf);
    possibleLetters = shuf.concat(possibleLetters);

    if (possibleLetters.length === 0)
        return false;
        //console.log('Dang! No word found for pattern "' + pattern + '" og length: ' + pattern.length + '. i is: ' + index + ' block length is: ' + block.length + '\r\n' + block.join(''));

    while (possibleLetters.length > 0){

        var mem = block[index];
        block[index] = possibleLetters.shift();
        if (embedWordsRecursively(list, dict, block, index + 1))
            return true;
        block[index] = mem;
    }

    return false;
}

function initTestBlock(block, blockLength, str) {

    var strArr = str.split('');
    for (var i = 0; i < blockLength; i++) {

        var insertIndex = getRandomInRange(0, blockLength) % (block.length + 1);
		block.splice(insertIndex, 0, getChar(strArr));
    }
}

function shuffle(a) {

    var n = a.length;
    for (var i = n - 1; i > 0; i--) {

        var j = Math.floor(Math.random() * (i + 1));
        var tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
    }
    return a;
}

function contains(array, val) {

    for (var i = 0; i < array.length; i++)
        if (array[i] === val)
            return true;
    return false;
}

function getRandomInRange(min, max) {
				
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getChar(strArr) {

    if (strArr.length > 0)
        return strArr.shift();
    return '*';
}

function matchRule(str, rule) {

    return new RegExp('^' + rule.split('*').join('.') + '$').test(str);
}

function getList() {

    var list = [];
    var s = fs.createReadStream(wordlistPath)
        .pipe(es.split())
        .pipe(es.mapSync(function(line) {

            // pause the readstream
            s.pause();

            list.push(line);

            // resume the readstream, possibly from a callback
            s.resume();
        })
        .on('error', function(err) {
            
            console.log('Error while reading file. ' + err);
        })
        .on('end', function() {

            embedWords(testStegoBlock, list);
        })
    );   
}

function processFiles(arrPaths) {

    fs.stat(wordlistPath, function(err, stat) {

        if(err == null) {
            
            console.log('Book already processed, using wordlist.');
            getList()
            return;

        } else if(err.code == 'ENOENT') {

            var p = arrPaths.shift();
            fs.readFile(p, 'utf8', function (err, data) {
                if (err)
                    throw err;
                
                data = data.replace(new RegExp('"|;|:|\'|“|„','g'), '');

                for (var i = 0; i < data.length; i++) {

                    var string = data.substring(i, i + 5);
                    
                    if (wordList[string] === undefined)
                        wordList[string] = 0;
                    wordList[string]++;
                }

                console.log('Read entire file: ' + p);
                    
                if (arrPaths.length > 0)
                    processFiles(arrPaths);
                else {

                    console.log('Read all files. Now sorting wordlist.');
                    var words = Object.keys(wordList);
                    words.sort(function(a,b) {
                    
                        return (wordList[a] > wordList[b]) ? -1 : ((wordList[b] > wordList[a]) ? 1 : 0);
                    });

                    console.log('Wordlist sorted.');

                    fs.writeFile('wordlist.lst', words.join('\r\n'), function(err) {
                        
                        if(err)
                            return console.log(err);
                        console.log('The file was saved.');

                        getList();
                    });
                }
            });

        } else {
            console.log('Some other error: ', err.code);
        }
    });
}

initTestBlock(testStegoBlock, 500, 'Steganografi er det nye sort');
processFiles(['./spam.txt']);
//processFiles(['./bibelen.txt']);