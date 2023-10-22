const logger = require('../config/logger').mainLogger;
const rule2023 = require('./scoreSheetPDFLine2-2023');
const rule2024 = require('./scoreSheetPDFLine2-2024');

module.exports.generateScoreSheet = function (res, runs) {
  let rule;
  if (runs.length > 0) {
    rule = runs[0].competition.rule;
  }
  switch (rule) {
    case '2024':
      return rule2024.generateScoreSheet(res, runs);
    case '2023':
    default:
      return rule2023.generateScoreSheet(res, runs);
  }
};
