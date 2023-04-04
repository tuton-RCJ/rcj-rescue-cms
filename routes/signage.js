// -*- tab-width: 2 -*-
const express = require('express');

const publicRouter = express.Router();
const privateRouter = express.Router();
const adminRouter = express.Router();
const logger = require('../config/logger').mainLogger;
const { ObjectId } = require('mongoose').Types;
const auth = require('../helper/authLevels');
const competitiondb = require('../models/competition');
const { ACCESSLEVELS } = require('../models/user');
const { LINE_LEAGUES, MAZE_LEAGUES } = competitiondb;


/* GET home page. */

adminRouter.get('/setting', function (req, res) {
  res.render('signage_setting', { user: req.user });
});

adminRouter.get('/setting/editor', function (req, res) {
  res.render('signage_editor', { user: req.user });
});

adminRouter.get('/setting/editor/:id', function (req, res) {
  const { id } = req.params;
  res.render('signage_editor', { user: req.user, id });
});

privateRouter.get('/display/:competitionid/run', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.VIEW))
    res.render('runs_monitor', { id, user: req.user });
  else res.render('access_denied', { user: req.user });
});

privateRouter.get('/display/:sigId/:group', function (req, res, next) {
  const { sigId } = req.params;
  const { group } = req.params;
  if (!ObjectId.isValid(sigId)) {
    return next();
  }

  res.render('main_signage', {
    user: req.user,
    sigId,
    group,
    competition: null,
  });
});

privateRouter.get(
  '/display/:sigId/:group/:competitionId',
  function (req, res, next) {
    const { sigId } = req.params;
    const { group } = req.params;
    const { competitionId } = req.params;

    if (!ObjectId.isValid(sigId)) {
      return next();
    }
    if (!ObjectId.isValid(competitionId)) {
      return next();
    }

    if (auth.authCompetition(req.user, competitionId, ACCESSLEVELS.VIEW))
      res.render('main_signage', {
        user: req.user,
        sigId,
        group,
        competition: competitionId,
      });
    else res.render('access_denied', { user: req.user });
  }
);

privateRouter.get(
  '/display/:competitionid/run/:sigId/:grpId',
  function (req, res, next) {
    const id = req.params.competitionid;
    const { sigId, grpId } = req.params;

    if (!ObjectId.isValid(id)) {
      return next();
    }

    if (auth.authCompetition(req.user, id, ACCESSLEVELS.VIEW))
      res.render('runs_monitor', { id, user: req.user, sigId, grpId });
    else res.render('access_denied', { user: req.user });
  }
);

privateRouter.get(
  '/display/:competitionid/score/:league',
  function (req, res, next) {
    const id = req.params.competitionid;
    const { league } = req.params;
    if (!ObjectId.isValid(id)) {
      return next();
    }

    competitiondb.competition
      .findOne({
        _id: id,
      })
      .lean()
      .exec(function (err, data) {
        if (err) {
          logger.error(err);
          res.status(400).send({
            msg: 'Could not get competition',
            err: err.message,
          });
        } else {
          let num = 20;
          if (data) {
            for (const i in data.ranking) {
              if (data.ranking[i].league == league) {
                num = data.ranking[i].num;
                break;
              }
            }
          }
          if (LINE_LEAGUES.includes(league)) {
            res.render('line_score_signage', {
              id,
              user: req.user,
              league,
              num,
              get: req.query,
            });
          } else {
            res.render('maze_score_signage', {
              id,
              user: req.user,
              league,
              num,
              get: req.query,
            });
          }
        }
      });
  }
);

privateRouter.get(
  '/display/:competitionid/score/:league/international',
  function (req, res, next) {
    const id = req.params.competitionid;
    const { league } = req.params;
    if (!ObjectId.isValid(id)) {
      return next();
    }

    competitiondb.competition
      .findOne({
        _id: id,
      })
      .lean()
      .exec(function (err, data) {
        if (err) {
          logger.error(err);
          res.status(400).send({
            msg: 'Could not get competition',
            err: err.message,
          });
        } else {
          let num = 20;
          for (const i in data.ranking) {
            if (data.ranking[i].league == league) {
              num = data.ranking[i].num;
              break;
            }
          }
          res.render('line_score_signage_international', {
            id,
            user: req.user,
            league,
            num,
            get: req.query,
          });
        }
      });
  }
);

privateRouter.get(
  '/display/:competitionid/timetable/:league/:round',
  function (req, res, next) {
    const id = req.params.competitionid;
    const { league } = req.params;
    const { round } = req.params;
    if (!ObjectId.isValid(id)) {
      return next();
    }
    if (!ObjectId.isValid(round)) {
      return next();
    }

    res.render('signage_timetable', {
      id,
      user: req.user,
      league,
      round,
    });
  }
);

privateRouter.get('/clock/:competitionid', function (req, res, next) {
  const id = req.params.competitionid;
  res.render('clock', { id, user: req.user });
});

module.exports.public = publicRouter;
module.exports.private = privateRouter;
module.exports.admin = adminRouter;
