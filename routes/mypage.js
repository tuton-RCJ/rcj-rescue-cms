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

publicRouter.get('/:teamId/:token', function (req, res, next) {
  const { teamId } = req.params;
  const { token } = req.params;

  if (!ObjectId.isValid(teamId)) {
    return next();
  }

  competitiondb.team
    .findOne({
      "_id": teamId,
      "document.token": token
    })
    .select("_id competition league name document.enabled")
    .exec(function (err, team) {
      if (err || team == null) {
        if (!err) err = { message: 'No team found' };
          res.render('access_denied', { user: req.user });
        } else if (team) {
          res.render('mypage/my', {
            team: team._id,
            competition: team.competition,
            user: req.user,
            league: team.league,
            teamName: team.name,
            token: token,
            documentEnable: team.document.enabled
          });
      }
    });
});


publicRouter.get('/:teamId/:token/reservation/:resvId', function (req, res, next) {
  const { teamId } = req.params;
  const { token } = req.params;
  const { resvId } = req.params;

  if (!ObjectId.isValid(teamId)) {
    return next();
  }

  if (!ObjectId.isValid(resvId)) {
    return next();
  }

  competitiondb.team
    .findOne({
      "_id": teamId,
      "document.token": token
    })
    .exec(function (err, team) {
      if (err || team == null) {
        if (!err) err = { message: 'No team found' };
          res.render('access_denied', { user: req.user });
        } else if (team) {
          res.render('reservation/form', {
            team: team._id,
            competition: team.competition,
            user: req.user,
            league: team.league,
            teamName: team.name,
            token: token,
            resvId
          });
      }
    });
});

publicRouter.get('/:teamId/:token/cabinet', function (req, res, next) {
  const { teamId } = req.params;
  const { token } = req.params;

  if (!ObjectId.isValid(teamId)) {
    return next();
  }

  competitiondb.team
    .findOne({
      "_id": teamId,
      "document.token": token
    })
    .exec(function (err, team) {
      if (err || team == null) {
        if (!err) err = { message: 'No team found' };
          res.render('access_denied', { user: req.user });
        } else if (team) {
          res.render('cabinet/file', { id: team.competition, user: req.user, isTeam: true , teamId, isMyPage: true, token, leagueTeam: teamId});
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
