
var _ = require('underscore');

var splitMillisecondTollerance = 10;
var splitTime = 600;
var splitTimeTolerance = 1;

exports.findMarks = function(recordings) {
    var marks = [];

    recordings = sortRecordings(recordings);

    var lastRecording = null;
    for (var i = 0; i < (recordings.length - 1); i++) {
        var recording = recordings[i];
        var next = null;
        try {next = recordings[i + 1];} catch (ex) {}
        if (isAMark(lastRecording, recording, next, splitMillisecondTollerance)) {
            marks.push(recording.getEndMoment());
        }

        lastRecording = recording;
    }
    return marks;
};


function sortRecordings(recordings) {
    return _.sortBy(recordings, function(recording) {
        return recording.start_date;
    });
}


function isAMark(last, recording, next, tolerenceMilliseconds) {
    // if the file is less than split time,
    // and (
    //   if the previous recording is null orr
    //   the difference between the next recording end and this begginning is less than the tolerance
    // )
    // and this not the last one

    var checkDuration = splitTime - 1;
    if (checkDuration <= 0) checkDuration = 0;

    var duration = recording.durationMS();

    var lessThanSplitTime = false;
    if (duration < ((checkDuration) * 1000)) {
        lessThanSplitTime = true;
    }
    var lastRecordingNull = (last === null);
    var gapSmall = false;
    if (next !== null) {
        var nextStart   = next.start_date;
        var thisEnd = recording.getEndMoment();
        var diff = nextStart - thisEnd;
        if (diff <= tolerenceMilliseconds) gapSmall = true;
    }

    if (lessThanSplitTime && gapSmall) return true;
    return false;
}



