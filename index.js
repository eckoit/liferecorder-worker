var watch = require('watch');
var probe = require('node-ffprobe');
var path = require('path');
var crypto = require('crypto');
var _ = require('underscore');
var request = require('request');



function upload(dir, couch_url, callback) {
    fs.readdir(dir, function(err, files) {
        if (err) callback(err);
        async.mapLimit(files, 2, processFile, function(err, results){

            var recordings = _.groupBy(results, function(recording){
                if(recording.getError()) return 'error';
                else return 'ok';
            });

            findMarks(recordings.ok, function(err, marks) {
                finish_upload({recordings: recordings, marks: marks});
            });
        });
    });
}


function findMarks(recordings, callback) {
    var marks = sansa.findMarks(recordings);
    callback(null, marks);
}


function processFile(file, callback) {
    probe(file, function(err, probeData) {
        probeData.name = path.basename(file);
        probeData.duration = probeData.format.duration;
        probeData.file = file;
        probeData.start_date = findAudioDate(probeData.name, file.lastModifiedDate);
        probeData.durationMS = function() {
            return this.start_date.valueOf() + (this.duration * 1000);
        };
        probeData.getEndMoment = function() {
            return this.start_date.add('s', this.duration);
        };
        callback(null, probeData);
    });
}

function finish_upload(details, callback) {
    async.eachLimit(details.recordings.ok, 2, upload_to_couch, callback);
}

function upload_to_couch(recording, callback) {
    var hash = new hash_file(recording.file, function(hash){

        var doc = {
            _id : hash,
            liferecorder: true,
            recording: {
                start: recording.start_date.valueOf(),
                length: recording.duration
            }
        };
        couchr.post(couch_url, doc, function(err, resp){
            updateProgress();
            if (err && err.error && err.error === 'conflict') {
                recording.already_loaded = true;
                return callback(null, recording);
            }
            if (err) return callback(err);

            post_attachment(recording, doc, resp.rev, callback);
        });

    });
}


function hash_file(file, callback) {
    var shasum = crypto.createHash('md5');
    var s = fs.ReadStream(file);

    s.on('data', function(d) {
      shasum.update(d);
    });

    s.on('end', function() {
      var d = shasum.digest('hex');
      callback(d);
    });
}





function post_attachment(recording, doc, rev, callback) {
    var address =[couch_url, doc._id, recording.name, '?rev=' + rev].join('/');

    fs.createReadStream(recording.file).pipe(request.put(address, callback));

}

function findAudioDate(str, modifiedDate) {
    str = str.replace('R_MIC_', '');
    str = str.replace('.mp3', '');
    return moment(str, "YYMMDD-HHmmss");
}