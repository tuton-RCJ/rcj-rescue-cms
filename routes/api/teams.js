//= =======================================================================
//                          Libraries
//= =======================================================================

const express = require('express');

const publicRouter = express.Router();
const privateRouter = express.Router();
const adminRouter = express.Router();
const { ObjectId } = require('mongoose').Types;
const mkdirp = require('mkdirp');
const fs = require('fs');
const crypto = require('crypto');
const { ACCESSLEVELS } = require('../../models/user');
const logger = require('../../config/logger').mainLogger;
const competitiondb = require('../../models/competition');
const auth = require('../../helper/authLevels');

const { LEAGUES_JSON } = competitiondb;

const S = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const N = 32;

// publicRouter.get('/', function (req, res) {
//    query.doFindResultSortQuery(req, res, null, null, competitiondb.team)
// })

publicRouter.get('/leagues', function (req, res) {
  res.send(competitiondb.team.schema.path('league').enumValues);
});

publicRouter.get('/leagues/:league/:competitionId', async function (req, res) {
  const id = req.params.competitionId;
  const { league } = req.params;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  const result = await competitiondb.team.aggregate([
    {
      $match: {
        competition: { $eq: ObjectId(id) },
      },
    },
    {
      $group: {
        _id: '$league',
      },
    },
  ]);

  const ret = [];
  for (const i in result) {
    let name;
    let type;
    for (const j in LEAGUES_JSON) {
      if (LEAGUES_JSON[j].id == result[i]._id) {
        type = LEAGUES_JSON[j].type;
        name = LEAGUES_JSON[j].name;
        break;
      }
    }
    if (type == league || league == 'all') {
      const tmp = {
        id: result[i]._id,
        name,
        type,
      };
      ret.push(tmp);
    }
  }
  res.send(ret);
});

privateRouter.get('/code/:teamId/:code', function (req, res, next) {
  const id = req.params.teamId;
  const { code } = req.params;

  if (!ObjectId.isValid(id)) {
    return next();
  }
  competitiondb.team
    .findOne(
      {
        _id: id,
        code,
      },
      '_id inspected name league competition'
    )
    .exec(function (err, dbTeam) {
      if (err) {
        logger.error(err);
        res.status(400).send({
          msg: 'Could not get team',
          err: err.message,
        });
      } else {
        res.send(dbTeam);
      }
    });
});

adminRouter.get('/set/:teamId/:teamCode', function (req, res, next) {
  const team = req.params.teamId;
  const code = req.params.teamCode;

  if (!ObjectId.isValid(team)) {
    return next();
  }

  competitiondb.team.findById(team).exec(function (err, dbTeam) {
    if (err) {
      logger.error(err);
      res.status(400).send({
        msg: 'Could not get user',
        err: err.message,
      });
    } else if (dbTeam) {
      dbTeam.teamCode = code;

      dbTeam.save(function (err) {
        if (err) {
          logger.error(err);
          return res.status(400).send({
            err: err.message,
            msg: 'Could not save changes',
          });
        }
        res.status(200).send({
          msg: 'Saved changes',
        });
      });
    }
  });
});

publicRouter.get('/:teamid', function (req, res, next) {
  const id = req.params.teamid;

  if (!ObjectId.isValid(id)) {
    return next();
  }
  competitiondb.team
    .findOne(
      {
        _id: id,
      },
      '_id inspected name teamCode league competition checkin country'
    )
    .exec(function (err, dbTeam) {
      if (err) {
        logger.error(err);
        res.status(400).send({
          msg: 'Could not get team',
          err: err.message,
        });
      } else {
        res.send(dbTeam);
      }
    });
});

privateRouter.put('/:competitionid/:teamid', function (req, res, next) {
  const id = req.params.teamid;
  const { competitionid } = req.params;
  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (!auth.authCompetition(req.user, competitionid, ACCESSLEVELS.JUDGE)) {
    res.status(401).send({
      msg: 'You have no authority to access this api',
    });
    return next();
  }

  const team = req.body;

  competitiondb.team
    .findOne({
      _id: id,
      competition: competitionid,
    })
    .exec(function (err, dbTeam) {
      if (err) {
        logger.error(err);
        res.status(400).send({
          msg: 'Could not get user',
          err: err.message,
        });
      } else if (dbTeam) {
        if (team.interviewer != null) dbTeam.interviewer = team.interviewer;
        if (team.comment != null) dbTeam.comment = team.comment;
        if (team.inspected != null) dbTeam.inspected = team.inspected;
        if (team.docPublic != null) dbTeam.docPublic = team.docPublic;
        if (team.checkin != null) dbTeam.checkin = team.checkin;
        if (team.code != null) dbTeam.teamCode = team.code;

        if (auth.authCompetition(req.user, competitionid, ACCESSLEVELS.ADMIN)) {
          if (team.name != null) dbTeam.name = team.name;
          if (team.teamCode != null) dbTeam.teamCode = team.teamCode;
          if (team.league != null) dbTeam.league = team.league;
          if (team.country != null) dbTeam.country = team.country;
          if (team.email != null) dbTeam.email = team.email;
        }

        dbTeam.save(function (err) {
          if (err) {
            logger.error(err);
            return res.status(400).send({
              err: err.message,
              msg: 'Could not save changes',
            });
          }
          return res.status(200).send({
            msg: 'Saved changes',
          });
        });
      }
    });
});

