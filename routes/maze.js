// -*- tab-width: 2 -*-
const express = require('express');

const publicRouter = express.Router();
const privateRouter = express.Router();
const adminRouter = express.Router();
const { ObjectId } = require('mongoose').Types;
const auth = require('../helper/authLevels');
const ruleDetector = require('../helper/ruleDetector');
const { ACCESSLEVELS } = require('../models/user');
const competitiondb = require('../models/competition');

const { LEAGUES } = competitiondb;

/* GET home page. */
publicRouter.get('/:competitionid', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }
  if (auth.authCompetition(req.user, id, ACCESSLEVELS.JUDGE))
    res.render('maze_competition', { id, user: req.user, judge: 1 });
  else res.render('maze_competition', { id, user: req.user, judge: 0 });
});

publicRouter.get('/:competitionid/score/:league', function (req, res, next) {
  const id = req.params.competitionid;
  const { league } = req.params;

  if (!ObjectId.isValid(id)) {
    return next();
  }
  if (
    LEAGUES.filter(function (elm) {
      return elm == league;
    }).length == 0
  ) {
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
        res.render('maze_score', {
          id,
          user: req.user,
          league,
          num,
          get: req.query,
        });
      }
    });
});

publicRouter.get('/view/:runid', async function (req, res, next) {
  const id = req.params.runid;

  if (!ObjectId.isValid(id)) {
    return next();
  }
  const rule = await ruleDetector.getRuleFromMazeRunId(id);
  res.render('maze_view', {
    id,
    user: req.user,
    rule,
  });
});

publicRouter.get('/viewcurrent', function (req, res) {
  res.render('maze_view_current');
});

publicRouter.get('/view/field/:competitionid/:fieldid', function (req, res) {
  const id = req.params.fieldid;
  const cid = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }
  res.render('maze_view_field', {
    id,
    cid,
  });
});

privateRouter.get('/judge/:runid', async function (req, res, next) {
  const id = req.params.runid;

  if (!ObjectId.isValid(id)) {
    return next();
  }
  const rule = await ruleDetector.getRuleFromMazeRunId(id);
  res.render('maze_judge', {
    id,
    user: req.user,
    rule,
  });
});

privateRouter.get('/input/:runid', async function (req, res, next) {
  const id = req.params.runid;

  if (!ObjectId.isValid(id)) {
    return next();
  }
  const rule = await ruleDetector.getRuleFromMazeRunId(id);
  res.render('maze_input', {
    id,
    user: req.user,
    rule,
  });
});

privateRouter.get('/check/:runid', async function (req, res, next) {
  const id = req.params.runid;

  if (!ObjectId.isValid(id)) {
    return next();
  }
  const rule = await ruleDetector.getRuleFromMazeRunId(id);
  res.render('maze_check', {
    id,
    user: req.user,
    rule,
  });
});

privateRouter.get('/sign/:runid', async function (req, res) {
  const id = req.params.runid;

  if (!ObjectId.isValid(id)) {
    return next();
  }
  const rule = await ruleDetector.getRuleFromMazeRunId(id);
  res.render('maze_sign', {
    id,
    rule,
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
