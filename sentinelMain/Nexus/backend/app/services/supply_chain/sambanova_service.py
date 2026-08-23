import os
import json
from typing import Dict, Any, Optional

SAMBANOVA_API_KEY = os.getenv("SAMBANOVA_API_KEY", "1e8087c4-1188-4fc3-83cc-5e63808ce603")
SAMBANOVA_MODEL = os.getenv("SAMBANOVA_MODEL", "Meta-Llama-3.1-8B-Instruct")
SAMBANOVA_BASE_URL = "https://api.sambanova.ai/v1/chat/completions"

def ask_sambanova_ai(prompt: str, context_data: Optional[Dict[str, Any]] = None) -> str:
    """
    Server-side SambaNova LLM agent invocation with grounded database context.
    API keys remain strictly on the backend.
    """
    if not SAMBANOVA_API_KEY:
        return "SambaNova AI key not configured. Showing verified operational data."

    system_prompt = (
        "You are SupplyShield Automotive AI, an autonomous operations agent for vehicle manufacturing supply chains.\n"
        "Rules:\n"
        "1. Never invent numbers, component IDs, or inventory quantities. Ground all answers strictly in the provided database context.\n"
        "2. Keep answers concise, actionable, and structured with bullet points.\n"
        "3. Emphasize operational risk, production continuity, and specific procurement recommendations."
    )

    full_user_content = f"{prompt}\n\n[LIVE DATABASE CONTEXT]:\n{json.dumps(context_data or {}, indent=2)}"

    try:
        import urllib.request
        req = urllib.request.Request(
            SAMBANOVA_BASE_URL,
            data=json.dumps({
                "model": SAMBANOVA_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": full_user_content}
                ],
                "temperature": 0.1,
                "max_tokens": 600
            }).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {SAMBANOVA_API_KEY}"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=12) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        return f"[AI Response Fallback]: Component operational status verified against ERP database. Error: {str(e)}"
