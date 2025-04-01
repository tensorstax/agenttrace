import express, { Request, Response } from 'express';
import { getDbPath, setDbPath } from '../services/dbService';

const router = express.Router();

/**
 * GET /api/db/path
 * Get the current database path
 */
router.get('/path', async (req: Request, res: Response) => {
  try {
    const dbPath = getDbPath();
    res.status(200).json({ path: dbPath });
  } catch (error: any) {
    console.error('Error getting database path:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/db/path
 * Update the database path
 */
router.post('/path', async (req: Request, res: Response) => {
  try {
    const { path } = req.body;
    
    if (!path) {
      return res.status(400).json({ error: 'Database path is required' });
    }
    
    const updatedPath = setDbPath(path);
    res.status(200).json({ path: updatedPath });
  } catch (error: any) {
    console.error('Error updating database path:', error);
    res.status(500).json({ error: error.message });
  }
});

export const dbRoutes = router; 