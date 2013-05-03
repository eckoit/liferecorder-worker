var EE = require('events').EventEmitter;
var watch = require('watch');
var fs = require('fs');
var path = require('path');

var watchFolder = module.exports = new EE();

var TRIGGER = '.liferecorder';
var DEFAULT_CHECK_TIME = 3000;

watchFolder.start = function(folder) {
    var me = this;


    me.available = false;

    var check =function() {
        isAvailable(folder, function(available, f){
            if (available === me.available) return;
            me.available = available;

            if (me.available) {
                watchFolder.emit('attached', f);
            } else {
                 watchFolder.emit('detached');
            }

        });
    };
    me.timer = setInterval(check, DEFAULT_CHECK_TIME);
};



function isAvailable(folder, callback) {
    var f = path.join(folder, TRIGGER);
    fs.exists(f, function(exists) {
	if (!exists) return callback(false);

	console.log('exists');

        // double check!!!
        fs.readFile(f, function(err, data) {
            if (err) return callback(false);
            callback(true, f, data);
        });

    });
}






