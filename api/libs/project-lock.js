// One change at a time per project. sails-mongo has no transactions: a patch
// checks the stored rows and then writes them, and a second change landing in
// between would make that check stale. In memory, so only within one backend
// process (the only deployment shape today).

const tails = new Map();

async function withProjectLock(projectId, fn) {
  const key = String(projectId);
  const previous = tails.get(key) || Promise.resolve();
  let release;
  const mine = new Promise((resolve) => {
    release = resolve;
  });
  const tail = previous.then(() => mine);
  tails.set(key, tail);
  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (tails.get(key) === tail) {
      tails.delete(key);
    }
  }
}

module.exports = { withProjectLock };
