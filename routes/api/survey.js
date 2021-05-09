//= =======================================================================
//                          Libraries
//= =======================================================================

const express = require('express');

const publicRouter = express.Router();
const privateRouter = express.Router();
const adminRouter = express.Router();
const validator = require('validator');
const { ObjectId } = require('mongoose').Types;
const pathL = require('path');
const fs = require('fs');
const mime = require('mime');
const nodemailer = require('nodemailer');
const { htmlToText } = require('html-to-text');
const crypto = require('crypto');
const { ACCESSLEVELS } = require('../../models/user');
const auth = require('../../helper/authLevels');
const logger = require('../../config/logger').mainLogger;
const query = require('../../helper/query-helper');
const surveyDb = require('../../models/survey');
const sanitizeFilename = require('sanitize-filename');
const {escapeRegExp} = require('lodash');
const competitiondb = require('../../models/competition');


const S = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const N = 32;

const TRANSPARENT_GIF_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=',
  'base64'
);

function getIP(req) {
  if (req.headers['x-forwarded-for']) {
    return req.headers['x-forwarded-for'];
  }
  if (req.connection && req.connection.remoteAddress) {
    return req.connection.remoteAddress;
  }
  if (req.connection.socket && req.connection.socket.remoteAddress) {
    return req.connection.socket.remoteAddress;
  }
  if (req.socket && req.socket.remoteAddress) {
    return req.socket.remoteAddress;
  }
  return '0.0.0.0';
}

let smtp;
if (process.env.MAIL_SMTP &&process.env.MAIL_PORT &&process.env.MAIL_FROM) {
  let smtp_conf;
  if(process.env.MAIL_USER && process.env.MAIL_PASS){
    smtp_conf = {
      host: process.env.MAIL_SMTP,
      port: process.env.MAIL_PORT,
      secure: process.env.MAIL_PORT == 465,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    };
  }else{
    //No auth
    smtp_conf = {
      host: process.env.MAIL_SMTP,
      port: process.env.MAIL_PORT,
      use_authentication: false,
      tls: {
          rejectUnauthorized: false
      }
    };
  }
  smtp = nodemailer.createTransport(smtp_conf);
} else {
  smtp = null;
}

let socketIo;

module.exports.connectSocketIo = function (io) {
  socketIo = io;
};


adminRouter.post('/edit/:competitionId', function (req, res, next) {
  const competitionId = req.params.competitionId;
  let sdata = req.body;

  if (!ObjectId.isValid(competitionId)) {
    return next();
  }

  if(!auth.authCompetition(req.user,competitionId,ACCESSLEVELS.ADMIN)){
    res.status(403).send({
      msg: 'Please check your permission.',
    });
    return;
  }

  sdata.competition = competitionId;

  new surveyDb.survey(sdata).save(function (err, data) {
    if (err) {
      logger.error(err);
      return res.status(400).send({
        msg: 'Error saving in db',
        err: err.message,
      });
    }
    return res.status(201).send({
      id: data._id,
    });
  });
});

adminRouter.get('/list/:competitionId', function (req, res, next) {
  const competitionId = req.params.competitionId;

  if (!ObjectId.isValid(competitionId)) {
    return next();
  }
  if(!auth.authCompetition(req.user,competitionId,ACCESSLEVELS.ADMIN)){
    res.status(403).send({
      msg: 'Please check your permission.',
    });
    return;
  }

  surveyDb.survey
    .find({
      competition: competitionId,
    })
    .exec(function (err, dbSurvey) {
      if (err) {
        logger.error(err);
        return res.status(400).send({
          msg: 'Could not get survey',
          err: err.message,
        });
      }
      return res.status(200).send(dbSurvey);
    });
});

adminRouter.get('/edit/:competitionId/:surveyId', function (req, res, next) {
  const competitionId = req.params.competitionId;
  const surveyId = req.params.surveyId;

  if (!ObjectId.isValid(competitionId)) {
    return next();
  }
  if (!ObjectId.isValid(surveyId)) {
    return next();
  }
  if(!auth.authCompetition(req.user,competitionId,ACCESSLEVELS.ADMIN)){
    res.status(403).send({
      msg: 'Please check your permission.',
    });
    return;
  }

  surveyDb.survey
    .findOne({
      _id: surveyId,
      competition: competitionId,
    })
    .exec(function (err, dbSurvey) {
      if (err) {
        logger.error(err);
        return res.status(400).send({
          msg: 'Could not get resv',
          err: err.message,
        });
      }
      return res.status(200).send(dbSurvey);
    });
});

