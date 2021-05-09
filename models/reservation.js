const mongoose = require('mongoose')
const validator = require('validator')
const Schema = mongoose.Schema
const ObjectId = Schema.Types.ObjectId
const competitiondb = require('./competition');
const {LEAGUES} = competitiondb;

const logger = require('../config/logger').mainLogger

const reservationSchema = new Schema({
  competition: {type: ObjectId, ref: 'Competition'},
  league: [{type: String, enum: LEAGUES}],
  team: [{type: ObjectId, ref: 'Team'}],
  name: {type: String, default: ""},
  description: {type: String, default: ""},
  myDescription: {type: String, default: ""},
  deadline: {type: Date, default: Date.now},
  enable: {type: Boolean, default: false},
  slot: [{
    slotId: {type: String, unique: true},
    start: {type: Date},
    duration: {type: Number, default: 15},
    max: {type: Number, default: 1},
    booked: [{type: ObjectId, ref: 'Team'}]
  }]
})


const reservation = mongoose.model('reservation', reservationSchema)

/** Mongoose model {@link http://mongoosejs.com/docs/models.html} */
module.exports.reservation = reservation
