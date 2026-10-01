// Pushes the populated project list to every browser socket in the
// `projects` room (joined in `projects-subs`), whoever changed it: a browser,
// the MCP over plain HTTP, or a deploy writing its history.
//
// One fixed room instead of `Project.publish`: publish sends one copy per
// record room, and a socket only sits in the rooms of the projects that
// existed when it subscribed, so it never heard of a project created later.
//
// Trailing throttle: a burst of writes (a deploy finishing updates several
// rows) sends one push, and the last state always goes out.

const ROOM = 'projects';
const EVENT = 'project';

let timer = null;

function delayMs() {
  const custom = sails.config.custom || {};
  return typeof custom.notifyProjectsDelayMs === 'number' ? custom.notifyProjectsDelayMs : 500;
}

async function flush() {
  timer = null;
  try {
    const projects = await sails.helpers.populateProject();
    sails.sockets.broadcast(ROOM, EVENT, projects);
  } catch (e) {
    sails.log.warn(`notify-projects: ${e}`);
  }
}

// Fire and forget: callers never wait for the push nor fail because of it.
function notifyProjects() {
  if (timer === null) {
    timer = setTimeout(flush, delayMs());
  }
}

module.exports = { notifyProjects, ROOM, EVENT };
