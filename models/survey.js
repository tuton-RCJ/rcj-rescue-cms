const mongoose = require('mongoose')
const validator = require('validator')
const Schema = mongoose.Schema
const ObjectId = Schema.Types.ObjectId
const competitiondb = require('./competition');
const {LEAGUES} = competitiondb;
const QUESTION_TYPES = ['explanationOnly', 'input', 'select', 'scale', 'file', 'teamVote'];

const logger = require('../config/logger').mainLogger


const surveySchema = new Schema({
  competition: {type: ObjectId, ref: 'Competition'},
  i18n:[{
    language : {type: String, default: ''},
    name: {type: String, default: ''},
    topDescription: {type: String, default: ""},
    myDescription: {type: String, default: ""},
  }],
  league: [{type: String, enum: LEAGUES}],
  team: [{type: ObjectId, ref: 'Team'}],
  open: {type: Date, default: Date.now},
  deadline: {type: Date, default: Date.now},
  enable: {type: Boolean, default: false},
  reEdit: {type: Boolean, default: false},
  languages: [{
    language: {type: String, default: ''},
    enable: {type: Boolean, default: true}
  }],
  questions: [{
    questionId: {type: String, unique: true},
    type: {type: String, enum: QUESTION_TYPES},
    scale: {
      least: {type: Number, default: 1},
      most: {type: Number, default: 5}
    },
    teamVote: {
      league: [{type: String, enum: LEAGUES}]
    },
    i18n:[{
      language : {type: String, default: ''},
      title: {type: String, default: ''},
      description: {type: String, default: ''},
      options: [{
        value: {type: String, default: ''},
        text: {type: String, default: ''}
      }]
    }]
  }]
})

surveySchema.pre('deleteOne', function (next) {
  surveyAnswer.deleteMany({ survey: this._id }, next);
});
surveySchema.pre('deleteMany', function (next) {
  surveyAnswer.deleteMany({ survey: this._conditions._id }, next);
});

const surveyAnswerSchema = new Schema({
  competition: {type: ObjectId, ref: 'Competition'},
  team: {type: ObjectId, ref: 'Team'},
  survey: {type: ObjectId, ref: 'survey'},
  answer:[{
    questionId: {type: String},
    answer: {type: String, default: null}
  }],
  fixed: {type: Boolean, default: false}
})


const survey = mongoose.model('survey', surveySchema)
const surveyAnswer = mongoose.model('surveyAnswer', surveyAnswerSchema)


/** Mongoose model {@link http://mongoosejs.com/docs/models.html} */
module.exports.survey = survey
module.exports.surveyAnswer = surveyAnswer
