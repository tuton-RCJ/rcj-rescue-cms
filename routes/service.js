// -*- tab-width: 2 -*-
const { ObjectId } = require('mongoose').Types;
const express = require('express');

const router = express.Router();
const auth = require('../helper/authLevels');
const { ACCESSLEVELS } = require('../models/user');
const ruleDetector = require('../helper/ruleDetector');

/* GET home page. */
router.get('/', function (req, res) {
  res.render('service_home', { user: req.user });
});

router.get('/editor/maze/:rule', async function (req, res, next) {
  const { rule } = req.params;
  res.render('maze_editor', { user: req.user, rule, pubService: true });
});

router.get('/editor/simulation/:rule', async function (req, res, next) {
  const { rule } = req.params;
  res.render('sim_editor', { user: req.user, rule, pubService: true });
});

router.get('/editor/line/:rule', function (req, res, next) {
  const { rule } = req.params;
  res.render('line_editor', { user: req.user, rule, pubService: true });
});

module.exports = router;
