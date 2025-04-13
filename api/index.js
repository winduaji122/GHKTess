// Vercel serverless entry point
const serverless = require('serverless-http');
const app = require('../backend/vercel-server');

// Export the Express app wrapped with serverless-http
module.exports = serverless(app);
