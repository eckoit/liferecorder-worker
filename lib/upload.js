var path = require('path');
var crypto = require('crypto');
var fs = require('fs');

var watch = require('watch');
var async = require('async');
var probe = require('node-ffprobe');
var _ = require('underscore');
var request = require('request');
var moment = require('moment');
var couchr = require('couchr');

var sansa = require('./sansa_clip_recorder');

module.exports = upload;


function upload(dir, couch_url, /* optional */ deleteSuccess, callback) {


    if (_.isFunction(deleteSuccess)) {
        callback = deleteSuccess;
        deleteSuccess = false;
    }

    fs.readdir(dir, function(err, files) {
        if (err) return callback(err);

	if (!files || !files.length) return callback(null);

        var files2 = _.map(files, function(file){
            return path.join(dir, file);
        });


        async.mapLimit(files2, 2, processFile, function(err, results){

            var recordings = _.groupBy(results, function(recording){
                if(recording.getError()) return 'error';
                else return 'ok';
            });

            findMarks(recordings.ok, function(err, marks) {
                finish_upload(couch_url, {recordings: recordings, marks: marks}, function(err2, upload_errors){
                    // warm views
                    warm_view(couch_url, function(err,resp){  console.log('warm view')  });

                    if (deleteSuccess) deleteFiles(recordings, upload_errors, callback);
                    else callback();
                });
            });
        });
    });
}

function finish_upload(couch_url, details, callback) {
    async.parallel([
        function(cb) { upload_audio(couch_url, details, cb); },
        function(cb) { upload_marks(couch_url, details, cb) ; }

    ], callback);

}


function upload_audio(couch_url, details, callback) {
    var upload_errors = [];

    async.eachLimit(details.recordings.ok, 2, function(recording, cb) {
        var hash = new hash_file(recording.file, function(hash){
            var doc = {
                _id : hash,
                liferecorder: true,
                recording: {
                    start: recording.start_date.valueOf(),
                    length: recording.duration
                }
            };
            console.log('post', doc._id);
            couchr.post(couch_url, doc, function(err, resp){
                if (err && err.error && err.error === 'conflict') {
                    console.log('already exists');
                    recording.already_loaded = true;
                    return cb(null, recording);
                }
                if (err) return cb(err);

                post_attachment(couch_url, recording, doc, resp.rev, cb);
            });
        });
    }, function(err){
        callback(err, upload_errors);
    });
}

function upload_marks(couch_url, details, callback) {
    var batch = {
        docs: convert(details.marks)
    };
    console.log(batch);
    couchr.post(couch_url + '/_bulk_docs', batch, function(err, resp){
        console.log(err, resp);
        callback(err);
    });
}

function convert(marks) {
    return _.map(marks, function(mark){
        return {
            type: 'memoir.tag',
            timestamp: mark.valueOf(),
            length: 30000
        };
    })
}

function warm_view(couch_url, callback) {
    var endpoint = couch_url + '/_design/memoir/_rewrite/_ddoc/_view/audio_by_time',
        q = {
            limit: 1,
            stale: 'update_after'
        }
    couchr.get(endpoint, q, callback);
}

function findMarks(recordings, callback) {
    var marks = sansa.findMarks(recordings);
    callback(null, marks);
}


function processFile(file, callback) {
    console.log('process file', file);
    probe(file, function(err, probeData) {

        if (err) {
            probeData = {
                error: er
            };
        }

        probeData.name = path.basename(file);
        probeData.duration = probeData.format.duration;
        probeData.file = file;
        probeData.start_date = findAudioDate(probeData.name, file.lastModifiedDate);
        probeData.durationMS = function() {
            return (this.duration * 1000);
        };
        probeData.getEndMoment = function() {
            return this.start_date.add('s', this.duration);
        };

        probeData.getError = function() {
            if (probeData.error) return probeData.error;
            return false;
        };
        callback(null, probeData);
    });
}

function deleteFiles(recordings, upload_errors, callback) {
    //move errors into error folder

    //remove rest
    async.eachLimit(recordings.ok, 2, function(recording, cb){
        console.log('removing file', recording.file);
        fs.unlink(recording.file, function(err){
            if (err) console.log(err);
            cb();
        });
    }, callback);

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





function post_attachment(couch_url, recording, doc, rev, callback) {
    var address =[couch_url, doc._id, recording.name, '?rev=' + rev].join('/');
    console.log('adding attachment', address);
    fs.createReadStream(recording.file).pipe(request.put(address, callback));

}

function findAudioDate(str, modifiedDate) {
    str = str.replace('R_MIC_', '');
    str = str.replace('.mp3', '');
    return moment(str, "YYMMDD-HHmmss");
}
