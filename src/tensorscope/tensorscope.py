import os
import sqlite3
import json
import time
import logging
import functools
import inspect
from datetime import datetime
import uuid
import atexit
from functools import partial
import threading
import sys

# ANSI color codes for terminal output
class Colors:
    RESET = "\033[0m"
    CYAN = "\033[36m"
    GREEN = "\033[32m"
    RED = "\033[31m"
    BOLD = "\033[1m"

# Check if terminal supports colors
def supports_color():
    """Check if the terminal supports color output."""
    if sys.platform == "win32":
        # Windows detection
        return os.environ.get("ANSICON") is not None or "WT_SESSION" in os.environ
    else:
        # Unix-like systems
        return hasattr(sys.stdout, "isatty") and sys.stdout.isatty()

COLORS_AVAILABLE = supports_color()

class TraceManager:
    """
    Manages tracing of function calls and data, persisting trace entries to an SQLite database.
    Implements a singleton pattern to ensure a single instance.
    """
    _instance = None

    def __new__(cls, *args, **kwargs):
        """Return the singleton instance of TraceManager."""
        if cls._instance is None:
            cls._instance = super(TraceManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, db_path="traces2.db", colored_logging=True):
        """
        Initialize the TraceManager with a specified SQLite database.
        
        Args:
            db_path (str): Path to the SQLite database file.
            colored_logging (bool): Whether to use colored logging in the terminal.
        """
        if self._initialized:
            return

        self.db_path = db_path
        self.traces = []
        self.last_save_time = time.time()
        self.save_interval = 5
        self._initialized = True
        self.colored_logging = colored_logging and COLORS_AVAILABLE
        self.active_traces = {}  # Track active traces with their spinner state
        self.spinner_thread = None
        self.spinner_running = False
        self.spinner_lock = threading.Lock()

        atexit.register(self.save_traces)
        
        if self.colored_logging:
            self._start_spinner_thread()

        try:
            self.conn = sqlite3.connect(self.db_path)
            self.conn.execute("PRAGMA foreign_keys = ON")
            self.cursor = self.conn.cursor()
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS traces (
                    id TEXT PRIMARY KEY,
                    session_id TEXT,
                    timestamp TEXT,
                    trace_type TEXT,
                    function_name TEXT,
                    tags TEXT,
                    data JSON
                )
            ''')
            self.cursor.execute('CREATE INDEX IF NOT EXISTS idx_timestamp ON traces(timestamp)')
            self.cursor.execute('CREATE INDEX IF NOT EXISTS idx_type ON traces(trace_type)')
            self.conn.commit()
            logging.info(f"Initialized SQLite database at {self.db_path}")
        except Exception as e:
            logging.error(f"Error initializing SQLite database: {str(e)}")
            self.conn = None
            
    def _start_spinner_thread(self):
        """Start the background thread for updating spinners in the terminal."""
        if not self.spinner_thread:
            self.spinner_running = True
            self.spinner_thread = threading.Thread(target=self._update_spinners, daemon=True)
            self.spinner_thread.start()
            
    def _update_spinners(self):
        """Update the spinner animation for active traces in the terminal."""
        spinner_chars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
        idx = 0
        
        while self.spinner_running:
            with self.spinner_lock:
                for trace_id, trace_info in list(self.active_traces.items()):
                    if trace_info['active']:
                        elapsed = time.time() - trace_info['start_time']
                        spinner = spinner_chars[idx % len(spinner_chars)]
                        
                        # Clear the line and print the updated spinner
                        if sys.stdout.isatty():  # Only if running in a terminal
                            sys.stdout.write(f"\r{Colors.CYAN}{spinner} {trace_info['function_name']} "
                                            f"({elapsed:.2f}s){Colors.RESET}{' ' * 20}")
                            sys.stdout.flush()
            
            idx += 1
            time.sleep(0.1)
    
    def _log_trace_start(self, func_name, session_id):
        """Log the start of a trace with colored output."""
        if not self.colored_logging:
            return
            
        with self.spinner_lock:
            self.active_traces[session_id] = {
                'function_name': func_name,
                'start_time': time.time(),
                'active': True
            }
            
    def _log_trace_end(self, func_name, session_id, duration_ms, success=True):
        """Log the end of a trace with colored output."""
        if not self.colored_logging:
            return
            
        with self.spinner_lock:
            if session_id in self.active_traces:
                self.active_traces[session_id]['active'] = False
                
                # Clear the spinner line
                if sys.stdout.isatty():
                    sys.stdout.write("\r" + " " * 80 + "\r")
                    
                # Print completion message
                color = Colors.GREEN if success else Colors.RED
                status = "✓" if success else "✗"
                print(f"{color}{status} {func_name} completed in {duration_ms:.2f}ms{Colors.RESET}")

    def add_trace(self, trace_type, func_name, args=None, kwargs=None, result=None, duration=None, tool_eval=None, tags=None, session_id=None):
        """
        Add a trace entry to the internal collection.
        
        If an END trace is provided, attempts to merge with a matching START trace.
        
        Args:
            trace_type (str): The type of the trace (e.g., "START", "END").
            func_name (str): The name of the function being traced.
            args (optional): Positional arguments of the function.
            kwargs (optional): Keyword arguments of the function.
            result (optional): The result of the function call.
            duration (optional): The duration of the function call in milliseconds.
            tool_eval (optional): Evaluation result of tool output.
            tags (optional): Tags associated with the trace.
            session_id (optional): Session identifier to group related traces.
            
        Returns:
            str: The session_id associated with the trace.
        """
        trace_id = f"{datetime.now().isoformat()}_{id(trace_type)}"
        timestamp = datetime.now().isoformat()
        if not session_id:
            session_id = str(uuid.uuid4())

        data = {}
        if args is not None:
            data["args"] = self._sanitize_for_json(args)
        if kwargs is not None:
            data["kwargs"] = self._sanitize_for_json(kwargs)
        if result is not None:
            data["result"] = self._sanitize_for_json(result)
        if duration is not None:
            data["duration_ms"] = duration
        if tool_eval is not None:
            data["tool_eval"] = tool_eval

        trace_entry = {
            "id": trace_id,
            "session_id": session_id,
            "timestamp": timestamp,
            "trace_type": trace_type,
            "function_name": func_name,
            "tags": json.dumps(tags) if tags else None,
            "data": json.dumps(data)
        }
        
        # Log trace start with spinner
        if trace_type == "START":
            self._log_trace_start(func_name, session_id)

        if trace_type == "END" and self.traces:
            for i, trace in enumerate(self.traces):
                if (trace["function_name"] == func_name and 
                    trace["session_id"] == session_id and 
                    trace["trace_type"] == "START"):
                    start_data = json.loads(trace["data"])
                    start_data.update(data)
                    self.traces[i]["data"] = json.dumps(start_data)
                    self.traces[i]["trace_type"] = "COMPLETE"
                    
                    # Log trace end with completion status
                    success = True
                    if tool_eval and not tool_eval.get("success", True):
                        success = False
                    self._log_trace_end(func_name, session_id, duration, success)
                    
                    current_time = time.time()
                    if current_time - self.last_save_time > self.save_interval:
                        self.save_traces()
                        self.last_save_time = current_time
                    return session_id

        self.traces.append(trace_entry)
        current_time = time.time()
        if current_time - self.last_save_time > self.save_interval:
            self.save_traces()
            self.last_save_time = current_time

        return session_id

    def _sanitize_for_json(self, obj):
        """
        Recursively sanitize an object so that it is JSON-serializable.
        
        Args:
            obj: The object to sanitize.
            
        Returns:
            A JSON-serializable version of the object.
        """
        if isinstance(obj, (str, int, float, bool, type(None))):
            return obj
        elif isinstance(obj, (list, tuple)):
            return [self._sanitize_for_json(item) for item in obj]
        elif isinstance(obj, dict):
            return {str(k): self._sanitize_for_json(v) for k, v in obj.items()}
        elif hasattr(obj, '__dict__'):
            # Handle objects with __dict__ attribute (like OpenAI response objects)
            return self._sanitize_for_json(obj.__dict__)
        elif hasattr(obj, 'model_dump'):
            # Handle Pydantic models (OpenAI v1+ responses)
            return self._sanitize_for_json(obj.model_dump())
        else:
            return str(obj)

    def save_traces(self):
        """
        Persist the collected traces to the SQLite database and clear the internal trace list.
        """
        if not self.traces or self.conn is None:
            return

        try:
            self.conn.execute("BEGIN TRANSACTION")
            for trace in self.traces:
                self.cursor.execute('''
                    INSERT OR REPLACE INTO traces 
                    (id, session_id, timestamp, trace_type, function_name, tags, data)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    trace["id"],
                    trace["session_id"],
                    trace["timestamp"],
                    trace["trace_type"],
                    trace["function_name"],
                    trace["tags"],
                    trace["data"]
                ))
            self.conn.commit()
            trace_count = len(self.traces)
            self.traces = []
            logging.info(f"Saved {trace_count} traces to SQLite at {self.db_path}")
        except Exception as e:
            logging.error(f"Error saving traces to SQLite: {str(e)}")
            self.conn.rollback()

    def get_traces(self, limit=100, trace_type=None, tag=None, function_name=None, session_id=None):
        """
        Retrieve traces from the SQLite database using various filtering options.
        
        Args:
            limit (int): Maximum number of traces to retrieve.
            trace_type (str, optional): Filter by trace type.
            tag (str, optional): Filter by tag.
            function_name (str, optional): Filter by function name.
            session_id (str, optional): Filter by session identifier.
            
        Returns:
            list: A list of trace dictionaries.
        """
        if self.conn is None:
            return []

        traces = []
        try:
            query = "SELECT id, session_id, timestamp, trace_type, function_name, tags, data FROM traces"
            conditions = []
            params = []
            if trace_type:
                conditions.append("trace_type = ?")
                params.append(trace_type)
            if tag:
                conditions.append("tags LIKE ?")
                params.append(f'%"{tag}"%')
            if function_name:
                conditions.append("function_name = ?")
                params.append(function_name)
            if session_id:
                conditions.append("session_id = ?")
                params.append(session_id)
            if conditions:
                query += " WHERE " + " AND ".join(conditions)
            query += " ORDER BY timestamp DESC LIMIT ?"
            params.append(limit)

            self.cursor.execute(query, params)
            rows = self.cursor.fetchall()
            for row in rows:
                data = json.loads(row[6]) if row[6] else {}
                tags_val = json.loads(row[5]) if row[5] else None
                trace = {
                    "id": row[0],
                    "session_id": row[1],
                    "timestamp": row[2],
                    "type": row[3],
                    "function": row[4],
                    "tags": tags_val
                }
                trace.update(data)
                traces.append(trace)
            return traces
        except Exception as e:
            logging.error(f"Error retrieving traces from SQLite: {str(e)}")
            return []

    def __del__(self):
        """
        Destructor for TraceManager that saves any pending traces and closes the database connection.
        """
        if hasattr(self, 'spinner_running'):
            self.spinner_running = False
            
        if hasattr(self, 'conn') and self.conn:
            self.save_traces()
            self.conn.close()

    def evaluate_tool_output(self, output, schema):
        """
        Evaluate whether the output from a tool matches the expected schema.
        
        Args:
            output: The output from a tool, as a dict or JSON string.
            schema (dict): The JSON schema the output is expected to satisfy.
            
        Returns:
            dict: A dictionary with the evaluation status and error details if applicable.
        """
        try:
            if isinstance(output, str):
                try:
                    output = json.loads(output)
                except json.JSONDecodeError:
                    return {"success": False, "errors": ["Output is not valid JSON"]}
            if "required" in schema:
                for field in schema["required"]:
                    if field not in output:
                        return {"success": False, "errors": [f"Missing required field: {field}"]}
            if "properties" in schema:
                for prop_name, prop_schema in schema["properties"].items():
                    if prop_name in output:
                        prop_value = output[prop_name]
                        expected_type = prop_schema.get("type")
                        if expected_type == "string" and not isinstance(prop_value, str):
                            return {"success": False, "errors": [f"Field {prop_name} should be a string"]}
                        elif expected_type == "number" and not isinstance(prop_value, (int, float)):
                            return {"success": False, "errors": [f"Field {prop_name} should be a number"]}
                        elif expected_type == "integer" and not isinstance(prop_value, int):
                            return {"success": False, "errors": [f"Field {prop_name} should be an integer"]}
                        elif expected_type == "boolean" and not isinstance(prop_value, bool):
                            return {"success": False, "errors": [f"Field {prop_name} should be a boolean"]}
                        elif expected_type == "array" and not isinstance(prop_value, list):
                            return {"success": False, "errors": [f"Field {prop_name} should be an array"]}
                        elif expected_type == "object" and not isinstance(prop_value, dict):
                            return {"success": False, "errors": [f"Field {prop_name} should be an object"]}
            return {"success": True, "errors": []}
        except Exception as e:
            return {"success": False, "errors": [f"Error evaluating tool output: {str(e)}"]}

    def trace(self, func=None, *, tags=None, session_id=None):
        """
        Decorator to trace function execution, automatically selecting asynchronous or synchronous tracing.
        
        Can be used as: @trace or @trace(tags=["tag1", "tag2"], session_id="some-id").
        
        Args:
            func (callable, optional): The function to decorate.
            tags (list, optional): A list of tags to associate with the trace.
            session_id (str, optional): The session identifier.
            
        Returns:
            callable: The decorated function.
        """
        if func is not None:
            return self._apply_trace(func, tags=tags or [], session_id=session_id)

        def decorator(func):
            return self._apply_trace(func, tags=tags or [], session_id=session_id)
        return decorator

    def _apply_trace(self, func, tags=None, session_id=None):
        """
        Apply the appropriate trace decorator based on whether the function is asynchronous.
        
        Args:
            func (callable): The function to decorate.
            tags (list, optional): List of tags for the trace.
            session_id (str, optional): Session identifier.
            
        Returns:
            callable: The wrapped function.
        """
        if inspect.iscoroutinefunction(func):
            return self._trace_async(func, tags, session_id)
        else:
            return self._trace_sync(func, tags, session_id)

    def _trace_async(self, func, tags=None, session_id=None):
        """
        Asynchronous decorator to log function start and end, including arguments and results.
        
        Args:
            func (callable): The asynchronous function to decorate.
            tags (list, optional): Tags for the trace.
            session_id (str, optional): Session identifier.
            
        Returns:
            callable: The wrapped asynchronous function.
        """
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            trace_enabled = True
            if args and hasattr(args[0], "trace_enabled"):
                trace_enabled = getattr(args[0], "trace_enabled", True)
                self_obj = args[0]
            else:
                self_obj = None

            start_time = time.time()
            if trace_enabled:
                sig = inspect.signature(func)
                param_names = list(sig.parameters.keys())
                args_dict = {}
                offset = 1 if self_obj else 0
                for i, arg in enumerate(args[offset:], offset):
                    if i < len(param_names):
                        args_dict[param_names[i]] = arg
                    else:
                        args_dict[f"arg{i}"] = arg
                current_session_id = self.add_trace("START", func.__name__, args_dict, kwargs, tags=tags, session_id=session_id)

            result = await func(*args, **kwargs)
            if trace_enabled:
                duration_ms = (time.time() - start_time) * 1000
                standardized_result = result
                if isinstance(result, tuple) and len(result) >= 2:
                    processed_response, raw_response = result[0], result[1]
                    standardized_result = {
                        "processed_response": processed_response,
                        "raw_response": raw_response
                    }
                tool_eval = None
                tools = kwargs.get("tools")
                if tools and isinstance(tools, list) and len(tools) > 0:
                    tool = tools[0]
                    if "input_schema" in tool:
                        schema = tool["input_schema"]
                        if isinstance(standardized_result, dict) and "processed_response" in standardized_result:
                            output_to_evaluate = standardized_result["processed_response"]
                        elif isinstance(result, tuple) and len(result) > 0:
                            output_to_evaluate = result[0]
                        else:
                            output_to_evaluate = result
                        if isinstance(output_to_evaluate, (dict, str)):
                            tool_eval = self.evaluate_tool_output(output_to_evaluate, schema)
                            if tool_eval["success"]:
                                logging.info(f"TOOL EVAL: {func.__name__} - Schema validation PASSED")
                            else:
                                logging.warning(f"TOOL EVAL: {func.__name__} - Schema validation FAILED: {tool_eval['errors']}")
                logging.info(f"TRACE END: {func.__name__} - result: {standardized_result!r}")
                self.add_trace("END", func.__name__, result=standardized_result, duration=duration_ms, tool_eval=tool_eval, tags=tags, session_id=current_session_id)
            return result
        return wrapper

    def _trace_sync(self, func, tags=None, session_id=None):
        """
        Synchronous decorator to log function execution details including arguments and result.
        
        Args:
            func (callable): The synchronous function to decorate.
            tags (list, optional): Tags for the trace.
            session_id (str, optional): Session identifier.
            
        Returns:
            callable: The wrapped synchronous function.
        """
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            trace_enabled = True
            if args and hasattr(args[0], "trace_enabled"):
                trace_enabled = getattr(args[0], "trace_enabled", True)
                self_obj = args[0]
            else:
                self_obj = None

            start_time = time.time()
            if trace_enabled:
                sig = inspect.signature(func)
                param_names = list(sig.parameters.keys())
                args_dict = {}
                offset = 1 if self_obj else 0
                for i, arg in enumerate(args[offset:], offset):
                    if i < len(param_names):
                        args_dict[param_names[i]] = arg
                    else:
                        args_dict[f"arg{i}"] = arg
                current_session_id = self.add_trace("START", func.__name__, args_dict, kwargs, tags=tags, session_id=session_id)

            result = func(*args, **kwargs)
            if trace_enabled:
                duration_ms = (time.time() - start_time) * 1000
                standardized_result = result
                
                # Handle streaming responses
                is_streaming = False
                streaming_summary = None
                if "stream" in kwargs and kwargs["stream"] is True:
                    is_streaming = True
                
                # Check if result is a dict with streaming_events
                if isinstance(result, dict) and "streaming_events" in result:
                    is_streaming = True
                    # Create a summary of streaming events
                    event_types = {}
                    for event in result.get("streaming_events", []):
                        event_type = getattr(event, "type", str(type(event)))
                        event_types[event_type] = event_types.get(event_type, 0) + 1
                    
                    streaming_summary = {
                        "is_streaming": True,
                        "event_count": len(result.get("streaming_events", [])),
                        "event_types": event_types,
                        "full_response": result.get("full_response", "")
                    }
                    
                    # Replace the full event list with the summary to avoid huge traces
                    if "streaming_events" in result:
                        result_copy = result.copy()
                        result_copy["streaming_events"] = f"[{len(result['streaming_events'])} events]"
                        standardized_result = result_copy
                
                if isinstance(result, tuple) and len(result) >= 2:
                    processed_response, raw_response = result[0], result[1]
                    standardized_result = {
                        "processed_response": processed_response,
                        "raw_response": raw_response
                    }
                
                tool_eval = None
                tools = kwargs.get("tools")
                if tools and isinstance(tools, list) and len(tools) > 0:
                    tool = tools[0]
                    if "input_schema" in tool:
                        schema = tool["input_schema"]
                        if isinstance(standardized_result, dict) and "processed_response" in standardized_result:
                            output_to_evaluate = standardized_result["processed_response"]
                        elif isinstance(result, tuple) and len(result) > 0:
                            output_to_evaluate = result[0]
                        else:
                            output_to_evaluate = result
                        if isinstance(output_to_evaluate, (dict, str)):
                            tool_eval = self.evaluate_tool_output(output_to_evaluate, schema)
                            if tool_eval["success"]:
                                logging.info(f"TOOL EVAL: {func.__name__} - Schema validation PASSED")
                            else:
                                logging.warning(f"TOOL EVAL: {func.__name__} - Schema validation FAILED: {tool_eval['errors']}")
                
                trace_data = {
                    "result": standardized_result,
                    "duration": duration_ms,
                    "tool_eval": tool_eval
                }
                
                # Add streaming summary if available
                if streaming_summary:
                    trace_data["streaming_summary"] = streaming_summary
                
                logging.info(f"TRACE END: {func.__name__} - result: {standardized_result!r}")
                self.add_trace("END", func.__name__, result=standardized_result, duration=duration_ms, 
                              tool_eval=tool_eval, tags=tags, session_id=current_session_id)
            
            return result
        return wrapper

