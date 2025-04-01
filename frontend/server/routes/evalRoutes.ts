import express, { Request, Response } from 'express';
import * as evalRepository from '../repositories/evalRepository';

const router = express.Router();

/**
 * GET /api/evals/results
 * Get evaluation results with optional filtering
 */
router.get('/results', async (req: Request, res: Response) => {
  try {
    const evalId = req.query.eval_id as string;
    const name = req.query.name as string;
    const sessionId = req.query.session_id as string;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const results = await evalRepository.getEvalResults(evalId, name, sessionId, limit);
    
    res.json({
      success: true,
      count: results.length,
      results
    });
  } catch (error) {
    console.error('Error retrieving evaluation results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve evaluation results'
    });
  }
});

/**
 * GET /api/evals/events
 * Get evaluation events with optional filtering
 */
router.get('/events', async (req: Request, res: Response) => {
  try {
    const evalId = req.query.eval_id as string;
    const sessionId = req.query.session_id as string;
    const eventType = req.query.event_type as string;
    const limit = parseInt(req.query.limit as string) || 100;
    
    const events = await evalRepository.getEvalEvents(evalId, sessionId, eventType, limit);
    
    res.json({
      success: true,
      count: events.length,
      events
    });
  } catch (error) {
    console.error('Error retrieving evaluation events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve evaluation events'
    });
  }
});

/**
 * GET /api/evals/ids
 * Get unique evaluation IDs
 */
router.get('/ids', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const evalIds = await evalRepository.getEvalIds(limit);
    
    res.json({
      success: true,
      count: evalIds.length,
      eval_ids: evalIds
    });
  } catch (error) {
    console.error('Error retrieving evaluation IDs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve evaluation IDs'
    });
  }
});

/**
 * GET /api/evals/names
 * Get unique evaluation names
 */
router.get('/names', async (req: Request, res: Response) => {
  try {
    const names = await evalRepository.getEvalNames();
    
    res.json({
      success: true,
      count: names.length,
      names
    });
  } catch (error) {
    console.error('Error retrieving evaluation names:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve evaluation names'
    });
  }
});

/**
 * GET /api/evals/event-types
 * Get unique event types
 */
router.get('/event-types', async (req: Request, res: Response) => {
  try {
    const eventTypes = await evalRepository.getEventTypes();
    
    res.json({
      success: true,
      count: eventTypes.length,
      event_types: eventTypes
    });
  } catch (error) {
    console.error('Error retrieving event types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve event types'
    });
  }
});

/**
 * DELETE /api/evals/:id
 * Delete an evaluation and its related events
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const evalId = req.params.id;
    
    if (!evalId) {
      return res.status(400).json({
        success: false,
        error: 'Evaluation ID is required'
      });
    }
    
    const deleted = await evalRepository.deleteEval(evalId);
    
    if (deleted) {
      res.json({
        success: true,
        message: `Evaluation ${evalId} and its events have been deleted`
      });
    } else {
      res.status(404).json({
        success: false,
        error: `Evaluation with ID ${evalId} not found`
      });
    }
  } catch (error) {
    console.error('Error deleting evaluation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete evaluation'
    });
  }
});

export const evalRoutes = router; 