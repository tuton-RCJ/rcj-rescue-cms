const Queue = require('bull');
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
const userdb = require('../models/user');
const base_tmp_path = `${__dirname}/../tmp/`;
const { ACCESSLEVELS } = require('../models/user');

const Bversion = "21.4";

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
  job.progress(0);

  fs.writeFile(`${folderPath}/version.json`,JSON.stringify({ version: Bversion }), (err) => {
    if(err){
      done(new Error(err));
    }else{
      outputCount ++;
      jobProgress += 100/(maxCount+1);
      job.progress(Math.floor(jobProgress));
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
      job.progress(Math.floor(jobProgress));
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
      job.progress(Math.floor(jobProgress));
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
          job.progress(Math.floor(jobProgress));
          if(outputCount == maxCount){
            makeZip(job, done, folderPath);
          }
        }
      });
    }
  });

  function backup(file, Model){
    Model
    .find({'competition': competitionId})
    .lean()
    .select(Object.keys(Model.schema.tree))
    .exec(function (err, data) {
      if (err) {
        done(new Error(err));
      } else {
        fs.writeFile(`${folderPath}/${file}.json`, JSON.stringify(data), (err) => {
          if(err){
            done(new Error(err));
          }else{
            outputCount ++;
            jobProgress += 100/(maxCount+1);
            job.progress(Math.floor(jobProgress));
            if(outputCount == maxCount){
              makeZip(job, done, folderPath);
            }
          }
        });
      }
    });
  }
  
  backup('round', competitiondb.round);
  backup('team', competitiondb.team);
  backup('field', competitiondb.field);
  backup('review', documentDb.review);
  backup('lineMap', lineMapDb.lineMap);
  backup('lineRun', lineRunDb.lineRun);
  backup('mazeMap', mazeMapDb.mazeMap);
  backup('mazeRun', mazeRunDb.mazeRun);
  backup('mail', mailDb.mail);
  backup('reservation', reservationDb.reservation);
  backup('survey', surveyDb.survey);
  backup('surveyAnswer', surveyDb.surveyAnswer);             
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


function deleteFiles(folder){
  rimraf(`${base_tmp_path}uploads/${folder}`, function (err) {
  });
  fs.unlink(`${base_tmp_path}uploads/${folder}.zip`, function (err) {
  });
}

backupQueue.process('restore', function(job, done){
  job.progress(0);
  const {folder, user} = job.data;
  const maxCount = 16;
  extract(
    `${base_tmp_path}uploads/${folder}.zip`,
    { dir: `${base_tmp_path}uploads/${folder}` },
    function (err) {
      if(err){
        done(new Error(err));
      }else{

        const version = JSON.parse(
          fs.readFileSync(
            `${base_tmp_path}uploads/${folder}/version.json`,
            'utf8'
          )
        );
        if (version.version != "21.4") {
          rimraf(`${base_tmp_path}uploads/${folder}`, function (err) {
            done(new Error(err));
            deleteFiles(folder);
          });
          fs.unlink(`${base_tmp_path}uploads/${folder}.zip`, function (err) {
            done(new Error(err));
            deleteFiles(folder);
          });
          done(new Error(`It is expected that the backup data is Version: ${Bversion}, but the file entered is Version: ${version.version}.`));
          deleteFiles(folder);
        }else{
          let updated = 1;
          let jobProgress = 0;
          jobProgress += 100/(maxCount+1);
          job.progress(Math.floor(jobProgress));

          //Competition
          const competition = JSON.parse(
            fs.readFileSync(
              `${base_tmp_path}uploads/${folder}/competition.json`,
              'utf8'
            )
          );
          job.update({
            folder,
            user,
            competitionId: competition[0]._id
          });
          competitiondb.competition.updateOne(
            { _id: competition[0]._id },
            competition[0],
            { upsert: true },
            function (err) {
              if (err) {
                done(new Error(err));
                deleteFiles(folder);
              } else {
                updated ++;
                jobProgress += 100/(maxCount+1);
                job.progress(Math.floor(jobProgress));
                if(updated == maxCount){
                  deleteFiles(folder);
                  job.progress(100);
                  done();
                }
              }
            }
          );

          function restore(fileName, Model){
            const json = JSON.parse(
              fs.readFileSync(
                `${base_tmp_path}uploads/${folder}/${fileName}.json`,
                'utf8'
              )
            );
            const bulkOps = json.map(item => ({
              updateOne: {
                  filter: {_id: item._id},
                  update: item,
                  upsert: true
              }
            }));
            Model.bulkWrite(bulkOps,
              function (err) {
                if (err) {
                  done(new Error(err));
                  deleteFiles(folder);
                } else {
                  updated ++;
                  jobProgress += 100/(maxCount+1);
                  job.progress(Math.floor(jobProgress));
                  if(updated == maxCount){
                    deleteFiles(folder);
                    job.progress(100);
                    done();
                  }
                }
              }
            );
          }

          restore('team', competitiondb.team);
          restore('field', competitiondb.field);
          restore('round', competitiondb.round);
          restore('lineMap', lineMapDb.lineMap);
          restore('lineRun', lineRunDb.lineRun);
          restore('mazeMap', mazeMapDb.mazeMap);
          restore('mazeRun', mazeRunDb.mazeRun);
          restore('mail', mailDb.mail);
          restore('reservation', reservationDb.reservation);
          restore('review', documentDb.review);
          restore('survey', surveyDb.survey);
          restore('surveyAnswer', surveyDb.surveyAnswer);

          // Copy Document Folder
          fs.copy(`${base_tmp_path}uploads/${folder}/documents`, `${__dirname}/../documents/${competition[0]._id}`, (err) => {
            chmodr(
              `${__dirname}/../documents/${competition[0]._id}`,
              0o777,
              (err) => {
                if (err) {
                  done(new Error(err));
                  deleteFiles(folder);
                }else{
                  updated ++;
                  jobProgress += 100/(maxCount+1);
                  job.progress(Math.floor(jobProgress));
                  if(updated == maxCount){
                    deleteFiles(folder);
                    job.progress(100);
                    done();
                  }
                }
              }
            );
          });

          // Copy Cabinet Folder
          fs.copy(`${base_tmp_path}uploads/${folder}/cabinet`, `${__dirname}/../cabinet/${competition[0]._id}`, (err) => {
            chmodr(
              `${__dirname}/../cabinet/${competition[0]._id}`,
              0o777,
              (err) => {
                if (err) {
                  done(new Error(err));
                  deleteFiles(folder);
                }else{
                  updated ++;
                  jobProgress += 100/(maxCount+1);
                  job.progress(Math.floor(jobProgress));
                  if(updated == maxCount){
                    deleteFiles(folder);
                    job.progress(100);
                    done();
                  }
                }
              }
            );
          });
          
          userdb.user.findById(user._id).exec(function (err, dbUser) {
            if (err) {
              logger.error(err);
            } else if (dbUser) {
              if(dbUser.competitions.some(c => c.id == competition[0]._id)){
                for(let c of dbUser.competitions){
                  if(c.id == competition[0]._id) c.accessLevel = ACCESSLEVELS.ADMIN;
                }
                dbUser.save(function (err) {
                  if (err) {
                    logger.error(err);
                  }else{
  
                  }
                });
              }else{
                const newData = {
                  id: competition[0]._id,
                  accessLevel: ACCESSLEVELS.ADMIN,
                };
                dbUser.competitions.push(newData);
      
                dbUser.save(function (err) {
                  if (err) {
                    logger.error(err);
                  }else{
  
                  }
                });
              }
            }
          });
        }
      }
    }
  );
});



exports.backupQueue = backupQueue;