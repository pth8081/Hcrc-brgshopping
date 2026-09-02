require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');

const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

const app = express();

// Strict CSP: every directive is 'self' (or 'none') — no 'unsafe-inline' or
// 'unsafe-eval' anywhere. This only works because the frontend has no inline
// <script>/<style> blocks and no style="..." attributes: all styling comes
// from the compiled Tailwind stylesheet, and any per-element dynamic style
// (e.g. product thumbnail colors) is set via element.style.property = value
// in JS rather than a style attribute — see applyThumbGradients() in
// public/js/api.js for why that isn't blocked by style-src.
app.use(
  helmet({
    contentSecurityPolicy: {
      // useDefaults: false so this is the *complete* directive set — helmet's
      // defaults otherwise merge in `upgrade-insecure-requests`, which would
      // make browsers rewrite every request to HTTPS and break a plain-HTTP
      // internal/offline deployment with no TLS certificate.
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'"],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
  })
);
app.use(cors());
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (req, res) => res.json({ success: true, status: 'ok' }));
app.use('/api', routes);

// Basic storefront frontend (static HTML/CSS/vanilla JS) served alongside the API.
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', notFoundHandler);
app.get('*', (req, res) => res.status(404).sendFile(path.join(__dirname, '..', 'public', '404.html')));
app.use(errorHandler);

module.exports = app;
