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

module.exports.calculateLineScoreManual = function (run) {
  const { rule } = run.competition;
  switch (rule) {
    case '2023':
    default:
      return rule2023.calculateLineScoreManual(run);
  }
};

module.exports.calculateMazeScore = function (run) {
  const { rule } = run.competition;
  switch (rule) {
    case '2023':
    default:
      return rule2023.calculateMazeScore(run);
  }
};

module.exports.calculateMazeScoreManual = function (run) {
  const { rule } = run.competition;
  switch (rule) {
    case '2023':
    default:
      return rule2023.calculateMazeScoreManual(run);
  }
};