publicRouter.get('/:teamid/runs', function (req, res, next) {
  const id = req.params.teamid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  competitiondb.run.find(
    {
      team: id,
    },
    function (err, data) {
      if (err) {
        logger.error(err);
        return res.status(400).send({
          msg: 'Could not get runs',
          err: err.message,
        });
      }
      return res.status(200).send(data);
    }
  );
});

adminRouter.delete('/:teamid', function (req, res, next) {
  const ids = req.params.teamid.split(',');
  if (!ObjectId.isValid(ids[0])) {
    return next();
  }
  competitiondb.team
    .findById(ids[0])
    .select('competition')
    .exec(function (err, dbTeam) {
      if (err) {
        logger.error(err);
        res.status(400).send({
          msg: 'Could not get team',
          err: err.message,
        });
      } else if (dbTeam) {
        if (
          !auth.authCompetition(
            req.user,
            dbTeam.competition,
            ACCESSLEVELS.ADMIN
          )
        ) {
          return res.status(401).send({
            msg: 'You have no authority to access this api',
          });
        }
      }
      competitiondb.team.deleteMany(
        {
          _id: {
            $in: ids,
          },
          competition: dbTeam.competition,
        },
        function (err) {
          if (err) {
            logger.error(err);
            res.status(400).send({
              msg: 'Could not remove team',
              err: err.message,
            });
          } else {
            res.status(200).send({
              msg: 'Team has been removed!',
            });
            for (const id of ids) {
              let path = `${__dirname}/../../documents/${dbTeam.competition}/${id}`;
              fs.rmdir(path, { recursive: true }, (err) => {
                if (err) throw err;
              });
              path = `${__dirname}/../../cabinet/${dbTeam.competition}/${id}`;
              fs.rmdir(path, { recursive: true }, (err) => {
                if (err) throw err;
              });
            }
          }
        }
      );
    });
});

adminRouter.post('/', function (req, res) {
  const team = req.body;

  competitiondb.competition
    .findOne({
      _id: team.competition,
    })
    .exec(function (err, dbComp) {
      if (err) {
        logger.error(err);
      } else if (dbComp) {
        const newTeam = new competitiondb.team({
          name: team.name,
          league: team.league,
          competition: team.competition,
          teamCode: team.teamCode,
          country: team.country,
          document: {
            token: Array.from(crypto.randomFillSync(new Uint8Array(N)))
              .map((n) => S[n % S.length])
              .join(''),
            answers: [],
          },
          email: team.email,
        });

        newTeam.save(function (err, data) {
          if (err) {
            logger.error(err);
            res.status(400).send({
              msg: 'Error saving team',
              err: err.message,
            });
          } else {
            res.location(`/api/teams/${data._id}`);
            res.status(201).send({
              msg: 'New team has been saved',
              id: data._id,
            });
            let path = `${__dirname}/../../documents/${dbComp._id}/${data._id}`;
            mkdirp.sync(path);
            path = `${__dirname}/../../cabinet/${dbComp._id}/${data._id}`;
            mkdirp.sync(path);
          }
        });
      }
    });
});

adminRouter.post('/bulk', function (req, res) {
  const teams = req.body;

  competitiondb.competition
    .findOne({
      _id: teams[0].competition,
    })
    .exec(function (err, dbComp) {
      if (err) {
        logger.error(err);
      } else if (dbComp) {
        let count = teams.length;
        let responseSent = false;
        for (const team of teams) {
          const newTeam = new competitiondb.team({
            name: team.name,
            league: team.league,
            competition: team.competition,
            teamCode: team.teamCode,
            country: team.country,
            document: {
              token: Array.from(crypto.randomFillSync(new Uint8Array(N)))
                .map((n) => S[n % S.length])
                .join(''),
              answers: [],
            },
            email: team.email,
          });

          newTeam.save(function (err, data) {
            if (err) {
              logger.error(err);
              if (!responseSent) {
                responseSent = true;
                res.status(400).send({
                  message: 'Error saving team',
                  error: err.message,
                });
              }
            } else {
              const path = `${__dirname}/../../documents/${dbComp._id}/${data._id}`;
              mkdirp.sync(path);
              count--;
              if (count <= 0) {
                if (!responseSent) {
                  responseSent = true;
                  res.location(`/api/teams/${data._id}`);
                  res.status(201).send({
                    message: 'New teams have been saved',
                  });
                }
              }
            }
          });
        }
      }
    });
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
