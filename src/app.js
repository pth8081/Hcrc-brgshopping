require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

const app = express();

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
