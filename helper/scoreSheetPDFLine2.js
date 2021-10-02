const logger = require('../config/logger').mainLogger;
const rule2022 = require('./scoreSheetPDFLine2-2022');

module.exports.generateScoreSheet = function (res, runs) {
  let rule;
  if (runs.length > 0) {
    rule = runs[0].competition.rule;
  }
  switch (rule) {
    case '2022':
    default:
      return rule2022.generateScoreSheet(res, runs);
  }
};
