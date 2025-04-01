import { getDb } from '../services/dbService';

/**
 * Check if a table exists in the database
 */
export const tableExists = async (tableName: string): Promise<boolean> => {
  const db = await getDb();
  try {
    const result = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      tableName
    );
    return !!result;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
};

export interface EvalResult {
  id: string;
  name: string;
  timestamp: string;
  trial_count: number;
  session_id: string;
  data: string;
}

export interface EvalEvent {
  id: string;
  eval_id: string;
  session_id: string;
  timestamp: string;
  event_type: string;
  name: string;
  data: string;
}

export interface EvalResponse {
  id: string;
  name: string;
  timestamp: string;
  trial_count: number;
  session_id: string;
  [key: string]: any;
}

export interface EvalEventResponse {
  id: string;
  eval_id: string;
  session_id: string;
  timestamp: string;
  event_type: string;
  name: string;
  [key: string]: any;
}

/**
 * Get evaluation results with optional filtering
 */
export const getEvalResults = async (
  evalId?: string, 
  name?: string, 
  sessionId?: string, 
  limit: number = 10
): Promise<EvalResponse[]> => {
  try {
    const db = await getDb();
    
    // Check if table exists first
    const tableExistsResult = await tableExists('eval_results');
    if (!tableExistsResult) {
      console.log('eval_results table does not exist yet');
      return [];
    }
    
    let query = "SELECT id, name, timestamp, trial_count, session_id, data FROM eval_results";
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (evalId) {
      conditions.push("id = ?");
      params.push(evalId);
    }
    
    if (name) {
      conditions.push("name = ?");
      params.push(name);
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
    
    return rows.map((row: EvalResult) => {
      // Parse the JSON data back into a Python dictionary
      const data = JSON.parse(row.data || '{}');
      
      // Create a result entry with metadata
      const result: EvalResponse = {
        id: row.id,
        name: row.name,
        timestamp: row.timestamp,
        trial_count: row.trial_count,
        session_id: row.session_id
      };
      
      // Add all the data fields
      Object.assign(result, data);
      
      return result;
    });
  } catch (error) {
    console.error('Error in getEvalResults:', error);
    return [];
  }
};

/**
 * Get evaluation events with optional filtering
 */
export const getEvalEvents = async (
  evalId?: string, 
  sessionId?: string, 
  eventType?: string, 
  limit: number = 100
): Promise<EvalEventResponse[]> => {
  try {
    const db = await getDb();
    
    // Check if table exists first
    const tableExistsResult = await tableExists('eval_events');
    if (!tableExistsResult) {
      console.log('eval_events table does not exist yet');
      return [];
    }
    
    let query = "SELECT id, eval_id, session_id, timestamp, event_type, name, data FROM eval_events";
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (evalId) {
      conditions.push("eval_id = ?");
      params.push(evalId);
    }
    
    if (sessionId) {
      conditions.push("session_id = ?");
      params.push(sessionId);
    }
    
    if (eventType) {
      conditions.push("event_type = ?");
      params.push(eventType);
    }
    
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    
    query += " ORDER BY timestamp DESC LIMIT ?";
    params.push(limit);
    
    const rows = await db.all(query, ...params);
    
    return rows.map((row: EvalEvent) => {
      // Parse the JSON data back into a Python dictionary
      const data = JSON.parse(row.data || '{}');
      
      // Create an event entry with metadata
      const event: EvalEventResponse = {
        id: row.id,
        eval_id: row.eval_id,
        session_id: row.session_id,
        timestamp: row.timestamp,
        event_type: row.event_type,
        name: row.name
      };
      
      // Add all the data fields
      Object.assign(event, data);
      
      return event;
    });
  } catch (error) {
    console.error('Error in getEvalEvents:', error);
    return [];
  }
};

/**
 * Get unique evaluation IDs
 */
export const getEvalIds = async (limit: number = 100): Promise<string[]> => {
  try {
    const db = await getDb();
    
    // Check if table exists first
    const tableExistsResult = await tableExists('eval_results');
    if (!tableExistsResult) {
      console.log('eval_results table does not exist yet');
      return [];
    }
    
    const query = "SELECT DISTINCT id FROM eval_results ORDER BY timestamp DESC LIMIT ?";
    const rows = await db.all(query, limit);
    
    return rows.map((row: { id: string }) => row.id);
  } catch (error) {
    console.error('Error in getEvalIds:', error);
    return [];
  }
};

/**
 * Get unique evaluation names
 */
export const getEvalNames = async (): Promise<string[]> => {
  try {
    const db = await getDb();
    
    // Check if table exists first
    const tableExistsResult = await tableExists('eval_results');
    if (!tableExistsResult) {
      console.log('eval_results table does not exist yet');
      return [];
    }
    
    const query = "SELECT DISTINCT name FROM eval_results";
    const rows = await db.all(query);
    
    return rows.map((row: { name: string }) => row.name);
  } catch (error) {
    console.error('Error in getEvalNames:', error);
    return [];
  }
};

/**
 * Get distinct event types
 */
export const getEventTypes = async (): Promise<string[]> => {
  try {
    const db = await getDb();
    
    // Check if table exists first
    const tableExistsResult = await tableExists('eval_events');
    if (!tableExistsResult) {
      console.log('eval_events table does not exist yet');
      return [];
    }
    
    const query = "SELECT DISTINCT event_type FROM eval_events";
    const rows = await db.all(query);
    
    return rows.map((row: { event_type: string }) => row.event_type);
  } catch (error) {
    console.error('Error in getEventTypes:', error);
    return [];
  }
};

/**
 * Delete an evaluation and its associated events
 */
export const deleteEval = async (evalId: string): Promise<boolean> => {
  const db = await getDb();
  
  try {
    // Use a transaction to ensure both operations complete or both fail
    await db.run('BEGIN TRANSACTION');
    
    // Delete evaluation events related to this evaluation ID
    await db.run('DELETE FROM eval_events WHERE eval_id = ?', evalId);
    
    // Delete the evaluation itself
    const result = await db.run('DELETE FROM eval_results WHERE id = ?', evalId);
    
    // Commit the transaction
    await db.run('COMMIT');
    
    // Return true if at least one row was affected (result.changes might be undefined, default to 0)
    return (result.changes ?? 0) > 0;
  } catch (error) {
    // Rollback on error
    await db.run('ROLLBACK');
    console.error('Error deleting evaluation:', error);
    throw error;
  }
}; 