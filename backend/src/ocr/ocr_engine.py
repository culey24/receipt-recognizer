from src.core.config import get_settings
from src.models.job_schema import DocumentType
from src.ocr.openrouter_strategy import ElectricityBillStrategy, OpenRouterOCRStrategy


def get_ocr_strategy(document_type: DocumentType = DocumentType.fuel_invoice) -> OpenRouterOCRStrategy:
    settings = get_settings()
    provider = settings.ocr_provider.strip().lower()
    if provider != "openrouter":
        raise ValueError(f"Unsupported OCR provider: {settings.ocr_provider}")
    if document_type == DocumentType.electricity_bill:
        return ElectricityBillStrategy(settings)
    return OpenRouterOCRStrategy(settings)


async def extract_invoice_data(
    image_bytes: bytes,
    mime_type: str,
    document_type: DocumentType = DocumentType.fuel_invoice,
) -> tuple[dict, str]:
    strategy = get_ocr_strategy(document_type=document_type)
    return await strategy.extract_invoice_data(image_bytes=image_bytes, mime_type=mime_type)
