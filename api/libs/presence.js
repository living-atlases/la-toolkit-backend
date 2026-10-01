// Which browsers have which project open, and on which page (view, edit,
// servers, tune, deploy), so a project page can say "also open in another
// browser, editing it". In memory: it only describes live sockets, and
// they are gone after a restart anyway.

const { ROOM } = require('./notify-projects');

const EVENT = 'presence';
const sessions = new Map();

function list() {
  return [...sessions.entries()].map(([id, s]) => ({ id, projectId: s.projectId, mode: s.mode }));
}

function broadcast() {
  sails.sockets.broadcast(ROOM, EVENT, list());
}

// A socket says where it is; no project (the home page) removes it.
function announce(socketId, projectId, mode) {
  if (projectId) {
    sessions.set(socketId, { projectId: String(projectId), mode: String(mode || 'view') });
  } else if (!sessions.delete(socketId)) {
    return;
  }
  broadcast();
}

function drop(socketId) {
  if (sessions.delete(socketId)) {
    broadcast();
  }
}

module.exports = { announce, drop, list, EVENT };
