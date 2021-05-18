//= =======================================================================
//                          Libraries
//= =======================================================================

const express = require('express');

const adminRouter = express.Router();
const multer = require('multer');
const fs = require('fs-extra');
const glob = require('glob');
const extract = require('extract-zip');
const rimraf = require('rimraf');
const chmodr = require('chmodr');
const path = require('path');
const competitiondb = require('../../models/competition');
const lineMapDb = require('../../models/lineMap');
const lineRunDb = require('../../models/lineRun');
const mazeMapDb = require('../../models/mazeMap');
const mazeRunDb = require('../../models/mazeRun');
const documentDb = require('../../models/document');
const mailDb = require('../../models/mail');
const { ObjectId } = require('mongoose').Types;


const logger = require('../../config/logger').mainLogger;
const auth = require('../../helper/authLevels');

const { ACCESSLEVELS } = require('../../models/user');

const base_tmp_path = `${__dirname}/../../tmp/`;

const {backupQueue} = require("../../queue/backupQueue")

adminRouter.get('/:competition', function (req, res) {
  const competitionId = req.params.competition;

  if (!auth.authCompetition(req.user, competitionId, ACCESSLEVELS.ADMIN)) {
    return res.status(401).send({
      msg: 'You have no authority to access this api',
    });
  }

  backupQueue.add('backup',{competitionId});
  res.status(200).send({
    msg: 'Backup job has been added to the queue!',
  });
});


adminRouter.get('/list/:competitionId', function (req, res, next) {
  const { competitionId } = req.params;

  if (!ObjectId.isValid(competitionId)) {
    return next();
  }

  if (auth.authCompetition(req.user,competitionId,ACCESSLEVELS.ADMIN)){ // Admin check
    glob.glob(
      `./backup/${competitionId}/*.cms`,
      function (er, files) {
        let fl = [];
        for(let f of files){
          let tmp = {
            "time": Number(path.basename(f, path.extname(f))),
            "name": path.basename(f)
          }
          fl.push(tmp);
        }
        res.status(200).send(fl);
      }
    );
  }else{
    res.status(403).send({
      msg: 'Auth error'
    });
  }
});

adminRouter.get('/archive/:competitionId/:fileName', function (req, res, next) {
  const { competitionId } = req.params;
  const { fileName } = req.params;

  if (!ObjectId.isValid(competitionId)) {
    return next();
  }

  if (auth.authCompetition(req.user,competitionId,ACCESSLEVELS.ADMIN)){ // Admin check
    let path = `${__dirname}/../../backup/${competitionId}/${fileName}`;
    fs.stat(path, (err, stat) => {
      // Handle file not found
      if (err !== null) {
        if(err.code === 'ENOENT'){
          return res.status(404).send({
            msg: 'File not found',
          });
        }
        return res.status(500).send({
          msg: 'Cloud not get file',
        });
      }
      
      fs.readFile(path, function (err, data) {
        res.writeHead(200, {
          'Content-Type': "application/zip",
        });
        res.end(data);
      });
    });
  }else{
    res.status(403).send({
      msg: 'Auth error'
    });
  }
});

adminRouter.delete('/archive/:competitionId/:fileName', function (req, res, next) {
  const { competitionId } = req.params;
  const { fileName } = req.params;

  if (!ObjectId.isValid(competitionId)) {
    return next();
  }

  if (auth.authCompetition(req.user,competitionId,ACCESSLEVELS.ADMIN)){ // Admin check
    let path = `${__dirname}/../../backup/${competitionId}/${fileName}`;
    fs.unlink(path, (err) => {
      if (err){
        return res.status(500).send({
          msg: 'Could not delete backup',
          err: err.message,
        });
      }else{
        res.status(200).send({
          msg: 'Backup is deleted'
        });
      }
    });
  }else{
    res.status(403).send({
      msg: 'Auth error'
    });
  }
});

