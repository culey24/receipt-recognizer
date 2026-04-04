from dataclasses import dataclass

from src.models.job_schema import DocumentType
from src.models.invoice_schema import OCRInvoiceData
from src.services.electricity_emission import apply_electricity_indirect_emissions


@dataclass
class DocumentEnrichmentResult:
    data: OCRInvoiceData
    source: str
    fuel_type_mapped: str | None = None
    direct_emission_factor: float | None = None
    reason: str | None = None


async def enrich_for_document_type(
    *,
    data: OCRInvoiceData,
    document_type: DocumentType,
    emission_lookup,
    grid_emission_factor: float,
) -> DocumentEnrichmentResult:
    if document_type == DocumentType.electricity_bill:
        electricity = apply_electricity_indirect_emissions(
            data=data,
            grid_emission_factor=grid_emission_factor,
        )
        return DocumentEnrichmentResult(
            data=electricity.data,
            source=electricity.source,
            reason=electricity.reason,
        )

    lookup = await emission_lookup.apply_direct_emission_lookup(data)
    return DocumentEnrichmentResult(
        data=lookup.data,
        source=lookup.source,
        fuel_type_mapped=lookup.fuel_type_mapped,
        direct_emission_factor=lookup.direct_emission_factor,
        reason=lookup.reason,
    )
