const express = require('express');

const publicRouter = express.Router();
const privateRouter = express.Router();
const adminRouter = express.Router();
const { ObjectId } = require('mongoose').Types;
const logger = require('../../config/logger').mainLogger;
const { lineRun } = require('../../models/lineRun');
const auth = require('../../helper/authLevels');
const { ACCESSLEVELS } = require('../../models/user');
const competitiondb = require('../../models/competition');
const { review } = require('../../models/document');

const MINIMUM_REVIEWER = 5

publicRouter.get('/:competitionId/:leagueId', async function (req, res, next) {
  const competition = req.params.competitionId;
  const league = req.params.leagueId;

  if (!ObjectId.isValid(competition)) {
    return next();
  }
  if (!competitiondb.LINE_LEAGUES.includes(league)) {
    return next();
  }

  let competitionDb = await competitiondb.competition.findById(competition).lean().exec();
  let rankingMode = competitionDb.rankingMode;
  let sumGameNumber = competitionDb.ranking.find(r => r.league == league).num;

  let allRunsDb = await lineRun.find({
    competition: competition
  }).select("team score normalizationGroup LoPs rescueOrder nl isNL time")
  .populate([
    {
      path: 'team',
      select: 'name teamCode league'
    }
  ]).lean().exec();

  let allRunsLeague = allRunsDb.filter(r => r.team.league == league);

  if (competitiondb.NORMALIZED_RANKING_MODE.includes(rankingMode)) {
    let normGroups = allRunsLeague.map(r => r.normalizationGroup);
    normGroups = [...new Set(normGroups)];
    let maxScore = {};
    for (let n of normGroups) {
      maxScore[n] = Math.max(...allRunsLeague.filter(run => run.normalizationGroup == n).map(run => run.score))
    }
    allRunsLeague.map(run => {
      if (maxScore[run.normalizationGroup] == 0) run.normalizedScore = 0;
      else run.normalizedScore = run.score / maxScore[run.normalizationGroup];
    })
  }

  let teamRuns = {};
  for (let run of allRunsLeague) {
    if (teamRuns[run.team._id] == null) teamRuns[run.team._id] = { games: [] };
    teamRuns[run.team._id].games.push(run);
  }

  Object.keys(teamRuns).map(e => {
    teamRuns[e].gameSum = {};
    let bestRuns;
    if (competitiondb.NORMALIZED_RANKING_MODE.includes(rankingMode)) {
      teamRuns[e].games.sort(sortRunsNormalized)
      bestRuns = teamRuns[e].games.slice(0, sumGameNumber);
      teamRuns[e].gameSum.normalizedScore = sum(bestRuns.map(run => run.normalizedScore));
    } else {
      teamRuns[e].games.sort(sortRuns)
      bestRuns = teamRuns[e].games.slice(0, sumGameNumber);
      teamRuns[e].gameSum.score = sum(bestRuns.map(run => run.score));
    }

    // Mark used or not
    teamRuns[e].games.map((run, index) => {
      if (index < sumGameNumber) run.used = true;
      else run.used = false;
    })

    // Sum of the time
    teamRuns[e].gameSum.time = {};
    teamRuns[e].gameSum.time.minutes = sum(bestRuns.map(run => run.time.minutes));
    teamRuns[e].gameSum.time.seconds = sum(bestRuns.map(run => run.time.seconds));
    teamRuns[e].gameSum.time.minutes += teamRuns[e].gameSum.time.seconds / 60;
    teamRuns[e].gameSum.time.seconds %= 60;

    // Sum of the victims
    if (teamRuns[e].isNL) { //NL
      teamRuns[e].gameSum.victims = sum(bestRuns.map(run => run.nl.liveVictim.length + run.nl.deadVictim.length));
    } else { // WL
      teamRuns[e].gameSum.victims = sum(bestRuns.map(run => run.rescueOrder.length));
    }

    // Sum of the LoPs
    teamRuns[e].gameSum.lops = sum(bestRuns.map(run => sum(run.LoPs)));
  })

  res.status(200).send(teamRuns);
});

