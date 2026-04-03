from datetime import date
from enum import Enum

from pydantic import BaseModel, Field


class OCRLineItem(BaseModel):
    description: str
    quantity: float | None = None
    unit: str | None = None
    unit_price: float | None = None
    total_price: float | None = None


class OCRInvoiceData(BaseModel):
    vendor_name: str | None = None
    invoice_number: str | None = None
    invoice_date: date | None = None
    currency: str | None = Field(default=None, description="ISO-4217, e.g. EUR")
    total_amount: float | None = None
    fuel_type: str | None = None
    product_name: str | None = None
    product_output_quantity: float | None = None
    precursors_emissions: float | None = None
    indirect_emissions: float | None = None
    direct_emissions: float | None = None
    line_items: list[OCRLineItem] = Field(default_factory=list)


class CalculationStatus(str, Enum):
    completed = "COMPLETED"
    failed = "FAILED"


class CalculationResult(BaseModel):
    status: CalculationStatus
    specific_embedded_emissions: float | None = None
    total_emissions: float | None = None
    total_product_output: float | None = None
    formula: str = "(precursors_emissions + indirect_emissions + direct_emissions) / total_product_output"
    reason: str | None = None


class OCRExtractResponse(BaseModel):
    success: bool
    model_used: str
    data: OCRInvoiceData
    calculation: CalculationResult | None = None
