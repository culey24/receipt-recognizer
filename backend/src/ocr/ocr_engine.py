from src.core.config import get_settings
from src.ocr.openrouter_strategy import OpenRouterOCRStrategy


def get_ocr_strategy() -> OpenRouterOCRStrategy:
    settings = get_settings()
    provider = settings.ocr_provider.strip().lower()
    if provider != "openrouter":
        raise ValueError(f"Unsupported OCR provider: {settings.ocr_provider}")
    return OpenRouterOCRStrategy(settings)


async def extract_invoice_data(image_bytes: bytes, mime_type: str) -> tuple[dict, str]:
    strategy = get_ocr_strategy()
    return await strategy.extract_invoice_data(image_bytes=image_bytes, mime_type=mime_type)