function sortRuns(a, b) {
  if (a.score == b.score) {
      if (a.time.minutes < b.time.minutes) {
          return -1
      } else if (a.time.minutes > b.time.minutes) {
          return 1
      } else if (a.time.seconds < b.time.seconds) {
          return -1
      } else if (a.time.seconds > b.time.seconds) {
          return 1
      } else {
          return 0
      }
  } else {
      return b.score - a.score
  }
}

function sortRunsNormalized(a, b) {
  if (a.normalizedScore == b.normalizedScore) {
      if (a.time.minutes < b.time.minutes) {
          return -1
      } else if (a.time.minutes > b.time.minutes) {
          return 1
      } else if (a.time.seconds < b.time.seconds) {
          return -1
      } else if (a.time.seconds > b.time.seconds) {
          return 1
      } else {
          return 0
      }
  } else {
      return b.normalizedScore - a.normalizedScore
  }
}

function sum(array) {
  if (array.length == 0) return 0;
  return array.reduce(function(a,b){
    return a + b;
  });
}

adminRouter.get('/:competitionId/:leagueId/document', async function (req, res, next) {
  const competition = req.params.competitionId;
  const league = req.params.leagueId;

  if (!ObjectId.isValid(competition)) {
    return next();
  }
  if (!competitiondb.LEAGUES.includes(league)) {
    return next();
  }

  if (!auth.authCompetition(req.user, competition, ACCESSLEVELS.ADMIN)) {
    return res.status(403).send("User access permission error");
  }

  // Retrieve review questions
  let competitionDb = await competitiondb.competition.findById(competition).lean().exec();
  if (competitionDb == null) return res.status(404).send("Could not find competition");
  let reviewQuestions = competitionDb.documents.leagues.find(d => d.league == league).review;

  // Retrieve all temas of the league
  let teamsDb = await competitiondb.team.find({
    competition: competition,
    league: league
  }).select("name teamCode country").lean().exec();
  console.log(teamsDb);
  let teamIds = teamsDb.map(t => t._id);

  // Retrieve all review results
  let reviewResults = await review.find({
    competition: competition,
    team: { $in: teamIds }
  }).lean().exec();
  console.log(reviewResults)

  // Questions list
  let questions = {};
  let weights = {};
  for (let block of reviewQuestions) {
    if (block.weight == 0) continue;
    weights[block._id] = block.weight;
    for (let question of block.questions) {
      if (question.type == "scale") {
        if (questions[block._id] == null) questions[block._id] = [];
        questions[block._id].push(question._id);
      }
    }
  }
  console.log(questions);

  let result = [];
  let blockScores = {};
  // Calculate team's document score
  for (let team of teamsDb) {
    let reviewTeam = reviewResults.filter(r => r.team.equals(team._id));
    let comments = {};
    for (let review of reviewTeam) {
      for (const [key, value] of Object.entries(review.comments)) {
        if (comments[key] == null) comments[key] = [];
        if (value == '') continue;
        comments[key].push(value);
      }
    }
    
    team.details = [];
    for (let blockId in questions) {
      let blockScore = 0;
      for (let questionId of questions[blockId]) {
        let ratings = comments[questionId].map(str => parseInt(str));
        let numReviewer = ratings.length;

        let score = 0;
        if (numReviewer >= MINIMUM_REVIEWER) {
          let min = Math.min(...ratings);
          let max = Math.max(...ratings);
          score = (sum(ratings) - min - max) / (numReviewer - 2);
        } else if (numReviewer > 0) {
          score = sum(ratings) / numReviewer;
        }
        blockScore += score;
      }
      team.details.push({
        blockId,
        score: blockScore
      })
      if (blockScores[blockId] == null) blockScores[blockId] = [];
      blockScores[blockId].push(blockScore);
    }

    result.push(team);
  }

  // Calculate normalized score
  for (let team of result) {
    let score = 0;
    for (let block of team.details) {
      let maxScore = Math.max(...blockScores[block.blockId]);
      if (maxScore == 0) block.normalizedScore = 0;
      else block.normalizedScore = block.score / maxScore;
      score += block.normalizedScore * weights[block.blockId];
    }
    team.score = score;
  }

  res.status(200).send(result);
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
