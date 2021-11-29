// -*- tab-width: 2 -*-
const { ObjectId } = require('mongoose').Types;
const express = require('express');

const router = express.Router();
const auth = require('../helper/authLevels');
const { ACCESSLEVELS } = require('../models/user');
const ruleDetector = require('../helper/ruleDetector');
const competitiondb = require('../models/competition');

const { LEAGUES } = competitiondb;

/* GET home page. */
router.get('/', function (req, res) {
  res.render('admin_home', { user: req.user });
});

router.get('/user', function (req, res) {
  if (req.user.superDuperAdmin) res.render('admin_user', { user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/short', function (req, res) {
  if (req.user.superDuperAdmin) res.render('admin_short', { user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/restore', function (req, res) {
  res.render('admin_restore', { user: req.user });
});

router.get('/mailTemplates', function (req, res) {
  res.render('mail_templates', { user: req.user });
});

router.get('/mailTemplates/editor', function (req, res) {
  res.render('mail_template_editor', { user: req.user, subject: ""});
});

router.get('/mailTemplates/editor/:subject', function (req, res) {
  res.render('mail_template_editor', { user: req.user, subject: req.params.subject});
});

router.get('/:competitionid', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }
  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('competition_admin', {
      id,
      user: req.user,
      mailEnable: process.env.MAIL_SMTP,
    });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/mails', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }
  if (
    auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN) &&
    process.env.MAIL_SMTP
  )
    res.render('mail_home', {
      id,
      user: req.user,
      mailEnable: process.env.MAIL_SMTP,
    });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/mails/sent', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }
  if (
    auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN) &&
    process.env.MAIL_SMTP
  )
    res.render('mail_sent', {
      id,
      user: req.user,
      mailEnable: process.env.MAIL_SMTP,
    });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/teams', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('team_admin', { id, user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/checkin', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('team_checkin', { id, user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/teams/bulk', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('team_bulk', { id, user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/settings', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('admin_competition_settings', {
      competition_id: id,
      user: req.user,
    });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/backup', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('admin_competition_backup', {
      competition_id: id,
      user: req.user,
    });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/documents', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('documents_admin', { id, user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/documents/teams', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('documents_team_admin', { id, user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/documents/:lid/results', function (req, res, next) {
  const id = req.params.competitionid;
  const { lid } = req.params;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (
    LEAGUES.filter(function (elm) {
      return elm.indexOf(lid) != -1;
    }).length == 0
  ) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('documents_result', { id, lid, user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/documents/:lid/form', function (req, res, next) {
  const id = req.params.competitionid;
  const { lid } = req.params;

  if (
    LEAGUES.filter(function (elm) {
      return elm.indexOf(lid) != -1;
    }).length == 0
  ) {
    return next();
  }

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('documents_form_editor', { id, lid, user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/documents/:lid/review', function (req, res, next) {
  const id = req.params.competitionid;
  const { lid } = req.params;

  if (
    LEAGUES.filter(function (elm) {
      return elm.indexOf(lid) != -1;
    }).length == 0
  ) {
    return next();
  }

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('documents_review_editor', { id, lid, user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/documents/:lid/preview', function (req, res, next) {
  const id = req.params.competitionid;
  const { lid } = req.params;

  if (
    LEAGUES.filter(function (elm) {
      return elm.indexOf(lid) != -1;
    }).length == 0
  ) {
    return next();
  }

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('documents_form_preview', { id, lid, user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/application', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('application_admin', { id, user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/registration', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('registration/settings', { id, user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/reservation', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('reservation/list', { id, user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/reservation/edit', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('reservation/settings', { id, user: req.user, resvId: null });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/reservation/edit/:resvId', function (req, res, next) {
  const id = req.params.competitionid;
  const resvId = req.params.resvId;

  if (!ObjectId.isValid(id)) {
    return next();
  }
  if(!resvId){
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('reservation/settings', { id, user: req.user , resvId});
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/reservation/admin/:resvId/', function (req, res, next) {
  const id = req.params.competitionid;
  const resvId = req.params.resvId;

  if (!ObjectId.isValid(id)) {
    return next();
  }
  if(!resvId){
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('reservation/admin', { id, user: req.user , resvId});
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/cabinet', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('cabinet/admin', { id, user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/cabinet/:leagueTeam', function (req, res, next) {
  const id = req.params.competitionid;
  const leagueTeam = req.params.leagueTeam;

  if (!ObjectId.isValid(id)) {
    return next();
  }
  let isTeam = false;
  if (ObjectId.isValid(leagueTeam)) {
    isTeam = true;
  }else{
    if (LEAGUES.filter(function (elm) {return elm.indexOf(leagueTeam) != -1;}).length == 0) {
      return next();
    }
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('cabinet/file', { id, user: req.user, isTeam , leagueTeam, isMyPage: false, teamId: "null", token: "null"});
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/survey', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('survey/list', { id, user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/survey/edit', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('survey/edit', { id, user: req.user, survId: null });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/survey/edit/:survId', function (req, res, next) {
  const id = req.params.competitionid;
  const survId = req.params.survId;

  if (!ObjectId.isValid(id)) {
    return next();
  }
  if (!ObjectId.isValid(survId)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('survey/edit', { id, user: req.user , survId});
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/survey/answers/:survId', function (req, res, next) {
  const id = req.params.competitionid;
  const survId = req.params.survId;

  if (!ObjectId.isValid(id)) {
    return next();
  }
  if (!ObjectId.isValid(survId)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('survey/answers', { id, user: req.user , survId});
  else res.render('access_denied', { user: req.user });
});

router.get('/handover', function (req, res, next) {
  res.render('runs_handover', { user: req.user });
});

router.get('/:competitionid/line/runs', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('line_run_admin', { id, user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/line/runs/print/ranking/:league',
  function (req, res, next) {
    const id = req.params.competitionid;
    const { league } = req.params;

    if (!ObjectId.isValid(id)) {
      return next();
    }
    if (
      LEAGUES.filter(function (elm) {
        return elm == league;
      }).length == 0
    ) {
      return next();
    }

    competitiondb.competition
      .findOne({
        _id: id,
      })
      .lean()
      .exec(function (err, data) {
        if (err) {
          logger.error(err);
          res.status(400).send({
            msg: 'Could not get competition',
            err: err.message,
          });
        } else {
          let num = 20;
          for (const i in data.ranking) {
            if (data.ranking[i].league == league) {
              num = data.ranking[i].num;
              break;
            }
          }
          res.render('line_score_print', {
            id,
            user: req.user,
            league,
            num,
            get: req.query,
          });
        }
      });
  }
);

router.get('/:competitionid/line/runs/print', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('line_run_admin_print', { id, user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/line/runs/bulk', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('line_run_bulk', { id, user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/maze/runs/bulk', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('maze_run_bulk', { id, user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/line/maps', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('line_map_admin', { id, user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/maze/runs', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('maze_run_admin', { id, user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/maze/runs/print/ranking/:league',
  function (req, res, next) {
    const id = req.params.competitionid;
    const { league } = req.params;

    if (!ObjectId.isValid(id)) {
      return next();
    }
    if (
      LEAGUES.filter(function (elm) {
        return elm == league;
      }).length == 0
    ) {
      return next();
    }

    competitiondb.competition
      .findOne({
        _id: id,
      })
      .lean()
      .exec(function (err, data) {
        if (err) {
          logger.error(err);
          res.status(400).send({
            msg: 'Could not get competition',
            err: err.message,
          });
        } else {
          let num = 20;
          for (const i in data.ranking) {
            if (data.ranking[i].league == league) {
              num = data.ranking[i].num;
              break;
            }
          }
          res.render('maze_score_print', {
            id,
            user: req.user,
            league,
            num,
            get: req.query,
          });
        }
      });
  }
);

router.get('/:competitionid/maze/runs/print', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('maze_run_admin_print', { id, user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/maze/maps', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('maze_map_admin', { id, user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/maze/editor', async function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  const rule = await ruleDetector.getRuleFromCompetitionId(id);

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('maze_editor', { compid: id, user: req.user, rule });
  else res.render('access_denied', { user: req.user });
});

router.get(
  '/:competitionid/maze/editor/:mapid',
  async function (req, res, next) {
    const id = req.params.mapid;
    const cid = req.params.competitionid;

    if (!ObjectId.isValid(id)) {
      return next();
    }

    const rule = await ruleDetector.getRuleFromCompetitionId(cid);

    if (auth.authCompetition(req.user, cid, ACCESSLEVELS.ADMIN))
      res.render('maze_editor', {
        compid: cid,
        mapid: id,
        user: req.user,
        rule,
      });
    else res.render('access_denied', { user: req.user });
  }
);

router.get('/:competitionid/rounds', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('round_admin', { id, user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/line/editor', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('line_editor', { compid: id, user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/line/editor/:mapid', function (req, res, next) {
  const id = req.params.mapid;
  const cid = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }
  if (auth.authCompetition(req.user, cid, ACCESSLEVELS.ADMIN))
    res.render('line_editor', { compid: cid, mapid: id, user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/:competitionid/fields', function (req, res, next) {
  const id = req.params.competitionid;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  if (auth.authCompetition(req.user, id, ACCESSLEVELS.ADMIN))
    res.render('field_admin', { id, user: req.user });
  else res.render('access_denied', { user: req.user });
});

router.get('/line/tilesets', function (req, res, next) {
  res.render('tileset_admin', { user: req.user });
});

router.get('/kiosk/:kioskNum', function (req, res, next) {
  const num = req.params.kioskNum;

  res.render('kiosk', { num, user: req.user });
});

module.exports = router;