adminRouter.delete('/delete/:competitionId/:surveyId', function (req, res, next) {
  const competitionId = req.params.competitionId;
  const surveyId = req.params.surveyId;

  if (!ObjectId.isValid(competitionId)) {
    return next();
  }
  if (!ObjectId.isValid(surveyId)) {
    return next();
  }
  if(!auth.authCompetition(req.user,competitionId,ACCESSLEVELS.ADMIN)){
    res.status(403).send({
      msg: 'Please check your permission.',
    });
    return;
  }

  surveyDb.survey
    .deleteOne({
      _id: surveyId,
      competition: competitionId,
    })
    .exec(function (err, dbResv) {
      if (err) {
        logger.error(err);
        return res.status(400).send({
          msg: 'Could not delete survey',
          err: err.message,
        });
      }
      surveyDb.surveyAnswer
      .deleteMany({
        survey: surveyId,
        competition: competitionId,
      })
      .exec(function (err, dbResv) {
        if (err) {
          logger.error(err);
          return res.status(400).send({
            msg: 'Could not delete team survey',
            err: err.message,
          });
        }
        return res.status(200).send({
          msg: "Deleted"
        });
      });
    });
});

adminRouter.put('/edit/:competitionId/:surveyId', function (req, res, next) {
  const competitionId = req.params.competitionId;
  const surveyId = req.params.surveyId;
  let sData = req.body;
  if (!ObjectId.isValid(competitionId)) {
    return next();
  }
  if (!ObjectId.isValid(surveyId)) {
    return next();
  }
  if(!auth.authCompetition(req.user,competitionId,ACCESSLEVELS.ADMIN)){
    res.status(403).send({
      msg: 'Please check your permission.',
    });
    return;
  }

  surveyDb.survey
    .findOne({
      _id: surveyId,
      competition: competitionId
    })
    .exec(function (err, dbSurvey) {
      if (err) {
        logger.error(err);
        return res.status(400).send({
          msg: 'Could not get survey',
          err: err.message,
        });
      }

      sData.competition = competitionId;
      dbSurvey.i18n = sData.i18n;
      dbSurvey.languages = sData.languages;
      dbSurvey.deadline = sData.deadline;
      dbSurvey.enable = sData.enable;
      dbSurvey.league = sData.league;
      dbSurvey.team = sData.team;
      dbSurvey.reEdit = sData.reEdit;
      dbSurvey.questions = sData.questions;

      dbSurvey.save(function (err, data) {
        if (err) {
          logger.error(err);
          return res.status(500).send({
            msg: err.message,
          });
        } else {
          return res.status(200).send({
            msg: 'Saved',
          });
        }
      });
    });
});

publicRouter.get('/list/:competitionId/:leagueId/:teamId', function (req, res, next) {
  const competitionId = req.params.competitionId;
  const leagueId = req.params.leagueId;
  const teamId = req.params.teamId;

  if (!ObjectId.isValid(competitionId)) {
    return next();
  }
  if (!ObjectId.isValid(teamId)) {
    return next();
  }

  surveyDb.survey
    .find({
      competition: competitionId,
      enable: true,
      $or: [
        {league: leagueId},
        {team: teamId}
      ]
    })
    .select("_id name i18n languages deadline reEdit")
    .exec(function (err, dbSurvey) {
      if (err) {
        logger.error(err);
        return res.status(400).send({
          msg: 'Could not get resv',
          err: err.message,
        });
      }

      surveyDb.surveyAnswer
      .find({
        competition: competitionId,
        team: teamId
      })
      .exec(function (err, dbAnswer) {
        if (err) {
          logger.error(err);
          return res.status(400).send({
            msg: 'Could not get answer',
            err: err,
          });
        }

        let resData = [];
        if(dbAnswer != null){
          for(let surv of dbSurvey){
            resData.push({
              '_id': surv._id,
              'reEdit': surv.reEdit,
              'sent': dbAnswer.some(a => a.survey.toString() === surv._id.toString()),
              'deadline': surv.deadline,
              'i18n': surv.i18n,
              'languages': surv.languages
            });
          }
          return res.status(200).send(resData);
        }else{
          return res.status(200).send(dbSurvey);
        }
      });
    });
});

publicRouter.get('/question/:teamId/:token/:survId', function (req, res, next) {
  const teamId = req.params.teamId;
  const token = req.params.token;
  const survId = req.params.survId;

  if (!ObjectId.isValid(teamId)) {
    return next();
  }
  if (!ObjectId.isValid(survId)) {
    return next();
  }

  competitiondb.team.findOne({
    "_id": teamId,
    "document.token": token
  })
  .exec(function (err, team) {
    if (err || team == null) {
      if (!err) err = { message: 'No team found' };
      return res.status(403).send({
      });
    } else if (team) {
      surveyDb.survey
      .findOne({
        competition: team.competition,
        enable: true,
        $or: [
          {league: team.league},
          {team: team._id}
        ],
        _id: survId
      })
      .exec(function (err, dbServ) {
        if (err || dbServ == null) {
          logger.error(err);
          return res.status(400).send({
            msg: 'Could not get resv',
            err: err,
          });
        }

        delete dbServ.team;
        delete dbServ.league;
        
        return res.status(200).send(dbServ);
      });
    }
  });
});

