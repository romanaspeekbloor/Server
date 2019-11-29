#!/usr/bin/env node
const mongoose = require('mongoose');
const WebSocket = require('ws');
const express = require('express');
const app = express();
const cors = require('cors');

// mongoose.connect('mongodb://127.0.0.1:27017/sdrf', { useNewUrlParser: true});

const ws = new WebSocket.Server({ port: 9000, clientTracking: true }); 
let socket;

setInterval(() => {
  const execT = new Date().getTime() + 2000;
  const res = {
    execT,
  };
  if (socket) {
    ws.clients.forEach(c => {
      c.send(JSON.stringify(res));
    });
  }
}, 5000);

ws.on('connection', (s) => {
  socket = s; 
  // loop(socket);
  socket.on('message', handleMessage);
});

// websocket close
ws.on('close', () => {
  console.log('closing connection');
});

const log = ({
  // TODO check if object and more after
  err: (d) => console.error(`\x1b[31m ERROR: \x1b[0m\n ${d}`),
  info: (d) => {
    // mmm
    return console.log(d);
  }
});

const sampler = (raw) => {
  log.info('sampling');
  const smpl = raw.match(/\d+([.])\d{2}/g);
  console.log('length: ', smpl.length, typeof smpl[0]);
}

const handleMessage = (msg) => {
  // TODO better way..
  if (msg.length < 100) {
    return console.log(msg);
  }

  const d = JSON.parse(msg.replace(/\r?\n|\r|\\n/g, ""));
  const { error, data, b = 'ads', rx = data, ...rest } = d;
  console.log(d);
  if (error) log.err(error);
  if (rx) sampler(rx);
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
  console.log('listening 3000');
});

