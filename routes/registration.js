// -*- tab-width: 2 -*-
const express = require('express');

const publicRouter = express.Router();
const privateRouter = express.Router();
const adminRouter = express.Router();
const fs = require('fs');
const dateformat = require('dateformat');
const competitiondb = require('../models/competition');
const logger = require('../config/logger').mainLogger;
const { ObjectId } = require('mongoose').Types;
const auth = require('../helper/authLevels');
const { ACCESSLEVELS } = require('../models/user');
const { LEAGUES } = competitiondb;
const mailDb = require('../models/mail');


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

function writeLog(req, competitionId, teamId, message) {
  const output = `[${dateformat(new Date(), 'mm/dd/yy HH:MM:ss')}] ${getIP(
    req
  )} : ${message}\n`;
  fs.appendFile(
    `${__dirname}/../documents/${competitionId}/${teamId}/log.txt`,
    output,
    (err) => {
      if (err) logger.error(err.message);
    }
  );
}

// Input Registration Code / Mail Auth
publicRouter.get('/:competitionId/:leagueId', function (req, res, next) {
  const { competitionId } = req.params;
  const { leagueId } = req.params;

  if (!ObjectId.isValid(competitionId)) {
    return next();
  }

  if (
    LEAGUES.filter(function (elm) {
      return elm.indexOf(leagueId) != -1;
    }).length == 0
  ) {
    return next();
  }

  competitiondb.competition
    .findById(competitionId)
    .select("registration")
    .exec(function (err, dbCompetition) {
      if (err || dbCompetition == null) {
        if (!err) err = { message: 'No competition found' };
          res.status(400).send({
            msg: 'Could not get competition',
            err: err.message,
          });
        } else if (dbCompetition) {
          const now = new Date();
          const timestamp = Math.floor(now.getTime() / 1000);
          let l = dbCompetition.registration.filter(r => r.league == leagueId && r.enable &&  r.deadline >= timestamp);
          if(l.length == 1){
            res.render('registration/top', {
              id: competitionId,
              user: req.user,
              leagueId: leagueId,
              fromAddress: process.env.MAIL_FROM
            });
          }else{
            res.render('registration/close', {
              id: competitionId,
              user: req.user,
              leagueId: leagueId
            });
          }
      }
    });
});


// Registration Form
publicRouter.get('/:authId/:token', function (req, res, next) {
  const { authId } = req.params;
  const { token } = req.params;

  if (!ObjectId.isValid(authId)) {
    return next();
  }

  mailDb.mailAuth
    .findOne({
      _id: authId,
      token: token
    })
    .populate("competition")
    .exec(function (err, authInfo) {
      if (err || authInfo == null) {
        if (!err) err = { message: 'No Auth info found' };
        return res.render('registration/authError', {
          user: req.user
        });
      } else {
        authInfo.createdAt = Date.now();
        authInfo.save(function (err, authData) {
          if (err) {
            logger.error(err);
          } else {
            return res.render('registration/form', {
              id: authInfo.competition._id,
              user: req.user,
              leagueId: authInfo.league,
              consentForm: authInfo.competition.consentForm,
              authId: authId,
              token: token,
              mail: authInfo.mail
            });
          }
        });
      }
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
