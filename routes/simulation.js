// -*- tab-width: 2 -*-
const express = require('express');

const publicRouter = express.Router();
const privateRouter = express.Router();
const adminRouter = express.Router();
const { ObjectId } = require('mongoose').Types;
const auth = require('../helper/authLevels');
const { ACCESSLEVELS } = require('../models/user');
const competitiondb = require('../models/competition');
const ruleDetector = require('../helper/ruleDetector');

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

publicRouter.get('/:competitionid/:leagueId/ranking', async function (req, res, next) {
  const competitionId = req.params.competitionid;
  const { leagueId } = req.params;

  if (!ObjectId.isValid(competitionId)) {
    return next();
  }

  if (!SIM_LEAGUES.includes(leagueId)) {
    return next();
  }
  
  const rule = await ruleDetector.getLeagueTypeAndRule(competitionId, leagueId);
  res.render(`ranking/${rule.type}_${rule.rule}`, { competitionId, leagueId, user: req.user });
});

privateRouter.get('/judge/:runid', async function (req, res, next) {
  const id = req.params.runid;

  if (!ObjectId.isValid(id)) {
    return next();
  }
  const rule = await ruleDetector.getRuleFromSimulationRunId(id);
  res.render(`judge/${rule.type}_${rule.rule}`, { id });
});

privateRouter.get('/sign/:runid', async function (req, res) {
  const id = req.params.runid;

  if (!ObjectId.isValid(id)) {
    return next();
  }
  const rule = await ruleDetector.getRuleFromSimulationRunId(id);
  res.render(`sign/${rule.type}_${rule.rule}`, { id });
});

publicRouter.get('/view/:runid', async function (req, res, next) {
  const id = req.params.runid;
  const iframe = req.query.iframe;

  if (!ObjectId.isValid(id)) {
    return next();
  }
  const rule = await ruleDetector.getRuleFromSimulationRunId(id);
  res.render(`view/${rule.type}_${rule.rule}`, { id, iframe, rule: rule.rule });
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
