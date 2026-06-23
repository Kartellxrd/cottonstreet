import os
import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

router = APIRouter(
    prefix="/chat",
    tags=["Chatbot"]
)

# Request schema matching the Anthropic API structure sent by the frontend
class ChatRequest(BaseModel):
    model: str = Field(default="claude-3-5-sonnet-20241022") # Updated to standard API model naming
    max_tokens: int = Field(default=1000)
    system: str
    messages: list

@router.post("")
async def proxy_chat_to_claude(payload: ChatRequest):
    """
    Proxies chat assistant requests securely to the Anthropic API,
    keeping the ANTHROPIC_API_KEY hidden from the frontend.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Anthropic API key is not configured on the server."
        )

    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }

    # Use an async client to prevent blocking the FastAPI event loop
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                url,
                headers=headers,
                json=payload.model_dump(),
                timeout=30.0
            )
            
            # If Anthropic returns an error, forward it responsibly
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Anthropic API responded with an error: {response.text}"
                )
                
            return response.json()

        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"An error occurred while requesting Claude: {exc}"
            )