adminRouter.post('/restore', function (req, res) {
  const folder = Math.random().toString(32).substring(2);
  fs.mkdirsSync(`${base_tmp_path}uploads/`);

  const filePath = `${base_tmp_path}uploads/${folder}.zip`;

  const storage = multer.diskStorage({
    destination(req, file, callback) {
      callback(null, `${base_tmp_path}uploads/`);
    },
    filename(req, file, callback) {
      callback(null, `${folder}.zip`);
    },
  });

  const upload = multer({
    storage,
  }).single('rcjs');

  upload(req, res, function (err) {
    extract(
      filePath,
      { dir: `${base_tmp_path}uploads/${folder}` },
      function (err) {
        try {
          const version = JSON.parse(
            fs.readFileSync(
              `${base_tmp_path}uploads/${folder}/version.json`,
              'utf8'
            )
          );
          if (version.version != "21.4") {
            rimraf(`${base_tmp_path}uploads/${folder}`, function (err) {});
            fs.unlink(filePath, function (err) {});
            res.status(500).send({ msg: 'Version not match' });
            return;
          }
          const updated = 0;
          // Competition
          const competition = JSON.parse(
            fs.readFileSync(
              `${base_tmp_path}uploads/${folder}/competition.json`,
              'utf8'
            )
          );
          competitiondb.competition.updateOne(
            { _id: competition[0]._id },
            competition[0],
            { upsert: true },
            function (err) {
              if (err) {
                logger.error(err);
              } else {
              }
            }
          );

          // Team
          const team = JSON.parse(
            fs.readFileSync(
              `${base_tmp_path}uploads/${folder}/team.json`,
              'utf8'
            )
          );
          for (const i in team) {
            competitiondb.team.updateOne(
              { _id: team[i]._id },
              team[i],
              { upsert: true },
              function (err) {
                if (err) {
                  logger.error(err);
                } else {
                }
              }
            );
          }

          // Round
          const round = JSON.parse(
            fs.readFileSync(
              `${base_tmp_path}uploads/${folder}/round.json`,
              'utf8'
            )
          );
          for (const i in round) {
            competitiondb.round.updateOne(
              { _id: round[i]._id },
              round[i],
              { upsert: true },
              function (err) {
                if (err) {
                  logger.error(err);
                } else {
                }
              }
            );
          }

          // Field
          const field = JSON.parse(
            fs.readFileSync(
              `${base_tmp_path}uploads/${folder}/field.json`,
              'utf8'
            )
          );
          for (const i in field) {
            competitiondb.field.updateOne(
              { _id: field[i]._id },
              field[i],
              { upsert: true },
              function (err) {
                if (err) {
                  logger.error(err);
                } else {
                }
              }
            );
          }

          // LineMap
          const lineMap = JSON.parse(
            fs.readFileSync(
              `${base_tmp_path}uploads/${folder}/lineMap.json`,
              'utf8'
            )
          );
          for (const i in lineMap) {
            lineMapDb.lineMap.updateOne(
              { _id: lineMap[i]._id },
              lineMap[i],
              { upsert: true },
              function (err) {
                if (err) {
                  logger.error(err);
                } else {
                }
              }
            );
          }

          // LineRun
          const lineRun = JSON.parse(
            fs.readFileSync(
              `${base_tmp_path}uploads/${folder}/lineRun.json`,
              'utf8'
            )
          );
          for (const i in lineRun) {
            lineRunDb.lineRun.updateOne(
              { _id: lineRun[i]._id },
              lineRun[i],
              { upsert: true },
              function (err) {
                if (err) {
                  logger.error(err);
                } else {
                }
              }
            );
          }

          // MazeMap
          const mazeMap = JSON.parse(
            fs.readFileSync(
              `${base_tmp_path}uploads/${folder}/mazeMap.json`,
              'utf8'
            )
          );
          for (const i in mazeMap) {
            mazeMapDb.mazeMap.updateOne(
              { _id: mazeMap[i]._id },
              mazeMap[i],
              { upsert: true },
              function (err) {
                if (err) {
                  logger.error(err);
                } else {
                }
              }
            );
          }

          // MazeRun
          const mazeRun = JSON.parse(
            fs.readFileSync(
              `${base_tmp_path}uploads/${folder}/mazeRun.json`,
              'utf8'
            )
          );
          for (const i in mazeRun) {
            mazeRunDb.mazeRun.updateOne(
              { _id: mazeRun[i]._id },
              mazeRun[i],
              { upsert: true },
              function (err) {
                if (err) {
                  logger.error(err);
                } else {
                }
              }
            );
          }

          // Document
          const document = JSON.parse(
            fs.readFileSync(
              `${base_tmp_path}uploads/${folder}/document.json`,
              'utf8'
            )
          );
          for (const i in document) {
            documentDb.review.updateOne(
              { _id: document[i]._id },
              document[i],
              { upsert: true },
              function (err) {
                if (err) {
                  logger.error(err);
                } else {
                }
              }
            );
          }

          // MailDb
          const mail = JSON.parse(
            fs.readFileSync(
              `${base_tmp_path}uploads/${folder}/mail.json`,
              'utf8'
            )
          );
          for (const i in mail) {
            mailDb.mail.updateOne(
              { _id: mail[i]._id },
              mail[i],
              { upsert: true },
              function (err) {
                if (err) {
                  logger.error(err);
                } else {
                }
              }
            );
          }

          // Copy Document Folder
          fs.copySync(
            `${base_tmp_path}uploads/${folder}/documents/${competition[0]._id}`,
            `${__dirname}/../../documents/${competition[0]._id}`
          );
          chmodr(
            `${__dirname}/../../documents/${competition[0]._id}`,
            0o777,
            (err) => {
              if (err) {
                logger.error('Failed to execute chmod', err);
              }
            }
          );

          rimraf(`${base_tmp_path}uploads/${folder}`, function (err) {});
          fs.unlink(filePath, function (err) {});

          res.redirect(`/admin/${competition[0]._id}`);
        } catch (e) {
          logger.error(e);
          res.status(500).send({ msg: 'Illegal file' });
        }
      }
    );
  });
});

adminRouter.all('*', function (req, res, next) {
  next();
});

module.exports.admin = adminRouter;
