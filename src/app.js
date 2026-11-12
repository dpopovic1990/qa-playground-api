
const express = require('express');

const healthRoutes = require('./routes/health.routes');
const usersRoutes = require('./routes/users.routes');

const notFound = require('./middleware/notFound.middleware');
const errorHandler = require('./middleware/error.middleware');

const app = express();

// Parse incoming JSON request bodies
app.use(express.json());

// Register API routes
app.use('/health', healthRoutes);
app.use('/api/v1/users', usersRoutes);

// Handle unknown routes
app.use(notFound);

// Handle application errors
app.use(errorHandler);

module.exports = app;
