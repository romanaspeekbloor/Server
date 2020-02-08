#!/usr/bin/env node
const express = require('express');
const io = require('socket.io')(9955);
const app = express();

const db = require('./lib/db');

console.log({ db })

// global vars *tmp
const clients = [];
const samplingDelay = 7000;
let clientResponses = [];
let getSamples = false;

/**
 *  Set configuration for all client
 *  s: {socket}
 */
const setClient = (s) => {
  if (clients.length < 1) {
    s.emit('setClient', {
      fqRange: '153M:153,3M',
      sampleRate: '1k',
      serverTime: new Date().getTime()
    });
  }
};

/**
 * Adds client to the clients array so
 * it can be checked if messages has been received
 * name: {string} client name
 * msg: {string} msg
 */
// very nasty ...
let testCounter = 0;
const handleClientConnect = async (name, msg, s) => {
  console.log('connected: ', name);
  s.name = name;
  clients.push(s);
  testCounter = 0;
  while (testCounter < 100) {
    await new Promise(r => setTimeout(r, 20));
    testCounter++;
  }
  if (!getSamples) emitToAll('getSamples', clients.map(c => name));
  getSamples = true;
};

/**
 * on socket connetion, event handlers
erver 192.168.10.242
 * arg1: event ('connection'), arg2: callback (SOCKET)  
 */
io.on('connection', (s) => {
  setClient(s);
  s.on('getSamples', (msg) => handleGetSamples(msg, s));
  s.on('onClientConnect', (name, msg) => handleClientConnect(name, msg, s));
  s.on('disconnect', () => {
    console.log('client disconnected.');
    clients.splice(clients.indexOf(s), 1);
    console.log('clients: ', s.name);
    clientResponses.splice(clientResponses.indexOf(s), 1);
  });
});

/**
 * compile sample request object
 */
const smplReq = () => ({
  serverTime: new Date().getTime(),
  serverDelay: samplingDelay * 1000000
});

const emitToAll = async (event, data) => {
  clientResponses = [];
  console.log('emitting to aLL');
  // delay
  await new Promise(r => setTimeout(r, samplingDelay));
  const req = smplReq();
  req.data = data;

  io.sockets.emit(event, req);
  
  console.log(`\n==================================
    emitting [${event}] event
    clients [${clients.map(c => c.name)}]
    server timestamp: ${req.serverTime}`);
};

/**
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

const checkArrays = (a, b) => {
  if (a === b) return 0;
  if (a == null || b == null) return 0;
  if (a.length != b.length) return 0;

  for(let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return 0;
  }

  return 1;
};

// check if sampling time is the same (ms)
const checkSamplingTime = (responses) => {
  // validate execution time
  const save = responses.map(r => r.startedAt)
    .every(t => t === responses[0].startedAt);

  if (save) {
    // TODO save and etc. 
    // model.save( <props>, <params>);
    console.log({ save }, responses.map(r => {
      delete r.samples;
      return r;
    }));
  }
};

const handleGetSamples = (msg, s) => {
  console.log({ msg });
  const d = JSON.parse(msg.replace(/\r?\n|\r|\\n/g, ""));
  const { error, data, rx = data, ...props } = d;
  const names = clientResponses.map(c => c.name);

  log.info({ props });

  if (!names.includes(s.name)) {
    clientResponses.push({
      name: s.name,
      startedAt: props.startedAt,
      benchMark: props.benchMark,
    });
  }

  error ?
    /* error handler */ () => 0 :
    samples = rx ? clientResponses.forEach((c, i) => {
      if (c.name === s.name) {
        // clientResponses[i].samples = sampler(rx);
      }
    }) : 'no data...';


  if (clients.length === clientResponses.length && clients.length > 1) {
    // check if all started at the same time (ms) presicion
    checkSamplingTime(clientResponses);
    emitToAll('getSamples', clientResponses); 
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

