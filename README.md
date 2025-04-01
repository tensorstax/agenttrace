# AgentTrace

![AgentTrace](https://i.imgur.com/OAoerbl.png)

AgentTrace is a lightweight and hackable tracing/evaluation framework for AI agents and language models. It provides local monitoring and debugging capabilities, making it easier to build reliable and performant AI systems.

## Installation

You can install AgentTrace directly from PyPI:

```bash
pip install agenttrace
```

Or install from source:

```bash
git clone https://github.com/tensorstax/agenttrace.git
cd agenttrace
pip install -e .
```

## Web App

AgentTrace includes a web dashboard for visualizing and analyzing your traces and evaluations.

![AgentTrace Dashboard](https://i.imgur.com/8CkyyG8.png)

## Quick Start

### Basic Tracing


![AgentTrace Example](https://i.imgur.com/5Lg2Lda.png)


```python
from agenttrace import TraceManager, TracerEval

tracer = TraceManager(db_path="traces.db")

@tracer.trace(tags=["test", "synchronous"], session_id="simple-function-test")
def test_function(test_input: str):
    return test_input

test_function("Hello, world!")
```

### Tracing Async OpenAI API Calls with Tools

```python
from openai import AsyncOpenAI
import json

get_capital_tool = {
    "type": "function",
    "function": {
        "name": "get_capital",
        "description": "Returns the capital city of a specified country",
        "parameters": {
            "type": "object",
            "required": ["country"],
            "properties": {
                "country": {
                    "type": "string",
                    "description": "The name of the country for which to find the capital"
                }
            },
            "additionalProperties": False
        },
        "strict": True
    }
}

@tracer.trace(tags=["async", "openai", "tool-calling"], session_id="simple-openai-tool-calling-test")
async def create_async_chat_completion(messages, model="gpt-4o", temperature=1, max_tokens=2048, tools=None):
    client = AsyncOpenAI()
    response = await client.chat.completions.create(
        model=model,
        messages=messages,
        response_format={"type": "text"},
        tools=tools,
        temperature=temperature,
        max_completion_tokens=max_tokens,
        top_p=1,
        frequency_penalty=0,
        presence_penalty=0,
        store=False
    )
    if response.choices[0].message.tool_calls:
        return json.loads(response.choices[0].message.tool_calls[0].function.arguments)
    return response.choices[0].message.content

response = asyncio.run(create_async_chat_completion(
    [{"role": "user", "content": "What is the capital of France?"}],
    tools=[get_capital_tool]
))
print(response)
# You can now view the traces in the web interface with: agenttrace start
```

### Using the Evaluation Framework

AgentTrace includes a powerful evaluation framework that allows you to assess the performance of your AI agents and models. The evaluation framework helps you:

1. Define test cases with expected outputs
2. Run your agent or model against these test cases
3. Score the outputs using custom evaluation functions
4. Track performance over time

Here's a simple example of evaluating a model's ability to identify the capital of France:

![AgentTrace Evaluation Interface](https://i.imgur.com/zweI2m8.png)

```python
from agenttrace import TracerEval
import asyncio
from openai import AsyncOpenAI

client = AsyncOpenAI()

async def get_capital(input_message: str):
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": input_message}
        ]
    )
    return response.choices[0].message.content

def capital_checker(output):
    return {"score": 1.0 if "paris" in output.lower() else 0.0}

capital_checker.name = "capital_checker"

async def main():
    evaluator = TracerEval(
        name="france_capital_test",
        data=lambda: [{"input": "What is the capital of France?"}],
        task=get_capital,
        scores=[capital_checker]
    )
    
    results = await evaluator.run()
    print(f"Accuracy: {results['eval_results'][0]['scores']['capital_checker']['score']}")

if __name__ == "__main__":
    asyncio.run(main())
```

## Web Interface

agenttrace includes a web-based interface for visualizing traces and evaluation results.

### Starting the Web Interface


```bash
# Or navigate to the agenttrace/frontend directory
cd agenttrace/frontend

# Install dependencies if this is your first time
npm run install:all

# Start both the backend API and frontend interface
npm run start
```

This will start:
- The backend API server on port 3033
- The frontend web interface on port 5173

Open your browser and go to `http://localhost:5173` to access the interface.


### Customizing Trace Storage

By default, AgentTrace stores traces in a SQLite database at `traces.db` in the current directory. You can customize this:

```python
from agenttrace import TraceManager

# Use a custom database path
tm = TraceManager(db_path="/path/to/custom/traces.db")
```

### Adding Custom Tags

Tags help you categorize and filter traces:

```python
# Add tags to traces
tm.add_trace("START", "custom_operation", tags=["important", "production", "v2"])
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 
