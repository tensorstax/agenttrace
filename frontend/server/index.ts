import express from 'express';
import cors from 'cors';
import { join } from 'path';
import { traceRoutes } from './routes/traceRoutes';
import { evalRoutes } from './routes/evalRoutes';
import { dbRoutes } from './routes/dbRoutes';

// Create Express app
const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/traces', traceRoutes);
app.use('/api/evals', evalRoutes);
app.use('/api/db', dbRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Serve static files if in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../../client/build/index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 