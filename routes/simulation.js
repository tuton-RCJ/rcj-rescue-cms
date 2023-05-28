// -*- tab-width: 2 -*-
const express = require('express');

const publicRouter = express.Router();
const privateRouter = express.Router();
const adminRouter = express.Router();
const { ObjectId } = require('mongoose').Types;
const auth = require('../helper/authLevels');
const { ACCESSLEVELS } = require('../models/user');
const competitiondb = require('../models/competition');

const { SIM_LEAGUES } = competitiondb;

/* GET home page. */
publicRouter.get('/:competitionid/:league', function (req, res, next) {
  const id = req.params.competitionid;
  const { league } = req.params;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (!SIM_LEAGUES.includes(league)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.JUDGE))
    res.render('simulation_competition', { id, user: req.user, judge: 1, league});
  else res.render('simulation_competition', { id, user: req.user, judge: 0, league});
});

publicRouter.get('/:competitionid/:league/score', function (req, res, next) {
  const id = req.params.competitionid;
  const { league } = req.params;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (!SIM_LEAGUES.includes(league)) {
    return next();
  }

  return res.render('simulation_score', {
    id,
    user: req.user,
    league,
    get: req.query,
  });
});

privateRouter.get('/judge/:runid', async function (req, res, next) {
  const id = req.params.runid;

  if (!ObjectId.isValid(id)) {
    return next();
  }
  res.render('simulation_judge', {
    id,
    user: req.user
  });
});

privateRouter.get('/sign/:runid', async function (req, res) {
  const id = req.params.runid;

  if (!ObjectId.isValid(id)) {
    return next();
  }
  res.render('simulation_sign', {
    id
  });
});

publicRouter.get('/view/:runid', async function (req, res, next) {
  const id = req.params.runid;
  const iframe = req.query.iframe;

  if (!ObjectId.isValid(id)) {
    return next();
  }
  res.render('simulation_view', {
    id,
    user: req.user,
    iframe
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
