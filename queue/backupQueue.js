const Queue = require('bull');
const multer = require('multer');
const fs = require('fs-extra');
const archiver = require('archiver');
const extract = require('extract-zip');
const rimraf = require('rimraf');
const chmodr = require('chmodr');
const competitiondb = require('../models/competition');
const lineMapDb = require('../models/lineMap');
const lineRunDb = require('../models/lineRun');
const mazeMapDb = require('../models/mazeMap');
const mazeRunDb = require('../models/mazeRun');
const documentDb = require('../models/document');
const mailDb = require('../models/mail');
const reservationDb = require('../models/reservation');
const surveyDb = require('../models/survey');

const backupQueue = new Queue('backup', {
  redis: {port: process.env.REDIS_PORT, host: process.env.REDIS_HOST},
  limiter: {
    max: 1,
    duration: 10000
  }
});

backupQueue.process('backup', function(job, done){
  
  const {competitionId} = job.data;
  const folderName = Math.floor( new Date().getTime() / 1000 );
  const folderPath = `${__dirname}/../backup/${competitionId}/${folderName}`;
  fs.mkdirsSync(folderPath);

  jobProgress = 0;
  const maxCount = 16;
  let outputCount = 0;
  let compName = '';

  fs.writeFile(`${folderPath}/version.json`,JSON.stringify({ version: 21.4 }), (err) => {
    if(err){
      done(new Error(err));
    }else{
      outputCount ++;
      jobProgress += 100/(maxCount+1);
      job.progress(jobProgress);
      if(outputCount == maxCount){
        makeZip(job, done, folderPath);
      }
    }
  });

  // Copy Document Folder
  fs.copy(`${__dirname}/../documents/${competitionId}`, `${folderPath}/documents`, (err) => {
    if(err){
      done(new Error(err));
    }else{
      outputCount ++;
      jobProgress += 100/(maxCount+1);
      job.progress(jobProgress);
      if(outputCount == maxCount){
        makeZip(job, done, folderPath);
      }
    }
  });

  // Copy Cabinet Folder
  fs.copy(`${__dirname}/../cabinet/${competitionId}`, `${folderPath}/cabinet`, (err) => {
    if(err){
      done(new Error(err));
    }else{
      outputCount ++;
      jobProgress += 100/(maxCount+1);
      job.progress(jobProgress);
      if(outputCount == maxCount){
        makeZip(job, done, folderPath);
      }
    }
  });

  //Competition data
  competitiondb.competition
  .find({'_id': competitionId})
  .select('name rule logo bkColor color message description ranking documents registration consentForm')
  .lean()
  .exec(function (err, data) {
    if (err) {
      done(new Error(err));
    } else {
      fs.writeFile(`${folderPath}/competition.json`, JSON.stringify(data), (err) => {
        if(err){
          done(new Error(err));
        }else{
          outputCount ++;
          jobProgress += 100/(maxCount+1);
          job.progress(jobProgress);
          if(outputCount == maxCount){
            makeZip(job, done, folderPath);
          }
        }
      });
    }
  });
  
  //Round data
  competitiondb.round
  .find({'competition': competitionId})
  .lean()
  .exec(function (err, data) {
    if (err) {
      done(new Error(err));
    } else {
      fs.writeFile(`${folderPath}/round.json`, JSON.stringify(data), (err) => {
        if(err){
          done(new Error(err));
        }else{
          outputCount ++;
          jobProgress += 100/(maxCount+1);
          job.progress(jobProgress);
          if(outputCount == maxCount){
            makeZip(job, done, folderPath);
          }
        }
      });
    }
  });

  //Team data
  competitiondb.team
  .find({'competition': competitionId})
  .select('competition name league inspected docPublic country checkin teamCode email members document')
  .lean()
  .exec(function (err, data) {
    if (err) {
      done(new Error(err));
    } else {
      fs.writeFile(`${folderPath}/team.json`, JSON.stringify(data), (err) => {
        if(err){
          done(new Error(err));
        }else{
          outputCount ++;
          jobProgress += 100/(maxCount+1);
          job.progress(jobProgress);
          if(outputCount == maxCount){
            makeZip(job, done, folderPath);
          }
        }
      });
    }
  });

  //Field data
  competitiondb.field
  .find({'competition': competitionId})
  .lean()
  .exec(function (err, data) {
    if (err) {
      done(new Error(err));
    } else {
      fs.writeFile(`${folderPath}/field.json`, JSON.stringify(data), (err) => {
        if(err){
          done(new Error(err));
        }else{
          outputCount ++;
          jobProgress += 100/(maxCount+1);
          job.progress(jobProgress);
          if(outputCount == maxCount){
            makeZip(job, done, folderPath);
          }
        }
      });
    }
  });

  //Review data
  documentDb.review
  .find({'competition': competitionId})
  .lean()
  .exec(function (err, data) {
    if (err) {
      done(new Error(err));
    } else {
      fs.writeFile(`${folderPath}/review.json`, JSON.stringify(data), (err) => {
        if(err){
          done(new Error(err));
        }else{
          outputCount ++;
          jobProgress += 100/(maxCount+1);
          job.progress(jobProgress);
          if(outputCount == maxCount){
            makeZip(job, done, folderPath);
          }
        }
      });
    }
  });

  //Line Map data
  lineMapDb.lineMap
  .find({'competition': competitionId})
  .lean()
  .exec(function (err, data) {
    if (err) {
      done(new Error(err));
    } else {
      fs.writeFile(`${folderPath}/lineMap.json`, JSON.stringify(data), (err) => {
        if(err){
          done(new Error(err));
        }else{
          outputCount ++;
          jobProgress += 100/(maxCount+1);
          job.progress(jobProgress);
          if(outputCount == maxCount){
            makeZip(job, done, folderPath);
          }
        }
      });
    }
  });

  //Line Run data
  lineRunDb.lineRun
  .find({'competition': competitionId})
  .lean()
  .exec(function (err, data) {
    if (err) {
      done(new Error(err));
    } else {
      fs.writeFile(`${folderPath}/lineRun.json`, JSON.stringify(data), (err) => {
        if(err){
          done(new Error(err));
        }else{
          outputCount ++;
          jobProgress += 100/(maxCount+1);
          job.progress(jobProgress);
          if(outputCount == maxCount){
            makeZip(job, done, folderPath);
          }
        }
      });
    }
  });

  //Maze Map data
  mazeMapDb.mazeMap
  .find({'competition': competitionId})
  .lean()
  .exec(function (err, data) {
    if (err) {
      done(new Error(err));
    } else {
      fs.writeFile(`${folderPath}/mazeMap.json`, JSON.stringify(data), (err) => {
        if(err){
          done(new Error(err));
        }else{
          outputCount ++;
          jobProgress += 100/(maxCount+1);
          job.progress(jobProgress);
          if(outputCount == maxCount){
            makeZip(job, done, folderPath);
          }
        }
      });
    }
  });

  //Maze Run data
  mazeRunDb.mazeRun
  .find({'competition': competitionId})
  .lean()
  .exec(function (err, data) {
    if (err) {
      done(new Error(err));
    } else {
      fs.writeFile(`${folderPath}/mazeRun.json`, JSON.stringify(data), (err) => {
        if(err){
          done(new Error(err));
        }else{
          outputCount ++;
          jobProgress += 100/(maxCount+1);
          job.progress(jobProgress);
          if(outputCount == maxCount){
            makeZip(job, done, folderPath);
          }
        }
      });
    }
  });

  //Mail data
  mailDb.mail
  .find({'competition': competitionId})
  .select('competition team mailId messageId time to subject html plain status events replacedURL')
  .lean()
  .exec(function (err, data) {
    if (err) {
      done(new Error(err));
    } else {
      fs.writeFile(`${folderPath}/mail.json`, JSON.stringify(data), (err) => {
        if(err){
          done(new Error(err));
        }else{
          outputCount ++;
          jobProgress += 100/(maxCount+1);
          job.progress(jobProgress);
          if(outputCount == maxCount){
            makeZip(job, done, folderPath);
          }
        }
      });
    }
  });

  //Reservation data
  reservationDb.reservation
  .find({'competition': competitionId})
  .lean()
  .exec(function (err, data) {
    if (err) {
      done(new Error(err));
    } else {
      fs.writeFile(`${folderPath}/reservation.json`, JSON.stringify(data), (err) => {
        if(err){
          done(new Error(err));
        }else{
          outputCount ++;
          jobProgress += 100/(maxCount+1);
          job.progress(jobProgress);
          if(outputCount == maxCount){
            makeZip(job, done, folderPath);
          }
        }
      });
    }
  });

  //Survey setting data
  surveyDb.survey
  .find({'competition': competitionId})
  .lean()
  .exec(function (err, data) {
    if (err) {
      done(new Error(err));
    } else {
      fs.writeFile(`${folderPath}/survey.json`, JSON.stringify(data), (err) => {
        if(err){
          done(new Error(err));
        }else{
          outputCount ++;
          jobProgress += 100/(maxCount+1);
          job.progress(jobProgress);
          if(outputCount == maxCount){
            makeZip(job, done, folderPath);
          }
        }
      });
    }
  });

  //Survey answer data
  surveyDb.surveyAnswer
  .find({'competition': competitionId})
  .lean()
  .exec(function (err, data) {
    if (err) {
      done(new Error(err));
    } else {
      fs.writeFile(`${folderPath}/surveyAnswer.json`, JSON.stringify(data), (err) => {
        if(err){
          done(new Error(err));
        }else{
          outputCount ++;
          jobProgress += 100/(maxCount+1);
          job.progress(jobProgress);
          if(outputCount == maxCount){
            makeZip(job, done, folderPath);
          }
        }
      });
    }
  });                        
});

function makeZip(job, done, folderPath) {
  const output = fs.createWriteStream(`${folderPath}.zip`);
  const archive = archiver('zip', {
    zlib: { level: 9 }, // Sets the compression level.
  });

  output.on('close', function () {
    fs.rename(`${folderPath}.zip`, `${folderPath}.cms`, (err) => {
      if(err) {
        done(new Error(err));
      }else{
        rimraf(folderPath, (err) => {
          if(err){
            done(new Error(err));
          }else{
            job.progress(100);
            done();
          }
        }); 
      }
    })
    
  });

  archive.pipe(output);
  archive.directory(folderPath, false);
  archive.finalize();
}

exports.backupQueue = backupQueue;