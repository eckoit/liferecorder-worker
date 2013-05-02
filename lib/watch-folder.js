var EE = require('events').EventEmitter;
var watch = require('watch');
var fs = require('fs');
var path = require('path');

var watchFolder = module.exports = new EE();

var TRIGGER = '.liferecorder';


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
    me.timer = setInterval(check, 1000);
};



function isAvailable(folder, callback) {
    var f = path.join(folder, TRIGGER);
    fs.stat(folder, function(err, stats){
        if (err) return callback(false);
        return callback(true, f);
    });
}






