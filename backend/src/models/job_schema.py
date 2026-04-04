from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field

from src.models.invoice_schema import OCRExtractResponse


class JobStatus(str, Enum):
    pending = "PENDING"
    completed = "COMPLETED"
    failed = "FAILED"


class DocumentType(str, Enum):
    fuel_invoice = "fuel_invoice"
    electricity_bill = "electricity_bill"


class OCRJob(BaseModel):
    job_id: str
    status: JobStatus
    error_code: JobStatus = JobStatus.pending
    document_type: DocumentType = DocumentType.fuel_invoice
    case_id: str | None = None
    file_key: str
    file_name: str
    content_type: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    model_used: str | None = None
    result: OCRExtractResponse | None = None
    error_message: str | None = None


class OCRJobResponse(BaseModel):
    job_id: str
    status: JobStatus
    error_code: JobStatus
    document_type: DocumentType
    case_id: str | None = None
    file_name: str
    content_type: str
    created_at: datetime
    updated_at: datetime
    model_used: str | None = None
    result: OCRExtractResponse | None = None
    error_message: str | None = None
