#!/usr/bin/env node

const cluster = require('cluster')
const  socketio = require('socket.io')
const { setupMaster, setupWorker } = require("@socket.io/sticky");
const redisAdapter = require("socket.io-redis");
const logger = require('./config/logger').mainLogger
const env = require('node-env-file')
const http = require('http')
var app = require('./app')


const fs = require("fs");
env('process.env');

function isExistFile(file) {
  try {
    fs.statSync(file);
    return true
  } catch(err) {
    if(err.code === 'ENOENT') return false
  }
}

if(isExistFile("mail.env")) env('mail.env');

const port = (parseInt(process.env.WEB_HOSTPORT, 10) || 80) + parseInt(process.env.NODE_APP_INSTANCE || 0);
app.set('port', port)

if (cluster.isMaster) {
  logger.info(`Master ${process.pid} is running`)
  const httpServer = http.createServer();
  setupMaster(httpServer, {
    loadBalancingMethod: "random", // either "random", "round-robin" or "least-connection"
  });
  httpServer.listen(port);
  httpServer.on('error', onError)

  for (var i = 0; i < process.env.PROCESS_NUM; i++) {
    cluster.fork()
  }

  cluster.on('exit', function(worker, code, signal) {
    // restart process
    logger.error('Worker ' + worker.process.pid + ' died')
    logger.info("Forking new child process")
    cluster.fork()
  })
}else {
  logger.info(`Worker ${process.pid} started`)
  
  const server = http.createServer(app)
  const io = new socketio.Server(server);

  if(process.env.REDIS_HOST && process.env.REDIS_PORT){
    io.adapter(redisAdapter({host: process.env.REDIS_HOST, port: process.env.REDIS_PORT}));
  }
  setupWorker(io);
  

  io.on('connection', function (socket) {
    socket.on('subscribe', function (data) {
      socket.join(data)
      logger.debug(`Process: ${process.pid} Client joined room: ${data}`)
    })
    socket.on('unsubscribe', function (data) {
      socket.leave(data)
      logger.debug(`Process: ${process.pid} Client detached room: ${data}`)
    })
  })

  require('./routes/api/lineRuns').connectSocketIo(io)
  require('./routes/api/mazeRuns').connectSocketIo(io)
  require('./routes/api/signage').connectSocketIo(io)
  require('./routes/api/kiosk').connectSocketIo(io)
  require('./routes/api/reservation').connectSocketIo(io)
}



function onError(error) {

  if (error.syscall !== 'listen') {
    throw error
  }

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.error('Port ' + port + ' requires elevated privileges')
      process.exit(1)
      break
    case 'EADDRINUSE':
      logger.error('Port ' + port + ' is already in use')
      process.exit(1)
      break
    default:
      throw error
  }
}