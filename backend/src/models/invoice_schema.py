from datetime import date
from enum import Enum

from pydantic import BaseModel, Field, model_validator


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
    electricity_consumption_kwh: float | None = None
    quantity_used: float | None = None
    total_product_output: float | None = None
    # Legacy field from earlier MVP versions; kept for backward compatibility.
    product_output_quantity: float | None = None
    precursors_emissions: float | None = None
    indirect_emissions: float | None = None
    direct_emissions: float | None = None
    line_items: list[OCRLineItem] = Field(default_factory=list)

    @model_validator(mode="after")
    def hydrate_legacy_fields(self):
        # Backward compatibility: old OCR payloads used `product_output_quantity`.
        # Treat that as `quantity_used` if new field is missing.
        if self.quantity_used is None and self.product_output_quantity is not None:
            self.quantity_used = self.product_output_quantity
        return self


class CalculationStatus(str, Enum):
    completed = "COMPLETED"
    estimated = "ESTIMATED"
    manual_required = "MANUAL_REQUIRED"
    failed = "FAILED"


class CalculationResult(BaseModel):
    status: CalculationStatus
    specific_embedded_emissions: float | None = None
    total_emissions: float | None = None
    total_product_output: float | None = None
    formula: str = "((quantity_used * EF) + precursors_emissions + indirect_emissions) / total_product_output"
    source: str = "OCR"
    fuel_type_mapped: str | None = None
    direct_emission_factor: float | None = None
    missing_fields: list[str] = Field(default_factory=list)
    reason: str | None = None


class OCRExtractResponse(BaseModel):
    success: bool
    model_used: str
    data: OCRInvoiceData
    calculation: CalculationResult | None = None


class EmissionOverrideRequest(BaseModel):
    quantity_used: float | None = None
    direct_emissions: float | None = None
    precursors_emissions: float | None = None
    indirect_emissions: float | None = None
    total_product_output: float | None = None
