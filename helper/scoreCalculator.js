const logger = require('../config/logger').mainLogger;
const rule2023 = require('./scoreCalculator-2023');

module.exports.calculateLineScore = function (run) {
  const { rule } = run.competition;
  switch (rule) {
    case '2023':
    default:
      return rule2023.calculateLineScore(run);
  }
};

module.exports.calculateMazeScore = function (run) {
  const { rule } = run.competition;
  switch (rule) {
    case '2023':
    default:
      if (run.map.leagueType == "entry") return rule2023.calculateMazeScoreEntry(run);
      else return rule2023.calculateMazeScore(run);
  }
};
