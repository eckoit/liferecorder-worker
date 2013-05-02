var watchFolder = require('../lib/watch-folder');
var fs = require('fs');

// describe('watching for liferecorder', function(){
//     it('should emit attached events', function(cb){

//         fs.mkdirSync('tests/liferecorder');

//         watchFolder.start('tests/liferecorder');
//         watchFolder.on('attached', function(file){
//             console.log(file);
//             cb();
//         });

//         setTimeout(function(){
//             fs.writeFileSync('tests/liferecorder/.liferecorder', 'TEST FILE');
//             setTimeout(function(){
//                 fs.unlinkSync('tests/liferecorder/.liferecorder');
//                 fs.rmdirSync('tests/liferecorder');
//             }, 1000);
//         }, 500);

//     });
// });