class TracerEval:
    """
    Performs evaluation of a task function over test cases, logging events and results via TraceManager.
    
    Supports scoring of outputs and optional tracking of tools including schema evaluation.
    """
    def __init__(self, name: str, data, task, scores, trial_count: int = 1,
                 track_tools: bool = False, tools=None, session_id=None, **task_kwargs):
        """
        Initialize the evaluation process.
        
        Args:
            name (str): Name of the evaluation.
            data (callable): Function that returns the test cases.
            task (callable): The task function to evaluate.
            scores (list): List of scoring functions.
            trial_count (int): Number of evaluation trials to perform.
            track_tools (bool): Whether to track tools and schema validations.
            tools (list, optional): List of tools to use.
            session_id (str, optional): Session identifier.
            **task_kwargs: Additional keyword arguments for the task.
        """
        self.name = name
        self.data = data
        self.task = task
        self.scores = scores
        self.trial_count = trial_count
        self.results = []
        self.track_tools = track_tools
        self.tools = tools or []
        self.tool_summary = {"total_tool_calls": 0, "successful_tool_calls": 0, "score": None}
        self.session_id = session_id or str(uuid.uuid4())
        self.task_kwargs = task_kwargs
        self.score_functions_code = self._extract_score_functions_code()

        if task_kwargs or (track_tools and tools):
            if inspect.iscoroutinefunction(task):
                self.wrapped_task = self._wrap_async_task()
            else:
                self.wrapped_task = self._wrap_sync_task()
        else:
            self.wrapped_task = task

    def _wrap_sync_task(self):
        """
        Wrap a synchronous task function to include additional keyword arguments and tools.
        
        Returns:
            callable: A partially applied synchronous function.
        """
        kwargs = self.task_kwargs.copy()
        if self.track_tools and self.tools:
            kwargs["tools"] = self.tools
        return partial(self.task, **kwargs)

    def _wrap_async_task(self):
        """
        Wrap an asynchronous task function to include additional keyword arguments and tools.
        
        Returns:
            callable: An asynchronous wrapper function.
        """
        kwargs = self.task_kwargs.copy()
        if self.track_tools and self.tools:
            kwargs["tools"] = self.tools

        async def wrapped_async_task(input_text):
            return await self.task(input_text, **kwargs)
        return wrapped_async_task

    def _extract_score_functions_code(self):
        """
        Extract the source code of each scoring function.
        
        Returns:
            dict: A mapping of scorer names to their source code.
        """
        score_functions_code = {}
        for scorer in self.scores:
            try:
                scorer_name = getattr(scorer, "name", str(scorer))
                source_code = inspect.getsource(scorer)
                score_functions_code[scorer_name] = source_code
            except Exception as e:
                score_functions_code[scorer_name] = f"Could not extract source code: {str(e)}"
        return score_functions_code

    async def run(self):
        """
        Execute the evaluation on all test cases for the specified trials.
        
        Creates evaluation event and result tables if necessary, logs each evaluation step,
        and saves the final results to the database.
        
        Returns:
            dict: The final evaluation data including results, tool summary, and metadata.
        """
        import inspect
        import time

        tm = TraceManager()

        if tm.conn:
            try:
                tm.cursor.execute('''
                    CREATE TABLE IF NOT EXISTS eval_events (
                        id TEXT PRIMARY KEY,
                        eval_id TEXT,
                        session_id TEXT,
                        timestamp TEXT,
                        event_type TEXT,
                        name TEXT,
                        data JSON
                    )
                ''')
                tm.cursor.execute('''
                    CREATE TABLE IF NOT EXISTS eval_results (
                        id TEXT PRIMARY KEY,
                        name TEXT,
                        timestamp TEXT,
                        trial_count INTEGER,
                        session_id TEXT,
                        data JSON
                    )
                ''')
                tm.conn.commit()
            except Exception as e:
                logging.error(f"Error creating eval tables: {str(e)}")

        def log_eval_event(event_type, data):
            """
            Helper function to log evaluation events to the database.
            
            Args:
                event_type (str): The type of the event.
                data (dict): Data associated with the event.
            """
            if not tm.conn:
                return
            try:
                event_id = f"eval_event_{datetime.now().isoformat()}_{id(event_type)}"
                json_data = json.dumps(tm._sanitize_for_json(data))
                tm.cursor.execute('''
                    INSERT INTO eval_events 
                    (id, eval_id, session_id, timestamp, event_type, name, data)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    event_id,
                    eval_id,
                    self.session_id,
                    datetime.now().isoformat(),
                    event_type,
                    self.name,
                    json_data
                ))
                tm.conn.commit()
            except Exception as e:
                logging.error(f"Error logging eval event: {str(e)}")
                if tm.conn:
                    tm.conn.rollback()

        eval_id = f"eval_{self.name}_{datetime.now().isoformat()}"
        log_eval_event("EVAL_START", {"trial_count": self.trial_count})

        test_cases = self.data()

        for trial in range(self.trial_count):
            for case in test_cases:
                test_input = case.get("input", "")
                start_time = time.time()
                if inspect.iscoroutinefunction(self.wrapped_task):
                    output = await self.wrapped_task(test_input)
                else:
                    output = self.wrapped_task(test_input)
                duration = (time.time() - start_time) * 1000

                score_results = {}
                for scorer in self.scores:
                    try:
                        scorer_name = getattr(scorer, "name", str(scorer))
                        score_results[scorer_name] = scorer(output)
                    except Exception as e:
                        score_results[scorer_name] = {"success": False, "error": str(e)}

                tool_info = {}
                if self.track_tools and self.tools:
                    if isinstance(output, tuple) and len(output) >= 2:
                        processed_output = output[0]
                        raw_output = output[1]
                        tool_evals = []
                        tools_passed = [tool.get("name", "unnamed") for tool in self.tools]
                        tool_called = None
                        for i, tool in enumerate(self.tools):
                            if "input_schema" in tool:
                                schema = tool["input_schema"]
                                eval_result = tm.evaluate_tool_output(processed_output, schema)
                                tool_evals.append(eval_result)
                                if eval_result.get("success", False):
                                    tool_called = tool.get("name", f"tool_{i}")
                        any_schema_valid = any(te.get("success", False) for te in tool_evals) if tool_evals else False
                        tool_info = {
                            "tools_passed": tools_passed,
                            "tool_called": tool_called,
                            "tool_evals": tool_evals,
                            "schema_valid": any_schema_valid
                        }
                        self.tool_summary["total_tool_calls"] += 1
                        if any_schema_valid:
                            self.tool_summary["successful_tool_calls"] += 1

                result_entry = {
                    "input": test_input,
                    "output": tm._sanitize_for_json(output),
                    "duration_ms": duration,
                    "scores": score_results,
                    "trial": trial
                }
                if tool_info:
                    result_entry["tool_info"] = tool_info

                self.results.append(result_entry)
                log_eval_event("EVAL_STEP", {
                    "input": test_input,
                    "output": output,
                    "duration_ms": duration,
                    "scores": score_results,
                    "trial": trial,
                    **({"tool_info": tool_info} if tool_info else {})
                })

        if self.track_tools and self.tool_summary["total_tool_calls"] > 0:
            self.tool_summary["score"] = (
                self.tool_summary["successful_tool_calls"] / self.tool_summary["total_tool_calls"]
            )
        else:
            self.tool_summary["score"] = None

        output_data = {
            "eval_results": self.results,
            "tool_summary": self.tool_summary if self.track_tools else None,
            "score_functions_code": self.score_functions_code,
            "metadata": {
                "name": self.name,
                "trial_count": self.trial_count,
                "test_case_count": len(test_cases),
                "timestamp": datetime.now().isoformat(),
                "track_tools": self.track_tools
            }
        }

        if tm.conn:
            try:
                json_data = json.dumps(tm._sanitize_for_json(output_data))
                tm.cursor.execute('''
                    INSERT OR REPLACE INTO eval_results 
                    (id, name, timestamp, trial_count, session_id, data)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    eval_id,
                    self.name,
                    datetime.now().isoformat(),
                    self.trial_count,
                    self.session_id,
                    json_data
                ))
                tm.conn.commit()
                logging.info(f"Saved evaluation results to SQLite with ID: {eval_id}")
            except Exception as e:
                logging.error(f"Error saving evaluation results to SQLite: {str(e)}")
                if tm.conn:
                    tm.conn.rollback()

        log_eval_event("EVAL_END", {"results_count": len(self.results)})
        return output_data

    @staticmethod
    def get_eval_results(eval_id=None, name=None, session_id=None, limit=10):
        """
        Retrieve evaluation results from the database with optional filtering.
        
        Args:
            eval_id (str, optional): Filter by evaluation ID.
            name (str, optional): Filter by evaluation name.
            session_id (str, optional): Filter by session ID.
            limit (int): Maximum number of results to return.
            
        Returns:
            list: A list of evaluation result dictionaries.
        """
        tm = TraceManager()
        if not tm.conn:
            return []

        results = []
        try:
            query = "SELECT id, name, timestamp, trial_count, session_id, data FROM eval_results"
            conditions = []
            params = []
            if eval_id:
                conditions.append("id = ?")
                params.append(eval_id)
            if name:
                conditions.append("name = ?")
                params.append(name)
            if session_id:
                conditions.append("session_id = ?")
                params.append(session_id)
            if conditions:
                query += " WHERE " + " AND ".join(conditions)
            query += " ORDER BY timestamp DESC LIMIT ?"
            params.append(limit)

            tm.cursor.execute(query, params)
            rows = tm.cursor.fetchall()
            for row in rows:
                data = json.loads(row[5]) if row[5] else {}
                result = {
                    "id": row[0],
                    "name": row[1],
                    "timestamp": row[2],
                    "trial_count": row[3],
                    "session_id": row[4],
                    **data
                }
                results.append(result)
            return results
        except Exception as e:
            logging.error(f"Error retrieving evaluation results from SQLite: {str(e)}")
            return []

    @staticmethod
    def get_eval_events(eval_id=None, session_id=None, event_type=None, limit=100):
        """
        Retrieve evaluation events from the database with optional filtering.
        
        Args:
            eval_id (str, optional): Filter by evaluation ID.
            session_id (str, optional): Filter by session ID.
            event_type (str, optional): Filter by event type.
            limit (int): Maximum number of events to return.
            
        Returns:
            list: A list of evaluation event dictionaries.
        """
        tm = TraceManager()
        if not tm.conn:
            return []

        events = []
        try:
            query = "SELECT id, eval_id, session_id, timestamp, event_type, name, data FROM eval_events"
            conditions = []
            params = []
            if eval_id:
                conditions.append("eval_id = ?")
                params.append(eval_id)
            if session_id:
                conditions.append("session_id = ?")
                params.append(session_id)
            if event_type:
                conditions.append("event_type = ?")
                params.append(event_type)
            if conditions:
                query += " WHERE " + " AND ".join(conditions)
            query += " ORDER BY timestamp DESC LIMIT ?"
            params.append(limit)

            tm.cursor.execute(query, params)
            rows = tm.cursor.fetchall()
            for row in rows:
                data = json.loads(row[6]) if row[6] else {}
                event = {
                    "id": row[0],
                    "eval_id": row[1],
                    "session_id": row[2],
                    "timestamp": row[3],
                    "event_type": row[4],
                    "name": row[5],
                    **data
                }
                events.append(event)
            return events
        except Exception as e:
            logging.error(f"Error retrieving evaluation events from SQLite: {str(e)}")
            return []

    def __str__(self):
        """
        Return a formatted string summary of the evaluation results.
        
        Returns:
            str: A summary string.
        """
        summary = f"TracerEval(name={self.name}, trial_count={self.trial_count}, results=[\n"
        for res in self.results:
            summary += (
                f"  Input: {res['input']}\n"
                f"  Output: {res['output']}\n"
                f"  Duration: {res['duration_ms']} ms\n"
                f"  Scores: {res['scores']}\n"
            )
            if "tool_info" in res:
                summary += f"  Tool Info: {res['tool_info']}\n"
            summary += "\n"
        summary += "])"
        if self.track_tools:
            summary += f"\nTool Summary: {self.tool_summary}"
        return summary
