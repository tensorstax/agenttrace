from agenttrace import TracerEval
import asyncio
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key="your-api-key-here")

async def get_capital(input_message: str):
    """Ask LLM for a capital city"""
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": input_message}
        ]
    )
    return response.choices[0].message.content

def capital_checker(output):
    """Check if Paris is mentioned in the response"""
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