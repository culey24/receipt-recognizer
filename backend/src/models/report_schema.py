from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field


class ReportLanguage(str, Enum):
    en = "en"
    vi = "vi"


class CBAMProductType(str, Enum):
    cement = "cement"
    fertilizer = "fertilizer"
    iron_steel = "iron_steel"
    aluminum = "aluminum"
    hydrogen = "hydrogen"
    electricity = "electricity"


class ReportFileFormat(str, Enum):
    json = "json"
    xml = "xml"


class ReportingPeriod(BaseModel):
    year: int = Field(ge=2023, le=2100)
    quarter: int = Field(ge=1, le=4)


class CBAMRuleSet(BaseModel):
    gases_reported: list[str] = Field(default_factory=list)
    transition_period_scope: str
    specified_period_scope: str
    direct_emissions_method: str
    indirect_emissions_method: str
    identification_method: str


class LLMReportDraft(BaseModel):
    product_type_normalized: str | None = None
    gases_reported: list[str] = Field(default_factory=list)
    emission_scopes: list[str] = Field(default_factory=list)
    direct_method: str | None = None
    indirect_method: str | None = None
    identification_method: str | None = None
    reporting_notes_en: str | None = None
    reporting_notes_vi: str | None = None
    confidence: float | None = None


class CBAMPeriodicReport(BaseModel):
    report_id: str
    case_id: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    period: ReportingPeriod
    language: ReportLanguage
    product_type: CBAMProductType
    llm_status: str = "SKIPPED"
    llm_model_used: str | None = None
    invoice_count: int = 0
    vendor_names: list[str] = Field(default_factory=list)
    gases_reported: list[str] = Field(default_factory=list)
    transition_period_scope: str
    specified_period_scope: str
    direct_emissions_method: str
    indirect_emissions_method: str
    identification_method: str
    reporting_note: str | None = None
    direct_emissions: float | None = None
    indirect_emissions: float | None = None
    precursors_emissions: float | None = None
    total_emissions: float | None = None
    total_product_output: float | None = None
    specific_embedded_emissions: float | None = None
    export_quantity: float | None = None
    eu_carbon_price_eur_per_tco2: float | None = None
    eur_vnd_rate: float | None = None
    cbam_tax_eur: float | None = None
    cbam_tax_vnd: float | None = None
    missing_fields: list[str] = Field(default_factory=list)
    reason: str | None = None


class ReportPreviewRequest(BaseModel):
    case_id: str
    product_type: CBAMProductType
    language: ReportLanguage = ReportLanguage.en
    period_year: int = Field(ge=2023, le=2100)
    period_quarter: int = Field(ge=1, le=4)
    export_quantity: float | None = Field(default=None, ge=0)
    include_llm_draft: bool = True


class ReportPreviewResponse(BaseModel):
    status: str
    reason: str | None = None
    report: CBAMPeriodicReport


class ReportFileLinks(BaseModel):
    json_path: str
    xml_path: str
    json_download_url: str
    xml_download_url: str


class ReportGenerateResponse(BaseModel):
    status: str
    reason: str | None = None
    report: CBAMPeriodicReport
    files: ReportFileLinks
