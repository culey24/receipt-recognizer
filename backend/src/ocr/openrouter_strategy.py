import base64
import json
import re
from typing import Any

import httpx

from src.core.config import Settings, get_model_fallback_chain
from src.ocr.base import OCRInterface
from src.utils.logger import setup_logger

OCR_PROMPT_TEMPLATE = """
You are an OCR extraction engine for CBAM invoice processing.
Extract fields from the invoice image and return JSON only.

Return exactly this JSON shape (no markdown):
{
  "vendor_name": string | null,
  "invoice_number": string | null,
  "invoice_date": "YYYY-MM-DD" | null,
  "currency": string | null,
  "total_amount": number | null,
  "fuel_type": string | null,
  "product_name": string | null,
  "electricity_consumption_kwh": number | null,
  "quantity_used": number | null,
  "total_product_output": number | null,
  "precursors_emissions": number | null,
  "indirect_emissions": number | null,
  "direct_emissions": number | null,
  "line_items": [
    {
      "description": string,
      "quantity": number | null,
      "unit": string | null,
      "unit_price": number | null,
      "total_price": number | null
    }
  ]
}

Rules:
- Use null when unknown.
- currency should be ISO-4217 uppercase when possible (e.g. EUR, USD).
- Keep numeric values as numbers.
- fuel_type should be canonical when possible: RON95, DIESEL, LPG; otherwise null.
- product_name should keep the original product wording from invoice.
- quantity_used is fuel/energy consumed for process (input side).
- total_product_output is finished goods output quantity (denominator). If unavailable on receipt, return null.
- direct_emissions must be null (backend computes it from emission factor lookup).
- Do not add extra fields.
""".strip()

ELECTRICITY_BILL_PROMPT_TEMPLATE = """
You are an OCR extraction engine for CBAM electricity bill processing.
Extract fields from the electricity bill image and return JSON only.

Return exactly this JSON shape (no markdown):
{
  "vendor_name": string | null,
  "invoice_number": string | null,
  "invoice_date": "YYYY-MM-DD" | null,
  "currency": string | null,
  "total_amount": number | null,
  "fuel_type": null,
  "product_name": null,
  "electricity_consumption_kwh": number | null,
  "quantity_used": null,
  "total_product_output": null,
  "precursors_emissions": null,
  "indirect_emissions": null,
  "direct_emissions": null,
  "line_items": [
    {
      "description": string,
      "quantity": number | null,
      "unit": string | null,
      "unit_price": number | null,
      "total_price": number | null
    }
  ]
}

Rules:
- Use null when unknown.
- electricity_consumption_kwh is the total electricity consumed for the reporting period in kWh.
- If multiple kWh values exist, choose the final total consumption for the billed period.
- Keep numeric values as numbers.
- Do not infer values not clearly shown on the bill.
- Do not add extra fields.
""".strip()


class OpenRouterOCRStrategy(OCRInterface):
    def __init__(self, settings: Settings) -> None:
        super().__init__()
        self.settings = settings
        self.logger = setup_logger(self.__class__.__name__)
        self.api_key = settings.openrouter_api_key.strip()
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY is empty. Check backend/.env")

    def preprocess(self, image):
        return image

    def detect_text(self, processed_image):
        raise NotImplementedError("Not used in OpenRouterOCRStrategy async flow")

    def postprocess(self, raw_data):
        raise NotImplementedError("Not used in OpenRouterOCRStrategy async flow")

    async def extract_invoice_data(self, image_bytes: bytes, mime_type: str) -> tuple[dict[str, Any], str]:
        return await self._extract_with_prompt(
            image_bytes=image_bytes,
            mime_type=mime_type,
            system_prompt=OCR_PROMPT_TEMPLATE,
            user_instruction="Extract invoice data from this image.",
        )

    async def _extract_with_prompt(
        self,
        *,
        image_bytes: bytes,
        mime_type: str,
        system_prompt: str,
        user_instruction: str,
    ) -> tuple[dict[str, Any], str]:
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")
        model_candidates = get_model_fallback_chain(self.settings)
        if not model_candidates:
            raise ValueError("No OpenRouter model configured")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": self.settings.openrouter_site_url,
            "X-Title": self.settings.openrouter_site_name,
        }

        auto_fallback = self.settings.openrouter_auto_fallback

        async with httpx.AsyncClient(timeout=90.0) as client:
            for idx, model in enumerate(model_candidates):
                self.logger.info("OCR model attempt: %s", model)
                payload = {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": user_instruction},
                                {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{image_b64}"}},
                            ],
                        },
                    ],
                    "temperature": 0,
                }

                response = await client.post(
                    f"{self.settings.openrouter_base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )

                if response.status_code >= 400:
                    can_fallback = (
                        auto_fallback
                        and idx < len(model_candidates) - 1
                        and _is_retryable_openrouter_error(response.status_code)
                    )
                    if can_fallback:
                        continue
                    raise ValueError(f"{model}: OpenRouter error ({response.status_code}): {response.text}")

                body = response.json()
                choices = body.get("choices") or []
                if not choices:
                    if auto_fallback and idx < len(model_candidates) - 1:
                        continue
                    raise ValueError(f"{model}: OpenRouter response missing choices")

                content = _extract_text_content(choices[0].get("message", {}).get("content", ""))
                try:
                    parsed_json = _extract_json_from_text(content)
                except ValueError:
                    if auto_fallback and idx < len(model_candidates) - 1:
                        continue
                    raise

                self.logger.info("OCR model used successfully: %s", model)
                return parsed_json, model

        raise ValueError("OpenRouter call failed for all configured models")


class ElectricityBillStrategy(OpenRouterOCRStrategy):
    async def extract_invoice_data(self, image_bytes: bytes, mime_type: str) -> tuple[dict[str, Any], str]:
        return await self._extract_with_prompt(
            image_bytes=image_bytes,
            mime_type=mime_type,
            system_prompt=ELECTRICITY_BILL_PROMPT_TEMPLATE,
            user_instruction="Extract electricity bill data from this image.",
        )


def _extract_text_content(content: Any) -> str:
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        text_parts: list[str] = []
        for part in content:
            if isinstance(part, dict) and part.get("type") == "text":
                text_parts.append(str(part.get("text", "")))
        return "\n".join(text_parts)

    return str(content)


def _extract_json_from_text(text: str) -> dict[str, Any]:
    cleaned = text.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{[\s\S]*\}", cleaned)
    if not match:
        raise ValueError("OpenRouter did not return valid JSON")

    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError as exc:
        raise ValueError("Failed to parse JSON from OpenRouter response") from exc


def _is_retryable_openrouter_error(status_code: int) -> bool:
    return status_code in {408, 429, 500, 502, 503, 504}
