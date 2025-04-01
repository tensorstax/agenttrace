import { getDb } from '../services/dbService';

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
  const db = await getDb();
  
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
  const db = await getDb();
  
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
};

/**
 * Get unique evaluation IDs
 */
export const getEvalIds = async (limit: number = 100): Promise<string[]> => {
  const db = await getDb();
  
  const query = "SELECT DISTINCT id FROM eval_results ORDER BY timestamp DESC LIMIT ?";
  const rows = await db.all(query, limit);
  
  return rows.map((row: { id: string }) => row.id);
};

/**
 * Get unique evaluation names
 */
export const getEvalNames = async (): Promise<string[]> => {
  const db = await getDb();
  
  const query = "SELECT DISTINCT name FROM eval_results";
  const rows = await db.all(query);
  
  return rows.map((row: { name: string }) => row.name);
};

/**
 * Get distinct event types
 */
export const getEventTypes = async (): Promise<string[]> => {
  const db = await getDb();
  
  const query = "SELECT DISTINCT event_type FROM eval_events";
  const rows = await db.all(query);
  
  return rows.map((row: { event_type: string }) => row.event_type);
}; 