#!/usr/bin/env node
const mongoose = require('mongoose');
const express = require('express');
const io = require('socket.io')(9955);
const app = express();

// mongoose.connect('mongodb://127.0.0.1:27017/sdrf', { useNewUrlParser: true});

// global vars *tmp
const clients = [];
const clientNames = [];
const execT = 2000;
let clientResponses = 0;

/**
 *  Set client configuration
 *  s: {socket}
 */
const setClient = (s) => {
  s.emit('setClient', {
    fqRange: '153M:153,3M',
    sampleRate: '1k',
    serverTime: new Date().getTime()
  });
};

/**
 * Adds client to the clients array so
 * it can be checked if messages has been received
 * name: {string} client name
 * msg: {string} msg
 */
const handleClientConnect = (name, msg, s) => {
  clientNames.push(name);
  console.log('connected: ', name);
  emitToOne('getSamples', name, s);
  s.name = name;
  clients.push(s);
};

// TODO keep a track which clients connected so later
// we can check if we have received a message from each 
// and send another sampling request
io.on('connection', (s) => {
  setClient(s);
  s.on('getSamples', (msg) => handleGetSamples(msg, s));
  s.on('onClientConnect', (name, msg) => handleClientConnect(name, msg, s));
  s.on('disconnect', () => {
    console.log('client disconnected.');
    clients.splice(clients.indexOf(s), 1);
    console.log('clients: ', s.name);
    clientNames.splice(clientNames.indexOf(s), 1);
  });
});

const smplReq = () => ({
  serverTime: new Date().getTime(),
  execT,
});

const emitToOne = (event, data, s) => {
  // TODO calc offset when to request new t or update execT
  s.emit(event, smplReq());
};

const emitToAll = async (event, data) => {
  // delay
  await new Promise(r => setTimeout(r, 7000));
  const req = smplReq();
  io.sockets.emit(event, req);
  console.log(`\n==================================
    emitting [${event}] event
    clients [${clients.map(c => c.name)}]
    server timestamp: ${req.serverTime}`);
};

/*
 * Object returning console.log
 * TODO saving to file etc 
 * err: (d: Any) info: (d: Any)
 */
const log = ({
  err: (d) => console.error(`\x1b[31m ERROR: \x1b[0m\n ${d}`),
  info: (d) => {
    // mmm
    return console.log(d);
  }
});

const toNum = (str) => {
   const n = Number(str.toString());
  if (!isNaN(n)) return n;
};

/* 
 * sampler returns an array of noise levels
 * raw: String
 */
const sampler = (raw) => {
  log.info(`sampling... raw length = [${raw.length}]`);
  const smpl = raw.match(/([-])\d+([.])\d{2}/g);
  const freqs = smpl.map(s => toNum(s));
  return freqs;
}

const handleGetSamples = (msg, s) => {
  const d = JSON.parse(msg.replace(/\r?\n|\r|\\n/g, ""));
  const { error, data, rx = data, ...props } = d;

  // TODO clients object with statuses or something
  clientResponses++; 

  error ?
    /* error handler */ () => 0 :
    samples = rx ? sampler(rx) : 'no data...';

  log.info({ props });

  // TODO call sockets.emit timer
  // different approach
  if (clientResponses === clients.length) { 
    clientResponses = 0;
    emitToAll('getSamples', 'yo'); 
  }
};

// root get 
app.get('/', (req, res) => {
  Freqs.find({}).sort('-createdAt').limit(20).exec((err, data) => {
    if (err) return res.send(err);
    // TODO should pick up a range from database with the range properties
    // such as range, low hz, high hz for visualizing it
    res.send(data);
  });
});

// listen
app.listen(3010, () => {
  console.log('server started...');
});

