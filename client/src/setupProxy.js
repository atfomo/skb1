
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    (req, res, next) => {


      const cspDirectives = [
        "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:",
        "script-src * 'unsafe-inline' 'unsafe-eval' data: blob:",
        "style-src * 'unsafe-inline' data: blob:",
        "img-src * data: blob:",
        "font-src * data: blob:",
        "frame-src * data: blob:", // Allows all iframes
        "connect-src * data: blob:", // Allows all network connections
        "frame-ancestors *", // Allows your site to be framed by anyone (very insecure for production)
      ];

      const cspPolicy = cspDirectives.join('; ').trim();

      res.setHeader('Content-Security-Policy', cspPolicy);
      next();
    }
  );
};