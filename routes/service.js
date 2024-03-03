// -*- tab-width: 2 -*-
const { ObjectId } = require('mongoose').Types;
const express = require('express');

const router = express.Router();

/* GET home page. */
router.get('/', function (req, res) {
  res.render('service_home', { user: req.user });
});

router.get('/editor/maze/2024', async function (req, res, next) {
  const { rule } = req.params;
  res.render(`admin/mapEditor/maze_2024`, { user: req.user, pubService: true, leagueId: "Maze" });
});

router.get('/editor/simulation/2021', async function (req, res, next) {
  res.render('sim_editor/sim_editor_2021', { user: req.user, pubService: true });
});

router.get('/editor/simulation/2023', async function (req, res, next) {
  res.render('sim_editor/sim_editor_2023', { user: req.user, pubService: true });
});

router.get('/editor/line/2024', function (req, res, next) {
  const { rule } = req.params;
  res.render(`admin/mapEditor/line_2024`, { user: req.user, pubService: true, leagueId: "Line" });
});

module.exports = router;
