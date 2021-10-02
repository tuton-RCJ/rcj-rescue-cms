const logger = require('../config/logger').mainLogger;
const rule2022 = require('./scoreCalculator-2022');

module.exports.calculateLineScore = function (run) {
  const { rule } = run.competition;
  switch (rule) {
    case '2022':
    default:
      return rule2022.calculateLineScore(run);
  }
};

module.exports.calculateLineScoreManual = function (run) {
  const { rule } = run.competition;
  switch (rule) {
    case '2022':
    default:
      return rule2022.calculateLineScoreManual(run);
  }
};

module.exports.calculateMazeScore = function (run) {
  const { rule } = run.competition;
  switch (rule) {
    case '2022':
    default:
      return rule2022.calculateMazeScore(run);
  }
};

module.exports.calculateMazeScoreManual = function (run) {
  const { rule } = run.competition;
  switch (rule) {
    case '2022':
    default:
      return rule2022.calculateMazeScoreManual(run);
  }
};
