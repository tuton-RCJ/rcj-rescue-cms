//= =======================================================================
//                          Libraries
//= =======================================================================

const express = require('express');

const privateRouter = express.Router();
const adminRouter = express.Router();
const { ObjectId } = require('mongoose').Types;
const fs = require('fs');
const competitiondb = require('../../models/competition');
const logger = require('../../config/logger').mainLogger;

const signagedb = competitiondb.signage;

let socketIo;

module.exports.connectSocketIo = function (io) {
  socketIo = io;
};

privateRouter.get('/', function (req, res) {
  signagedb
    .find({})
    .lean()
    .exec(function (err, data) {
      if (err) {
        logger.error(err);
        res.status(400).send({
          msg: 'Could not get signage data',
          err: err.message,
        });
      } else {
        res.status(200).send(data);
      }
    });
});

adminRouter.get('/contentList/img', function (req, res, next) {
  fs.readdir(`${process.cwd()}/public/signage_content`, function (err, files) {
    if (err) throw err;
    const fileList = files.filter(function (file) {
      file = `${process.cwd()}/public/signage_content/${file}`;
      return (
        fs.statSync(file).isFile() &&
        (/.*\.jpg$/.test(file) ||
          /.*\.jpeg$/.test(file) ||
          /.*\.png$/.test(file) ||
          /.*\.gif$/.test(file))
      );
    });
    res.status(200).send(fileList);
  });
});

adminRouter.get('/contentList/mov', function (req, res, next) {
  fs.readdir(`${process.cwd()}/public/signage_content`, function (err, files) {
    if (err) throw err;
    const fileList = files.filter(function (file) {
      file = `${process.cwd()}/public/signage_content/${file}`;
      return (
        fs.statSync(file).isFile() &&
        (/.*\.mov$/.test(file) ||
          /.*\.mp4$/.test(file) ||
          /.*\.wmv$/.test(file) ||
          /.*\.webm$/.test(file))
      );
    });
    res.status(200).send(fileList);
  });
});

privateRouter.get('/:id', function (req, res, next) {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return next();
  }
  signagedb
    .findById(id)
    .lean()
    .exec(function (err, data) {
      if (err) {
        logger.error(err);
        res.status(400).send({
          msg: 'Could not get signage setting info',
          err: err.message,
        });
      } else {
        res.status(200).send(data);
      }
    });
});

privateRouter.get('/:id/refresh', function (req, res, next) {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return next();
  }
  if (socketIo !== undefined) {
    const date = new Date();
    logger.info(date);
    socketIo.sockets.in(`signage/${id}`).emit('time', date.getTime() + 5000);
    res.status(200).send({
      msg: 'Send refresh order',
      time: date.getTime() + 5000,
    });
    return;
  }
  res.status(400).send({
    msg: 'Socket server is now down',
  });
});

privateRouter.get('/:id/:cont', function (req, res, next) {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return next();
  }
  signagedb
    .findById(id)
    .select(req.params.cont)
    .exec(function (err, data) {
      if (err) {
        logger.error(err);
        res.status(400).send({
          msg: 'Could not get signage setting content',
          err: err.message,
        });
      } else {
        res.status(200).send(data);
      }
    });
});

adminRouter.post('/', function (req, res, next) {
  const sig = req.body;

  new signagedb({
    name: sig.name,
    content: sig.content,
    news: sig.news,
  }).save(function (err, data) {
    if (err) {
      logger.error(err);
      return res.status(400).send({
        msg: 'Error saving signage setting in db',
        err: err.message,
      });
    }
    // res.location("/api/runs/" + data._id)
    return res.status(201).send({
      err: 'New run has been saved',
      id: data._id,
    });
  });
});

adminRouter.put('/:id', function (req, res, next) {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return next();
  }

  const sig = req.body;

  signagedb.findById(id).exec(function (err, dbSig) {
    if (err) {
      logger.error(err);
      res.status(400).send({
        msg: 'Could not get signage',
        err: err.message,
      });
    } else if (dbSig) {
      dbSig.name = sig.name;
      dbSig.content = sig.content;
      dbSig.news = sig.news;

      dbSig.save(function (err) {
        if (err) {
          logger.error(err);
          return res.status(400).send({
            err: err.message,
            msg: 'Could not save change',
          });
        }
        return res.status(200).send({
          msg: 'Saved change',
        });
      });
    }
  });
});

adminRouter.delete('/:id', function (req, res, next) {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return next();
  }

  signagedb.deleteOne(
    {
      _id: id,
    },
    function (err) {
      if (err) {
        logger.error(err);
        res.status(400).send({
          msg: 'Could not remove signage setting',
          err: err.message,
        });
      } else {
        res.status(200).send({
          msg: 'Signage setting has been removed!',
        });
      }
    }
  );
});

privateRouter.all('*', function (req, res, next) {
  next();
});
adminRouter.all('*', function (req, res, next) {
  next();
});

module.exports.private = privateRouter;
module.exports.admin = adminRouter;
