#!/usr/bin/env node
const express = require('express');
const io = require('socket.io')(9955);
const uuidv1 = require('uuid/v1');
const app = express();
const cors = require('cors');
const _ = require('lodash');

const db = require('./lib/db');

// global vars *tmp
let allowMakeActive = false;
const connectedClients = [];
let clients = [];
const samplingDelay = 7000;
let clientResponses = [];
let getSamples = false;

/**
 *  Set configuration for all client
 *  s: {socket}
 */
const setClient = (s) => {
  s.emit('setClient', {
    fqRange: '153M:153,3M',
    sampleRate: '1k',
    serverTime: new Date().getTime()
  });
};

const insertClient = async (name, params) => {
  // TODO sort config at the client level
  // create client online/active handler so it can be set on/off
  if (!params.device_name) return Promise.resolve();
  const client = {
    uuid: uuidv1(),
    ...params,
    is_online: true,
    is_active: false,
    date_added: new Date(),
    date_online: null,
  };

  await db.clients.create(client);
  return Promise.resolve(client);
};

const verifyClient = async (name, params) => {
  console.log('verify', { name });
  const filters = {
    where: {
      device_name: name,
    },
  };
  const client = await db.clients.findOne(filters);
  if (!client) return insertClient(name, params);
  await db.clients.update({ is_online: true }, { where: { uuid: client.uuid }});

  return Promise.resolve({
    ...client.dataValues,
    is_online: true
  });
};

/**
 * Adds client to the clients array so
 * it can be checked if messages has been received
 * name: {string} client name
 * msg: {string} msg
 */
// very nasty ...
let testCounter;
const handleClientConnect = async (name, params, s) => {
  console.log('connected: ', name);
  const client = await verifyClient(name, params);
  if (!client) return Promise.resolve();

  s.rx = client;
  clients.push(s);
  connectedClients.push({ id: s.id, uuid: s.rx.uuid });
  if (s.rx.is_active) s.join('active');
  if (s.rx.is_online) {
    const _clients = await db.clients.findAll();
    s.to('ui').emit('clientConnected', _clients);
  }

  testCounter = 0;
  while (testCounter < 100) {
    await new Promise(r => setTimeout(r, 100));
    testCounter++;
  }

  if (!getSamples) emitTo('active', 'getSamples', clients.map(c => name));
  getSamples = true;
};

const handleUIConnect = (msg, s) => {
  s.ui = true;
  s.join('ui');
};

/**
 * on socket connetion, event handler server 192.168.10.242
 * arg1: event ('connection'), arg2: callback (SOCKET)  
 */
io.on('connection', (s) => {
  s.on('onClientConnect', (name, msg) => handleClientConnect(name, msg, s));
  s.on('onUIConnect', (msg) => handleUIConnect(msg, s)); 
  s.on('getSamples', (msg) => handleGetSamples(msg, s));
  s.on('disconnect', async () => {
    if (s.ui) {
      return Promise.resolve();
    } else {
      console.log('client disconnected: ', s.rx.uuid);
      await db.clients.update({ is_online: false }, { where: { uuid: s.rx.uuid }});
      const _clients = await db.clients.findAll();

      io.to('ui').emit('clientDisconnected', _clients);
      clients.splice(clients.indexOf(s), 1);
      clientResponses.splice(clientResponses.indexOf(s), 1);
    }
  });
});

/**
 * compile sample request object
 */
const smplReq = () => ({
  serverTime: new Date().getTime(),
  serverDelay: samplingDelay * 1000000,
});

const emitTo = async (room, event, data) => {
  clientResponses = [];
  console.log('emitting to aLL');
  allowMakeActive = true;
  // delay
  await new Promise(r => setTimeout(r, samplingDelay));
  const req = smplReq();
  req.data = data;

  allowMakeActive = false;
  io.to(room).emit(event, req);
  
  console.log(`\n==================================
    emitting [${event}] event
    clients [${clients.map(c => c.rx.device_name)}]
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

const insertSample = (data) => {
  const sample = {
    client_uuid: data.uuid,
    freq_band_name: 'n/a',
    data: JSON.stringify(data.samples),
    sampling_start: data.startedAt,
    saved_at: new Date(),
  }
  return db.samples.create(sample);
};

// check if sampling time is the same (ms)
const checkSamplingTime = (responses) => {
  // validate execution time
  const save = responses.map(r => r.startedAt)
    .every(t => t === responses[0].startedAt);

  if (save) {
    console.log('saving samples...');
    return Promise.all(responses.map(res => {
      if (res.samples) return insertSample(res);
      return Promise.resolve(); 
    })).then((samples) => {
      const cleanSamles = samples.filter(s => s).map(s => {
        const { sample_id, data, ...rest } = JSON.parse(JSON.stringify(s));
        return rest;
      });
      io.to('ui').emit('newSamplesAdded', cleanSamles);
      return Promise.resolve();
    });
  }
};

const handleGetSamples = async (msg, s) => {
  const d = JSON.parse(msg.replace(/\r?\n|\r|\\n/g, ""));
  const { error, data, rx = data, ...props } = d;
  const names = clientResponses.map(c => c.name);

  if (!names.includes(s.name)) {
    clientResponses.push({
      name: s.rx.device_name,
      uuid: s.rx.uuid,
      startedAt: props.startedAt,
      benchMark: props.benchMark,
    });
  }


  error ?
    /* error handler */ () => 0 :
    samples = rx ? clientResponses.forEach((c, i) => {
      if (c.name === s.rx.device_name) {
        clientResponses[i].samples = sampler(rx);
      }
    }) : 'no data...';

  if (clients.filter(c => c.rx.is_active).length === clientResponses.length && clients.length > 0) {
    console.log({ clientResponses });

    try {
      await checkSamplingTime(clientResponses);
      emitTo('active', 'getSamples', clientResponses); 
    } catch (e) {
      emitTo('active', 'getSamples', clientResponses); 
      console.log({e});
    }
  }
};

/* 
 * TODO Move this away to a new repo or file
 * API STUFF
 */

// MIDDLEWARE
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/v1/admin/clients' , (req, res) => {
  db.clients.findAll().then(clients => {
    res.send(200, clients);
  });
});

app.post('/v1/admin/activate', (req, res) => {
  const data = req.body;
  const active = data.is_active ? 0 : 1;

  // TODO get rid of this boolean and make clients active to it does not break sampling cycle or spams another one.
  if (allowMakeActive) {
    db.clients.update({ is_active: active, date_activated: new Date() }, { where: { uuid: data.uuid }})
      .then(() => {
        const sockets = io.sockets.clients().sockets;
        const client = connectedClients.filter(c => c.uuid === data.uuid)[0];
        const socket = sockets[client.id];
        clients = clients.map(c => {
          if (c.rx.uuid === data.uuid) {
            c.rx.is_active = active;
            return c;
          }

          return c;
        })

        active && socket ? 
          socket.join('active') : 
          socket.leave('active');

        db.clients.findAll().then(clients => res.send(clients)); 
      });
  } else {
    db.clients.findAll().then(clients => res.send(clients)); 
  }
});

// listen
app.listen(3010, () => {
  console.log('server started...');
});

