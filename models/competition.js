const mongoose = require('mongoose')
const validator = require('validator')
const Schema = mongoose.Schema
const ObjectId = Schema.Types.ObjectId
const crypto = require('crypto')
const cluster = require('cluster')

const logger = require('../config/logger').mainLogger
const env = require('node-env-file')
env('process.env')

const LEAGUES_JSON = require('../leagues')

let LINE_LEAGUES = [];
let MAZE_LEAGUES = [];
let OTHER_LEAGUES = [];

for(let i in LEAGUES_JSON){
  if(LEAGUES_JSON[i].type == "line") LINE_LEAGUES.push(LEAGUES_JSON[i].id);
  if(LEAGUES_JSON[i].type == "maze") MAZE_LEAGUES.push(LEAGUES_JSON[i].id);
  if(LEAGUES_JSON[i].type == "other") OTHER_LEAGUES.push(LEAGUES_JSON[i].id);
}

if(cluster.isMaster){
  logger.debug("Available line leagues : " + LINE_LEAGUES);
  logger.debug("Available maze leagues : " + MAZE_LEAGUES);
  logger.debug("Available other leagues : " + OTHER_LEAGUES);
}

const SUPPORT_RULES = ["2023"];

const LEAGUES = [].concat(LINE_LEAGUES, MAZE_LEAGUES, OTHER_LEAGUES);

module.exports.LINE_LEAGUES = LINE_LEAGUES;
module.exports.MAZE_LEAGUES = MAZE_LEAGUES;
module.exports.LEAGUES = LEAGUES;
module.exports.LEAGUES_JSON = LEAGUES_JSON;

const QUESTION_TYPES = ['input', 'select', 'scale', 'picture', 'movie', 'pdf', 'zip', 'run'];

const SUM_OF_BEST_N_GAMES = "SUM_OF_BEST_N_GAMES"
const MEAN_OF_NORMALIZED_BEST_N_GAMES = "MEAN_OF_NORMALIZED_BEST_N_GAMES"
const MEAN_OF_NORMALIZED_BEST_N_GAMES_NORMALIZED_DOCUMENT = "MEAN_OF_NORMALIZED_BEST_N_GAMES_NORMALIZED_DOCUMENT"

const NON_NORMALIZED_RANKING_MODE = [SUM_OF_BEST_N_GAMES];
const NORMALIZED_RANKING_MODE = [MEAN_OF_NORMALIZED_BEST_N_GAMES, MEAN_OF_NORMALIZED_BEST_N_GAMES_NORMALIZED_DOCUMENT];
const RANKING_MODE = [].concat(NON_NORMALIZED_RANKING_MODE, NORMALIZED_RANKING_MODE);
const DOCUMENT_RANKING = [MEAN_OF_NORMALIZED_BEST_N_GAMES_NORMALIZED_DOCUMENT];

module.exports.NON_NORMALIZED_RANKING_MODE = NON_NORMALIZED_RANKING_MODE;
module.exports.NORMALIZED_RANKING_MODE = NORMALIZED_RANKING_MODE;
module.exports.RANKING_MODE = RANKING_MODE;
module.exports.DOCUMENT_RANKING = DOCUMENT_RANKING;
module.exports.SUM_OF_BEST_N_GAMES = SUM_OF_BEST_N_GAMES;
module.exports.MEAN_OF_NORMALIZED_BEST_N_GAMES = MEAN_OF_NORMALIZED_BEST_N_GAMES;
module.exports.MEAN_OF_NORMALIZED_BEST_N_GAMES_NORMALIZED_DOCUMENT = MEAN_OF_NORMALIZED_BEST_N_GAMES_NORMALIZED_DOCUMENT;

/**
 *
 *@constructor
 *
 * @param {String} username - The username
 * @param {String} password - The password
 * @param {String} salt - The salt used, unique for every user
 * @param {Boolean} admin - If the user is admin or not
 */


