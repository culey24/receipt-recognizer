from datetime import datetime, timezone

from pydantic import BaseModel, Field

from src.models.invoice_schema import CalculationStatus


class CalculationCase(BaseModel):
    case_id: str
    precursors_emissions: float = 0.0
    total_product_output: float | None = None
    export_quantity: float | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CaseCreateRequest(BaseModel):
    precursors_emissions: float = 0.0
    total_product_output: float | None = None
    export_quantity: float | None = None


class CaseUpdateRequest(BaseModel):
    precursors_emissions: float | None = None
    total_product_output: float | None = None
    export_quantity: float | None = None


class CaseResponse(BaseModel):
    case_id: str
    precursors_emissions: float
    total_product_output: float | None = None
    export_quantity: float | None = None
    created_at: datetime
    updated_at: datetime


class CaseSEEBreakdown(BaseModel):
    fuel_job_count: int = 0
    electricity_job_count: int = 0


class CaseSEEResponse(BaseModel):
    case_id: str
    status: CalculationStatus
    direct_emissions: float = 0.0
    indirect_emissions: float = 0.0
    precursors_emissions: float = 0.0
    total_emissions: float = 0.0
    total_product_output: float | None = None
    specific_embedded_emissions: float | None = None
    breakdown: CaseSEEBreakdown = Field(default_factory=CaseSEEBreakdown)
    missing_fields: list[str] = Field(default_factory=list)
    reason: str | None = None


class CarbonPriceQuote(BaseModel):
    provider: str = "yfinance"
    ticker: str
    price: float
    currency: str | None = None
    as_of: str | None = None


class FXRateQuote(BaseModel):
    provider: str = "yfinance"
    base: str = "EUR"
    quote: str = "VND"
    rate: float
    as_of: str | None = None


class CaseCBAMTaxResponse(BaseModel):
    case_id: str
    see_status: CalculationStatus
    specific_embedded_emissions: float | None = None
    export_quantity: float | None = None
    carbon_price: CarbonPriceQuote | None = None
    fx_rate: FXRateQuote | None = None
    carbon_price_vnd_per_tco2: float | None = None
    cbam_tax: float | None = None
    cbam_tax_vnd: float | None = None
    missing_fields: list[str] = Field(default_factory=list)
    reason: str | None = None
