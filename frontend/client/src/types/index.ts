// Trace interfaces
export interface Trace {
  id: string;
  session_id: string;
  timestamp: string;
  type: string;
  function: string;
  tags: string[] | null;
  duration_ms?: number;
  args?: any;
  kwargs?: any;
  result?: any;
  [key: string]: any;
}

export interface TraceResponse {
  success: boolean;
  count: number;
  traces: Trace[];
}

export interface SessionResponse {
  success: boolean;
  count: number;
  sessions: string[];
}

export interface TypesResponse {
  success: boolean;
  count: number;
  types: string[];
}

export interface FunctionsResponse {
  success: boolean;
  count: number;
  functions: string[];
}

export interface TagsResponse {
  success: boolean;
  count: number;
  tags: string[];
}

// Database interfaces
export interface DbPathResponse {
  path: string;
}

// Evaluation interfaces
export interface EvalResult {
  id: string;
  name: string;
  timestamp: string;
  trial_count: number;
  session_id: string;
  eval_results?: any[];
  tool_summary?: any;
  metadata?: any;
  [key: string]: any;
}

export interface EvalResultsResponse {
  success: boolean;
  count: number;
  results: EvalResult[];
}

export interface EvalEvent {
  id: string;
  eval_id: string;
  session_id: string;
  timestamp: string;
  event_type: string;
  name: string;
  input?: string;
  output?: any;
  duration_ms?: number;
  scores?: any;
  trial?: number;
  [key: string]: any;
}

export interface EvalEventsResponse {
  success: boolean;
  count: number;
  events: EvalEvent[];
}

export interface EvalIdsResponse {
  success: boolean;
  count: number;
  eval_ids: string[];
}

export interface EvalNamesResponse {
  success: boolean;
  count: number;
  names: string[];
}

export interface EventTypesResponse {
  success: boolean;
  count: number;
  event_types: string[];
} 