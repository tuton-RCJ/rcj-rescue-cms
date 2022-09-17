const logger = require('../config/logger').mainLogger;
const rule2023 = require('./scoreSheetPDFLine2-2023');

module.exports.generateScoreSheet = function (res, runs) {
  let rule;
  if (runs.length > 0) {
    rule = runs[0].competition.rule;
  }
  switch (rule) {
    case '2023':
    default:
      return rule2023.generateScoreSheet(res, runs);
  }
};
