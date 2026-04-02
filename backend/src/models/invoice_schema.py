from datetime import date

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
    line_items: list[OCRLineItem] = Field(default_factory=list)


class OCRExtractResponse(BaseModel):
    success: bool
    model_used: str
    data: OCRInvoiceData
