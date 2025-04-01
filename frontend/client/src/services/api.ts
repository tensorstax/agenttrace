import axios from 'axios';
import {
  TraceResponse,
  SessionResponse,
  TypesResponse,
  FunctionsResponse,
  TagsResponse,
  EvalResultsResponse,
  EvalEventsResponse,
  EvalIdsResponse,
  EvalNamesResponse,
  EventTypesResponse,
  DbPathResponse
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Database settings API endpoints
export const getDbPath = async (): Promise<DbPathResponse> => {
  const response = await apiClient.get<DbPathResponse>('/db/path');
  return response.data;
};

export const updateDbPath = async (path: string): Promise<DbPathResponse> => {
  const response = await apiClient.post<DbPathResponse>('/db/path', { path });
  return response.data;
};

// Trace API endpoints
export const getTraces = async (
  limit?: number,
  type?: string,
  tag?: string,
  functionName?: string,
  sessionId?: string
): Promise<TraceResponse> => {
  const params: Record<string, string | number> = {};
  if (limit) params.limit = limit;
  if (type) params.type = type;
  if (tag) params.tag = tag;
  if (functionName) params.function = functionName;
  if (sessionId) params.session_id = sessionId;

  const response = await apiClient.get<TraceResponse>('/traces', { params });
  return response.data;
};

export const getSessions = async (limit?: number): Promise<SessionResponse> => {
  const params: Record<string, number> = {};
  if (limit) params.limit = limit;

  const response = await apiClient.get<SessionResponse>('/traces/sessions', { params });
  return response.data;
};

export const getTraceTypes = async (): Promise<TypesResponse> => {
  const response = await apiClient.get<TypesResponse>('/traces/types');
  return response.data;
};

export const getTracedFunctions = async (): Promise<FunctionsResponse> => {
  const response = await apiClient.get<FunctionsResponse>('/traces/functions');
  return response.data;
};

export const getTags = async (): Promise<TagsResponse> => {
  const response = await apiClient.get<TagsResponse>('/traces/tags');
  return response.data;
};

// Delete a trace by ID
export const deleteTrace = async (id: string): Promise<{ success: boolean; message?: string; error?: string }> => {
  const response = await apiClient.delete<{ success: boolean; message?: string; error?: string }>(`/traces/${id}`);
  return response.data;
};

// Delete a session and all related traces and evaluations
export const deleteSession = async (sessionId: string): Promise<{ success: boolean; message?: string; error?: string }> => {
  const response = await apiClient.delete<{ success: boolean; message?: string; error?: string }>(`/traces/sessions/${sessionId}`);
  return response.data;
};

// Evaluation API endpoints
export const getEvalResults = async (
  evalId?: string,
  name?: string,
  sessionId?: string,
  limit?: number
): Promise<EvalResultsResponse> => {
  const params: Record<string, string | number> = {};
  if (evalId) params.eval_id = evalId;
  if (name) params.name = name;
  if (sessionId) params.session_id = sessionId;
  if (limit) params.limit = limit;

  const response = await apiClient.get<EvalResultsResponse>('/evals/results', { params });
  return response.data;
};

export const getEvalEvents = async (
  evalId?: string,
  sessionId?: string,
  eventType?: string,
  limit?: number
): Promise<EvalEventsResponse> => {
  const params: Record<string, string | number> = {};
  if (evalId) params.eval_id = evalId;
  if (sessionId) params.session_id = sessionId;
  if (eventType) params.event_type = eventType;
  if (limit) params.limit = limit;

  const response = await apiClient.get<EvalEventsResponse>('/evals/events', { params });
  return response.data;
};

export const getEvalIds = async (limit?: number): Promise<EvalIdsResponse> => {
  const params: Record<string, number> = {};
  if (limit) params.limit = limit;

  const response = await apiClient.get<EvalIdsResponse>('/evals/ids', { params });
  return response.data;
};

export const getEvalNames = async (): Promise<EvalNamesResponse> => {
  const response = await apiClient.get<EvalNamesResponse>('/evals/names');
  return response.data;
};

export const getEventTypes = async (): Promise<EventTypesResponse> => {
  const response = await apiClient.get<EventTypesResponse>('/evals/event-types');
  return response.data;
};

// Delete an evaluation by ID
export const deleteEval = async (evalId: string): Promise<{ success: boolean; message?: string; error?: string }> => {
  const response = await apiClient.delete<{ success: boolean; message?: string; error?: string }>(`/evals/${evalId}`);
  return response.data;
}; 