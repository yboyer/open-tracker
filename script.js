const path = require('path');
const app = new require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const Datastore = new require('nedb');
const db = new Datastore({ filename: './data.json', autoload: true });

/**
 * Add track event on db
 */
app.get('/:accountId/:clientId', (req, res) => {
  const entry = {
    accountId: req.params.accountId,
    clientId: req.params.clientId
  };
  const data = { timestamp: Math.round(Date.now() / 1000) };

  // Check if the entry exists
  db.findOne(entry, (err, doc) => {
    const emitDoc = {
      accountId: entry.accountId,
      clientId: entry.clientId,
      data: []
    };

    if (doc == null) {
      db.update(entry, emitDoc, { upsert: true });
    } else {
      emitDoc.data.push(data);
      db.update(entry, { $push: { data } });
    }

    // Broadcast the document
    broadcast(emitDoc);
  });

  // Send the 'image'
  res.sendFile(path.join(__dirname, 'dot.gif'), {
    maxAge: 900000
  });
});

/**
 * Broadcast document
 * @param {Object} emitDoc The document
 */
function broadcast(emitDoc) {
  console.log(emitDoc);
  io.emit('open', parseDocs(emitDoc));
}

/**
 * Format the db docs
 * @param {Array} docs The docs to Format
 * @return {Array} The Formated docs
 */
function parseDocs(docs) {
  return [].concat(docs).map(doc => {
    return {
      accountId: doc.accountId,
      clientId: doc.clientId,
      data: doc.data,
      openCount: doc.data.length
    };
  });
}

/**
 * Send the db to new connexions
 */
io.on('connection', (socket) => {
  db.find({}, (err, docs) => {
    socket.emit('open', parseDocs(docs));
  });
});

/**
 * Listen
 */
server.listen(4401, () => {
  console.log('Listening...');
});