publicRouter.get('/answer/:teamId/:token/:survId', function (req, res, next) {
  const teamId = req.params.teamId;
  const token = req.params.token;
  const survId = req.params.survId;

  if (!ObjectId.isValid(teamId)) {
    return next();
  }
  if (!ObjectId.isValid(survId)) {
    return next();
  }

  competitiondb.team.findOne({
    "_id": teamId,
    "document.token": token
  })
  .exec(function (err, team) {
    if (err || team == null) {
      return res.status(400).send({
        msg: 'No team found'
      });
    } else if (team) {
      surveyDb.surveyAnswer
      .findOne({
        competition: team.competition,
        team: team._id,
        survey: survId
      })
      .exec(function (err, dbAnswer) {
        if (err) {
          logger.error(err);
          return res.status(400).send({
            msg: 'Could not get answer',
            err: err,
          });
        }
        
        if(dbAnswer){
          return res.status(200).send(dbAnswer.answer);
        }else{
          return res.status(200).send([]);
        }  
      });
    }
  });
});

publicRouter.put('/answer/:teamId/:token/:survId', function (req, res, next) {
  const teamId = req.params.teamId;
  const token = req.params.token;
  const survId = req.params.survId;
  const ansData = req.body;

  if (!ObjectId.isValid(teamId)) {
    return next();
  }
  if (!ObjectId.isValid(survId)) {
    return next();
  }

  competitiondb.team.findOne({
    "_id": teamId,
    "document.token": token
  })
  .exec(function (err, team) {
    if (err || team == null) {
      if (!err) err = { message: 'No team found' };
      return res.status(403).send({
      });
    } else if (team) {
      surveyDb.survey
      .findOne({
        _id: survId,
        competition: team.competition,
        enable: true,
        $or: [
          {league: team.league},
          {team: team._id}
        ]
      })
      .exec(function (err, survey) {
        if (err || survey == null) {
          return res.status(400).send({
            msg: 'Cloud not found survey master'
          });
        } else if (survey) {
          surveyDb.surveyAnswer
          .findOne({
            survey: survId,
            team: team._id,
            competition: team.competition
          })
          .exec(function (err, ans) {
            let errMes = '';
            let admin = false;
            if(auth.authCompetition(req.user,team.competition,ACCESSLEVELS.ADMIN)){
              admin = true;
            }else if(survey.deadline < new Date()){
              return res.status(400).send({
                msg: 'Deadline has already passed...'
              });
            }
            if(ans == null){//NEW
              new surveyDb.surveyAnswer({
                survey: survId,
                team: team._id,
                competition: team.competition,
                answer: ansData
              }).save(function (err, data) {
                if (err) {
                  logger.error(err);
                  return res.status(400).send({
                    msg: 'Error saving in db',
                    err: err.message,
                  });
                }
                return res.status(201).send({
                  id: data._id,
                });
              });
            }else{//UPDATE
              if(survey.reEdit || admin){
                ans.answer = ansData;
                ans.save(function (err, data) {
                  if (err) {
                    logger.error(err);
                    return res.status(400).send({
                      msg: 'Error saving in db',
                      err: err.message,
                    });
                  }
                  return res.status(201).send({
                    msg: 'Updated'
                  });
                });
              }else{
                return res.status(400).send({
                  msg: 'This survey form does not allow for more than one submission'
                });
              }
            }
          });
        }
      });
    }
  });
});

adminRouter.delete('/answer/:competitionId/:answerId', function (req, res, next) {
  const competitionId = req.params.competitionId;
  const answerId = req.params.answerId;

  if (!ObjectId.isValid(competitionId)) {
    return next();
  }
  if (!ObjectId.isValid(answerId)) {
    return next();
  }

  if(!auth.authCompetition(req.user,competitionId,ACCESSLEVELS.ADMIN)){
    res.status(403).send({
      msg: 'Please check your permission.',
    });
    return;
  }
  
  surveyDb.surveyAnswer
  .deleteOne({
    _id: answerId,
    competition: competitionId
  })
  .exec(function (err, dbAnswer) {
    if (err) {
      logger.error(err);
      return res.status(400).send({
        msg: 'Could not get answer',
        err: err,
      });
    }
    return res.status(200).send({
      msg: 'Deleted'
    });
  });
});

adminRouter.get('/answer/:competitionId/:survId', function (req, res, next) {
  const competitionId = req.params.competitionId;
  const survId = req.params.survId;

  if (!ObjectId.isValid(competitionId)) {
    return next();
  }
  if (!ObjectId.isValid(survId)) {
    return next();
  }

  if(!auth.authCompetition(req.user,competitionId,ACCESSLEVELS.ADMIN)){
    res.status(403).send({
      msg: 'Please check your permission.',
    });
    return;
  }

  surveyDb.surveyAnswer
  .find({
    competition: competitionId,
    survey: survId
  })
  .populate({ 
    path: 'team',
    select: 'name teamCode league document.token'
  })
  .exec(function (err, dbAnswer) {
    if (err) {
      logger.error(err);
      return res.status(400).send({
        msg: 'Could not get answer',
        err: err,
      });
    }
    return res.status(200).send(dbAnswer);
  });
});

publicRouter.all('*', function (req, res, next) {
  next();
});
privateRouter.all('*', function (req, res, next) {
  next();
});

module.exports.public = publicRouter;
module.exports.private = privateRouter;
module.exports.admin = adminRouter;
