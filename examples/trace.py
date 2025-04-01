from agenttrace import TraceManager, TracerEval

tracer = TraceManager(db_path="traces.db")

########################################################
# Synchronous function
########################################################

@tracer.trace(tags=["test", "synchronous"], session_id="simple-function-test")
def test_function(test_input: str):
    return test_input

test_function("Hello, world!")


# ########################################################
# # Asynchronous function
# ########################################################

# @tracer.trace(tags=["test", "asynchronous"], session_id="simple-async-test")
# async def test_async_function(test_input: str):
#     return test_input

# import asyncio
# asyncio.run(test_async_function("Hello, world!"))


# ########################################################
# # OpenAI Tracing
# ########################################################

# from openai import OpenAI

# @tracer.trace(tags=["sync", "openai"], session_id="simple-openai-test")
# def create_chat_completion(messages, model="gpt-4o", temperature=1, max_tokens=2048):
#     client = OpenAI(api_key="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")
#     response = client.chat.completions.create(
#         model=model,
#         messages=messages,
#         response_format={"type": "text"},
#         temperature=temperature,
#         max_completion_tokens=max_tokens,
#         top_p=1,
#     )
#     return response.choices[0].message.content

# response = create_chat_completion([{"role": "user", "content": "Hello!"}])
# print(response)


# ########################################################
# # OpenAI Tool Calling
# ########################################################

# from openai import OpenAI
# import json

# get_capital_tool = {
#     "type": "function",
#     "function": {
#         "name": "get_capital",
#         "description": "Returns the capital city of a specified country",
#         "parameters": {
#             "type": "object",
#             "required": ["country"],
#             "properties": {
#                 "country": {
#                     "type": "string",
#                     "description": "The name of the country for which to find the capital"
#                 }
#             },
#             "additionalProperties": False
#         },
#         "strict": True
#     }
# }

# @tracer.trace(tags=["sync", "openai", "tool-calling"], session_id="simple-openai-tool-calling-test")
# def openai_tool_calling(messages, model="gpt-4o", temperature=1, max_tokens=2048, tools=None):
#     client = OpenAI(api_key="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")
#     response = client.chat.completions.create(
#         model=model,
#         messages=messages,
#         response_format={"type": "text"},
#         tools=tools,
#         temperature=temperature,
#         max_completion_tokens=max_tokens,
#         top_p=1,
#         frequency_penalty=0,
#         presence_penalty=0,
#         store=False
#     )
#     if response.choices[0].message.tool_calls:
#         return json.loads(response.choices[0].message.tool_calls[0].function.arguments)
#     return response.choices[0].message.content

# response = openai_tool_calling(
#     [{"role": "user", "content": "What is the capital of France?"}],
#     tools=[get_capital_tool]
# )
# print(response)

# ########################################################
# # AsnycOpenAI Tracing
# ########################################################


# from openai import AsyncOpenAI
# import json

# get_capital_tool = {
#     "type": "function",
#     "function": {
#         "name": "get_capital",
#         "description": "Returns the capital city of a specified country",
#         "parameters": {
#             "type": "object",
#             "required": ["country"],
#             "properties": {
#                 "country": {
#                     "type": "string",
#                     "description": "The name of the country for which to find the capital"
#                 }
#             },
#             "additionalProperties": False
#         },
#         "strict": True
#     }
# }

# @tracer.trace(tags=["async", "openai", "tool-calling"], session_id="simple-openai-tool-calling-test")
# async def create_async_chat_completion(messages, model="gpt-4o", temperature=1, max_tokens=2048, tools=None):
#     client = AsyncOpenAI(api_key="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")
#     response = await client.chat.completions.create(
#         model=model,
#         messages=messages,
#         response_format={"type": "text"},
#         tools=tools,
#         temperature=temperature,
#         max_completion_tokens=max_tokens,
#         top_p=1,
#         frequency_penalty=0,
#         presence_penalty=0,
#         store=False
#     )
#     if response.choices[0].message.tool_calls:
#         return json.loads(response.choices[0].message.tool_calls[0].function.arguments)
#     return response.choices[0].message.content

# response = asyncio.run(create_async_chat_completion(
#     [{"role": "user", "content": "What is the capital of France?"}],
#     tools=[get_capital_tool]
# ))
# print(response)

# ########################################################
# # OpenAI Streaming
# ########################################################

# from openai import OpenAI

# @tracer.trace(tags=["sync", "openai", "streaming"], session_id="simple-openai-streaming-test")
# def stream_openai_response(input):
#     client = OpenAI(api_key="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")

#     stream = client.responses.create(
#         model="gpt-4o",
#         input=[
#             {
#                 "role": "user",
#                 "content": input,
#             },
#         ],
#         stream=True,
#     )

#     streaming_events = []
#     full_response = ""
    
#     for event in stream:
#         streaming_events.append(event)
#         if hasattr(event, 'type') and event.type == 'response.output_text.delta':
#             full_response += event.delta
#         print(event)
    
#     return {"full_response": full_response, "streaming_events": streaming_events}

# stream_openai_response("Say 'double bubble bath' ten times fast.")