const competitionSchema = new Schema({
  name: {type: String, unique: true},
  rule: {type: String, enum: SUPPORT_RULES},
  logo: {type: String, default: "/images/noLogo.png"},
  bkColor: {type: String, default: "#fff"},
  color: {type: String, default: "#000"},
  message: {type: String, default: ""},
  description: {type: String, default: ""},
  ranking: [{
    'league': {type: String, enum: LEAGUES},
    'num': {type: Number, default: 20}
  }],
  discloseRanking: {type: Boolean, default: false},
  rankingMode: {type: String, enum: RANKING_MODE, default: RANKING_MODE[0]},
  publicToken: {type: String, default: function(){
    return crypto.randomBytes(16).reduce((p, i) => p + (i % 32).toString(32), '')
  }, select: false},
  documents: {
    enable: {type: Boolean,  default: false},
    deadline: {type: Number, default: 0},
    leagues: [{
      'league': {type: String, enum: LEAGUES},
      'languages': [{
        'language': {type: String, default: ''},
        'enable': {type: Boolean, default: true}
      }],
      'notifications':[{
        'color' : {type: String, default: '273c75'},
        'bkColor' : {type: String, default: 'ccffff'},
        'i18n':[{
          'language' : {type: String, default: ''},
          'title' : {type: String, default: ''},
          'description' : {type: String, default: ''}
        }]
      }],
      'blocks': [{
        'i18n':[{
          'language' : {type: String, default: ''},
          'title': {type: String, default: ''},
        }],
        'color': {type: String, default: '2980b9'},
        'questions': [{
          'i18n':[{
            'language' : {type: String, default: ''},
            'question': {type: String, default: ''},
            'description': {type: String, default: ''},
            'example': {type: String, default: ''},
            'options': [{
              'value': {type: String, default: ''},
              'text': {type: String, default: ''}
            }]
          }],
          'type': {type: String, enum: QUESTION_TYPES},
          'required': {type: Boolean, default: true},
          'public': {type: Boolean, default: false},
          'fileName': {type: String, default: ''},
          'scale': {
            'least': {type: Number, default: 1},
            'most': {type: Number, default: 5}
          }
        }]
      }],
      'review': [{
        'i18n':[{
          'language' : {type: String, default: ''},
          'title': {type: String, default: ''},
        }],
        'color': {type: String, default: '2980b9'},
        'weight': {type: Number, default: 0, min: 0, max: 1},
        'questions': [{
          'i18n':[{
            'language' : {type: String, default: ''},
            'question': {type: String, default: ''},
            'description': {type: String, default: ''},
            'example': {type: String, default: ''},
            'options': [{
              'value': {type: String, default: ''},
              'text': {type: String, default: ''}
            }]
          }],
          'type': {type: String, enum: QUESTION_TYPES},
          'required': {type: Boolean, default: true},
          'fileName': {type: String, default: ''},
          'scale': {
            'least': {type: Number, default: 1},
            'most': {type: Number, default: 5}
          },
          'runReview': {
            'round': [{type: ObjectId, ref: 'Round'}],
            'map': [{type: ObjectId}],
            'movie': {type: String, default: ''}
          }
        }]
      }]
    }]
  },
  registration: {
    type: [new Schema({
      'league': {type: String, enum: LEAGUES},
      'enable': {type: Boolean,  default: false},
      'deadline': {type: Number, default: 0},
      'passCode': {type: String, default: function(){
        return crypto.randomBytes(8).toString('base64').substring(0, 8);
      }}
    })],
    default: [],
    select: false
  },
  consentForm: {type: String, default: ""}
})

competitionSchema.pre('deleteMany', function (next) {
  Round.deleteMany({ competition: this._conditions._id }, next);
  Team.deleteMany({ competition: this._conditions._id }, next);
  Field.deleteMany({ competition: this._conditions._id }, next);
  require('./document').review.deleteMany({ competition: this._conditions._id }, next);
  require('./lineMap').lineMap.deleteMany({ competition: this._conditions._id }, next);
  require('./lineRun').lineRun.deleteMany({ competition: this._conditions._id }, next);
  require('./mazeMap').mazeMap.deleteMany({ competition: this._conditions._id }, next);
  require('./mazeRun').mazeRun.deleteMany({ competition: this._conditions._id }, next);
  require('./mail').mail.deleteMany({ competition: this._conditions._id }, next);
  require('./mail').mailAuth.deleteMany({ competition: this._conditions._id }, next);
  require('./reservation').reservation.deleteMany({ competition: this._conditions._id }, next);
  require('./survey').survey.deleteMany({ competition: this._conditions._id }, next);
  require('./survey').surveyAnswer.deleteMany({ competition: this._conditions._id }, next);
});

competitionSchema.pre('deleteOne', function (next) {
  Round.deleteMany({ competition: this._id }, next);
  Team.deleteMany({ competition: this._id }, next);
  Field.deleteMany({ competition: this._id }, next);
  require('./document').review.deleteMany({ competition: this._id }, next);
  require('./lineMap').lineMap.deleteMany({ competition: this._id }, next);
  require('./lineRun').lineRun.deleteMany({ competition: this._id }, next);
  require('./mazeMap').mazeMap.deleteMany({ competition: this._id }, next);
  require('./mazeRun').mazeRun.deleteMany({ competition: this._id }, next);
  require('./mail').mail.deleteMany({ competition: this._id }, next);
  require('./mail').mailAuth.deleteMany({ competition: this._id }, next);
  require('./reservation').reservation.deleteMany({ competition: this._id }, next);
  require('./survey').survey.deleteMany({ competition: this._id }, next);
  require('./survey').surveyAnswer.deleteMany({ competition: this._id }, next);
});

