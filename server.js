#!/usr/bin/env node
const mongoose = require('mongoose');
const WebSocket = require('ws');
const express = require('express');
const io = require('socket.io')(9955);
const app = express();
const cors = require('cors');

io.on('connection', (s) => {
  console.log('connected: ');
  s.emit('test', 'yo');
  s.on('myEvent', (a, b, c) => {
    console.log(`My event\n params: ${a}, ${b}, ${c}`);
  });
});

// mongoose.connect('mongodb://127.0.0.1:27017/sdrf', { useNewUrlParser: true});

const ws = new WebSocket.Server({ port: 9000, clientTracking: true }); 
let socket;

// TODO process.hrtime.bigint()
setInterval(() => {
  const execT = 2000;
  const t = new Date().getTime();
  const res = {
    serverTime: t, 
    execT,
  };
  console.log('res: ', res);
  if (socket) {
    ws.clients.forEach(c => {
      c.send(JSON.stringify(res));
    });
  }
}, 5000);

const Send = (actions, params) => {
  socket.send(JSON.stringify({
    timestamp: new Date().getTime(),
    params: params ? params : null,
    actions
  })); 
};

ws.on('connection', (s) => {
  socket = s; 
  // loop(socket);
  Send(['setTime']);
  socket.on('message', handleMessage);
});

// websocket close
ws.on('close', () => {
  console.log('closing connection');
});

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

const handleMessage = (msg) => {
  // TODO better way..
  if (msg.length < 100) {
    return console.log(msg);
  }

  const d = JSON.parse(msg.replace(/\r?\n|\r|\\n/g, ""));
  const { error, data, rx = data, ...props } = d;

  if (error) {
    // TODO handle error (sent instruction to reset or something)
    return log.info({ error, props });
  }

  samples = rx ? sampler(rx) : 'no data...';
  // TODO if samples do match some criteria
  // 2 functions one to form date object and another one for storing
  log.info({ ...props });
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

