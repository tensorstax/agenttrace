import express, { Request, Response } from 'express';
import * as traceRepository from '../repositories/traceRepository';

const router = express.Router();

/**
 * GET /api/traces
 * Retrieve traces with optional filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const traceType = req.query.type as string;
    const tag = req.query.tag as string;
    const functionName = req.query.function as string;
    const sessionId = req.query.session_id as string;
    
    const traces = await traceRepository.getTraces(limit, traceType, tag, functionName, sessionId);
    
    res.json({
      success: true,
      count: traces.length,
      traces
    });
  } catch (error) {
    console.error('Error retrieving traces:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve traces'
    });
  }
});

/**
 * GET /api/traces/sessions
 * Get all unique session IDs
 */
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const sessions = await traceRepository.getSessionIds(limit);
    
    res.json({
      success: true,
      count: sessions.length,
      sessions
    });
  } catch (error) {
    console.error('Error retrieving sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sessions'
    });
  }
});

/**
 * GET /api/traces/types
 * Get all trace types
 */
router.get('/types', async (req: Request, res: Response) => {
  try {
    const types = await traceRepository.getTraceTypes();
    
    res.json({
      success: true,
      count: types.length,
      types
    });
  } catch (error) {
    console.error('Error retrieving trace types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve trace types'
    });
  }
});

/**
 * GET /api/traces/functions
 * Get all traced function names
 */
router.get('/functions', async (req: Request, res: Response) => {
  try {
    const functions = await traceRepository.getTracedFunctions();
    
    res.json({
      success: true,
      count: functions.length,
      functions
    });
  } catch (error) {
    console.error('Error retrieving functions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve functions'
    });
  }
});

/**
 * GET /api/traces/tags
 * Get all unique tags
 */
router.get('/tags', async (req: Request, res: Response) => {
  try {
    const tags = await traceRepository.getTags();
    
    res.json({
      success: true,
      count: tags.length,
      tags
    });
  } catch (error) {
    console.error('Error retrieving tags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve tags'
    });
  }
});

/**
 * DELETE /api/traces/:id
 * Delete a trace by ID
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Trace ID is required'
      });
    }
    
    const deleted = await traceRepository.deleteTrace(id);
    
    if (deleted) {
      res.json({
        success: true,
        message: `Trace ${id} deleted successfully`
      });
    } else {
      res.status(404).json({
        success: false,
        error: `Trace with ID ${id} not found`
      });
    }
  } catch (error) {
    console.error('Error deleting trace:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete trace'
    });
  }
});

/**
 * DELETE /api/traces/sessions/:id
 * Delete a session and all its related traces and evaluations
 */
router.delete('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }
    
    try {
      const result = await traceRepository.deleteSession(sessionId);
      
      // Handle case when session doesn't exist
      if (!result.sessionExists) {
        // Return 200 OK with a message that nothing was deleted (not found but not an error)
        return res.json({
          success: true,
          message: `No session found with ID ${sessionId}, nothing was deleted`,
          deletedTraces: 0,
          deletedEvals: 0,
          deletedEvents: 0
        });
      }
      
      // Normal success case
      res.json({
        success: true,
        message: `Session ${sessionId} deleted successfully`,
        deletedTraces: result.deletedTraces,
        deletedEvals: result.deletedEvals,
        deletedEvents: result.deletedEvents
      });
    } catch (error: any) {
      // Re-throw for the outer catch block to handle
      throw error;
    }
  } catch (error: any) {
    console.error('Error deleting session:', error);
    
    // Send a more detailed error message to the client
    res.status(500).json({
      success: false,
      error: 'Failed to delete session',
      message: error.message || 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export const traceRoutes = router; 