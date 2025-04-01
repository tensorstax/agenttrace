import { getDb } from '../services/dbService';

// Trace interface based on the database schema
export interface Trace {
  id: string;
  session_id: string;
  timestamp: string;
  trace_type: string;
  function_name: string;
  tags: string | null;
  data: string;
}

export interface TraceResponse {
  id: string;
  session_id: string;
  timestamp: string;
  type: string;
  function: string;
  tags: string[] | null;
  [key: string]: any;
}

/**
 * Get traces with optional filtering
 */
export const getTraces = async (
  limit: number = 100, 
  traceType?: string, 
  tag?: string, 
  functionName?: string, 
  sessionId?: string
): Promise<TraceResponse[]> => {
  const db = await getDb();
  
  let query = "SELECT id, session_id, timestamp, trace_type, function_name, tags, data FROM traces";
  const conditions: string[] = [];
  const params: any[] = [];
  
  if (traceType) {
    conditions.push("trace_type = ?");
    params.push(traceType);
  }
  
  if (tag) {
    conditions.push("tags LIKE ?");
    params.push(`%"${tag}"%`);
  }
  
  if (functionName) {
    conditions.push("function_name = ?");
    params.push(functionName);
  }
  
  if (sessionId) {
    conditions.push("session_id = ?");
    params.push(sessionId);
  }
  
  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  
  query += " ORDER BY timestamp DESC LIMIT ?";
  params.push(limit);
  
  const rows = await db.all(query, ...params);
  
  return rows.map(row => {
    const data = JSON.parse(row.data || '{}');
    
    // Parse tags and ensure it's an array or null
    let tags = null;
    try {
      if (row.tags) {
        const parsedTags = JSON.parse(row.tags);
        if (Array.isArray(parsedTags)) {
          tags = parsedTags;
        }
      }
    } catch (e) {
      console.error('Error parsing tags JSON:', e);
    }
    
    // Reconstruct the full trace with both fixed and flexible fields
    const trace: TraceResponse = {
      id: row.id,
      session_id: row.session_id,
      timestamp: row.timestamp,
      type: row.trace_type,
      function: row.function_name,
      tags
    };
    
    // Add all the flexible schema fields from the JSON data
    Object.assign(trace, data);
    
    return trace;
  });
};

/**
 * Get unique session IDs
 */
export const getSessionIds = async (limit: number = 100): Promise<string[]> => {
  const db = await getDb();
  
  const query = "SELECT DISTINCT session_id FROM traces ORDER BY timestamp DESC LIMIT ?";
  const rows = await db.all(query, limit);
  
  return rows.map(row => row.session_id);
};

/**
 * Get trace types
 */
export const getTraceTypes = async (): Promise<string[]> => {
  const db = await getDb();
  
  const query = "SELECT DISTINCT trace_type FROM traces";
  const rows = await db.all(query);
  
  return rows.map(row => row.trace_type);
};

/**
 * Get functions that have been traced
 */
export const getTracedFunctions = async (): Promise<string[]> => {
  const db = await getDb();
  
  const query = "SELECT DISTINCT function_name FROM traces";
  const rows = await db.all(query);
  
  return rows.map(row => row.function_name);
};

/**
 * Get all unique tags used in traces
 */
export const getTags = async (): Promise<string[]> => {
  const db = await getDb();
  
  const query = "SELECT tags FROM traces WHERE tags IS NOT NULL";
  const rows = await db.all(query);
  
  const allTags = new Set<string>();
  rows.forEach(row => {
    try {
      const tagArray = JSON.parse(row.tags);
      if (Array.isArray(tagArray)) {
        tagArray.forEach(tag => allTags.add(tag));
      }
    } catch (e) {
      // Skip invalid JSON
    }
  });
  
  return Array.from(allTags);
};

/**
 * Delete a trace by ID
 */
export const deleteTrace = async (id: string): Promise<boolean> => {
  try {
    const db = await getDb();
    const query = "DELETE FROM traces WHERE id = ?";
    const result = await db.run(query, id);
    return (result.changes ?? 0) > 0;
  } catch (error) {
    console.error('Error deleting trace:', error);
    throw error;
  }
};

/**
 * Delete a session and all its related traces and evaluations
 */
export const deleteSession = async (sessionId: string): Promise<{ deletedTraces: number; deletedEvals: number; deletedEvents: number; sessionExists: boolean }> => {
  const db = await getDb();
  
  try {
    // Start a transaction to ensure data consistency
    await db.run('BEGIN TRANSACTION');
    
    // First check if session exists
    const sessionCheck = await db.get('SELECT session_id FROM traces WHERE session_id = ? LIMIT 1', sessionId);
    
    // If session doesn't exist, return success with zero counts rather than throwing an error
    if (!sessionCheck) {
      await db.run('COMMIT'); // Still need to end the transaction
      return { 
        deletedTraces: 0,
        deletedEvals: 0,
        deletedEvents: 0,
        sessionExists: false
      };
    }
    
    // Delete all traces for this session
    const traceResult = await db.run('DELETE FROM traces WHERE session_id = ?', sessionId);
    const deletedTraces = traceResult.changes ?? 0;
    
    // Delete all evaluation events related to this session
    let deletedEvalEvents = 0;
    try {
      // Check if table exists before attempting to delete
      const tableCheck = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='eval_events'");
      if (tableCheck) {
        const evalEventsResult = await db.run('DELETE FROM eval_events WHERE session_id = ?', sessionId);
        deletedEvalEvents = evalEventsResult.changes ?? 0;
      }
    } catch (err) {
      console.warn('Could not delete eval_events:', err);
      // Continue with the transaction, don't throw here
    }
    
    // Get evaluation IDs related to this session before deleting them
    let evalIds: string[] = [];
    let deletedEvals = 0;
    
    try {
      // Check if table exists before attempting to query/delete
      const tableCheck = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='eval_results'");
      
      if (tableCheck) {
        // Get all evaluation IDs for this session
        const evalRows = await db.all('SELECT id FROM eval_results WHERE session_id = ?', sessionId);
        evalIds = evalRows.map(row => row.id);
        
        // Delete the evaluation results
        const evalResult = await db.run('DELETE FROM eval_results WHERE session_id = ?', sessionId);
        deletedEvals = evalResult.changes ?? 0;
        
        // Delete related evaluation events for each eval ID
        if (evalIds.length > 0) {
          const tableCheck = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='eval_events'");
          if (tableCheck) {
            for (const evalId of evalIds) {
              try {
                await db.run('DELETE FROM eval_events WHERE eval_id = ?', evalId);
              } catch (err) {
                console.warn(`Could not delete eval_events for eval_id ${evalId}:`, err);
                // Continue with the loop, don't throw
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('Could not process eval_results:', err);
      // Continue with the transaction, don't throw here
    }
    
    // Commit the transaction
    await db.run('COMMIT');
    
    return { 
      deletedTraces,
      deletedEvals,
      deletedEvents: deletedEvalEvents,
      sessionExists: true
    };
  } catch (error) {
    // Rollback in case of any error
    try {
      await db.run('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error during transaction rollback:', rollbackError);
    }
    
    console.error('Error deleting session:', error);
    throw error;
  }
}; 