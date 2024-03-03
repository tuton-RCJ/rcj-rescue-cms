"use strict"
const mongoose = require('mongoose')
const timestamps = require('mongoose-timestamp')
const Schema = mongoose.Schema
const ObjectId = Schema.Types.ObjectId
const async = require('async')

const competitiondb = require('./competition')

const SIM_LEAGUES = require("./competition").SIM_LEAGUES

const simRunSchema = new Schema({
  competition: {
    type    : ObjectId,
    ref     : 'Competition',
    required: true,
    index   : true
  },
  round             : {type: ObjectId, ref: 'Round', required: true, index: true},
  field             : {type: ObjectId, ref: 'Field', required: true, index: true},
  team              : {type: ObjectId, ref: 'Team', required: false, index: true},
  normalizationGroup: {type: String, index: true},
  score             : {type: Number, min: -1000, default: 0},
  time              : {
    minutes: {type: Number, min: 0, max: 10, default: 0},
    seconds: {type: Number, min: 0, max: 59, default: 0},
  },
  status            : {type: Number, min: -1, default: 0},
  sign              : {
    captain   : {type: String, default: ""},
    referee   : {type: String, default: ""},
    referee_as: {type: String, default: ""}
  },
  started           : {type: Boolean, default: false, index: true},
  comment           : {type: String, default: ""},
  startTime         : {type: Number, default: 0}
});

simRunSchema.pre('save', function (next) {
  const self = this

  if (self.isNew) {
    if(self.team){
      SimRun.findOne({
        round: self.round,
        team : self.team
      }).populate("round team").exec(function (err, dbRun) {
        if (err) {
          return next(err)
        } else if (dbRun) {
          err = new Error('Team "' + dbRun.team.name +
                          '" already has a run in round "' +
                          dbRun.round.name +
                          '"!')
          return next(err)
        } else {
          // Check that all references matches
          async.parallel({
              competition: function (callback) {
                competitiondb.competition.findById(self.competition, function (err, dbCompetition) {
                  if (err) {
                    return callback(err)
                  } else if (!dbCompetition) {
                    return callback(new Error("No competition with that id!"))
                  } else {
                    return callback(null, dbCompetition)
                  }
                })
              },
              round      : function (callback) {
                competitiondb.round.findById(self.round, function (err, dbRound) {
                  if (err) {
                    return callback(err)
                  } else if (!dbRound) {
                    return callback(new Error("No round with that id!"))
                  } else {
                    return callback(null, dbRound)
                  }
                })
              },
              team       : function (callback) {
                competitiondb.team.findById(self.team, function (err, dbTeam) {
                  if (err) {
                    return callback(err)
                  } else if (!dbTeam) {
                    return callback(new Error("No team with that id!"))
                  } else {
                    return callback(null, dbTeam)
                  }
                })
              },
              field      : function (callback) {
                competitiondb.field.findById(self.field, function (err, dbField) {
                  if (err) {
                    return callback(err)
                  } else if (!dbField) {
                    return callback(new Error("No field with that id!"))
                  } else {
                    return callback(null, dbField)
                  }
                })
              }
            },
            function (err, results) {
              if (err) {
                return next(err)
              } else {
                const competitionId = results.competition.id

                if (results.round.competition != competitionId) {
                  return next(new Error("Round does not match competition!"))
                }
                if (results.team.competition != competitionId) {
                  return next(new Error("Team does not match competition!"))
                }
                if (results.field.competition != competitionId) {
                  return next(new Error("Field does not match competition!"))
                }
                return next()
              }
            })
        }
      })
  } else {
    async.parallel({
        competition: function (callback) {
          competitiondb.competition.findById(self.competition, function (err, dbCompetition) {
            if (err) {
              return callback(err)
            } else if (!dbCompetition) {
              return callback(new Error("No competition with that id!"))
            } else {
              return callback(null, dbCompetition)
            }
          })
        },
        round      : function (callback) {
          competitiondb.round.findById(self.round, function (err, dbRound) {
            if (err) {
              return callback(err)
            } else if (!dbRound) {
              return callback(new Error("No round with that id!"))
            } else {
              return callback(null, dbRound)
            }
          })
        },
        field      : function (callback) {
          competitiondb.field.findById(self.field, function (err, dbField) {
            if (err) {
              return callback(err)
            } else if (!dbField) {
              return callback(new Error("No field with that id!"))
            } else {
              return callback(null, dbField)
            }
          })
        }
      },
      function (err, results) {
        if (err) {
          return next(err)
        } else {
          const competitionId = results.competition.id

          if (results.round.competition != competitionId) {
            return next(new Error("Round does not match competition!"))
          }
          if (results.field.competition != competitionId) {
            return next(new Error("Field does not match competition!"))
          }
          return next()
        }
      })
  }
} else {
  return next()
}
})


simRunSchema.plugin(timestamps)

const SimRun = mongoose.model('SimRun', simRunSchema)

/** Mongoose model {@link http://mongoosejs.com/docs/models.html} */
module.exports.simRun = SimRun
