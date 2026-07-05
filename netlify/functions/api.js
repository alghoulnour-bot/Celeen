const serverless = require('serverless-http');
const app = require('../../src/app');

const handler = serverless(app);

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  // Defensive: if Netlify ever hands us the internal function path, strip it so
  // Express still sees /api/... and /admin/...
  if (event.path && event.path.indexOf('/.netlify/functions/api') === 0) {
    event.path = event.path.slice('/.netlify/functions/api'.length) || '/';
  }
  return handler(event, context);
};