const signageSchema = new Schema({
  name       : {type: String, required: true},
  content :[{
      duration: {type: Number, required: true},
      type: {type: String, required: true},
      url: {type: String, required: true},
      group : {type: String , default: '0'},
      disable: {type: Boolean, default: false}
  }],
  news : {type: [String]}
})

signageSchema.pre('save', function (next) {
  const self = this
  if (self.isNew) {
    Signage.findOne({
      name       : self.name
    }, function (err, dbSignage) {
      if (err) {
        return next(err)
      } else if (dbSignage) {
        err = new Error('Signage setting with name "' + self.name + '" already exists!')
        return next(err)
      } else {
        return next()
      }
    })
  } else {
    return next()
  }
})

const roundSchema = new Schema({
  competition: {
    type    : ObjectId,
    ref     : 'Competition',
    required: true,
    index   : true
  },
  name       : {type: String, required: true},
  league     : {type: String, enum: LEAGUES, required: true, index: true}
})

roundSchema.pre('save', function (next) {
  const self = this
  if (self.isNew) {
    Round.findOne({
      competition: self.competition,
      name       : self.name,
      league     : self.league
    }, function (err, dbRound) {
      if (err) {
        return next(err)
      } else if (dbRound) {
        err = new Error('Round with name "' + self.name + '" already exists!')
        return next(err)
      } else {
        return next()
      }
    })
  } else {
    return next()
  }
})

const teamSchema = new Schema({
  competition: {
    type    : ObjectId,
    ref     : 'Competition',
    required: true,
    index   : true
  },
  name       : {type: String, required: true},
  league     : {type: String, enum: LEAGUES, required: true, index: true},
  inspected  : {type: Boolean, default: false},
  docPublic  : {type: Boolean, default: false},
  country    : {type: String, default: ""},
  checkin    : {type: Boolean, default: false},
  teamCode   : {type: String, default: ""},
  email      : {type: [String], default: [], select: false},
  members    : {
    type: new Schema([{
      name : {type: String, default: ''},
      birthDay: {type: Number, default: 0},
      agreement: {type: Boolean, default: false}
    }]),
    select: false
  },
  document   : {
    type: new Schema({
      deadline : {type: String, default: null},
      enabled  : {type: Boolean, default: true},
      public  : {type: Boolean, default: false},
      token    : {type: String, default: ''},
      answers  : {type: Map, of: String}
    }),
    select: false
  }
})

teamSchema.pre('deleteOne', function (next) {
  require('./document').review.deleteMany({ team: this._id }, next);
  require('./lineRun').lineRun.deleteMany({ team: this._id }, next);
  require('./mazeRun').mazeRun.deleteMany({ team: this._id }, next);
  require('./mail').mail.deleteMany({ team: this._id }, next);
  require('./survey').surveyAnswer.deleteMany({ team: this._id }, next);
});

teamSchema.pre('deleteMany', function (next) {
  require('./document').review.deleteMany({ team: this._conditions._id }, next);
  require('./lineRun').lineRun.deleteMany({ team: this._conditions._id }, next);
  require('./mazeRun').mazeRun.deleteMany({ team: this._conditions._id }, next);
  require('./mail').mail.deleteMany({ team: this._conditions._id }, next);
  require('./survey').surveyAnswer.deleteMany({ team: this._conditions._id }, next);
});


const fieldSchema = new Schema({
  competition: {
    type    : ObjectId,
    ref     : 'Competition',
    required: true,
    index   : true
  },
  name       : {type: String, required: true},
  league     : {type: String, enum: LEAGUES, required: true, index: true}
})

fieldSchema.pre('save', function (next) {
  const self = this
  if (self.isNew) {
    Field.findOne({
      competition: self.competition,
      name       : self.name,
      league     : self.league
    }, function (err, dbField) {
      if (err) {
        next(err)
      } else if (dbField) {
        err = new Error('Field with name "' + self.name + '" already exists!')
        next(err)
      } else {
        next()
      }
    })
  } else {
    next()
  }
})


const Competition = mongoose.model('Competition', competitionSchema)
const Signage = mongoose.model('Signage', signageSchema)
const Round = mongoose.model('Round', roundSchema)
const Team = mongoose.model('Team', teamSchema)
const Field = mongoose.model('Field', fieldSchema)

/** Mongoose model {@link http://mongoosejs.com/docs/models.html} */
module.exports.competition = Competition
module.exports.signage = Signage
module.exports.round = Round
module.exports.team = Team
module.exports.field = Field
