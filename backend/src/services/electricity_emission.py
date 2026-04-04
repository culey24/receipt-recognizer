from dataclasses import dataclass

from src.models.invoice_schema import OCRInvoiceData


@dataclass
class ElectricityEmissionResult:
    data: OCRInvoiceData
    source: str
    reason: str | None = None


def apply_electricity_indirect_emissions(
    *,
    data: OCRInvoiceData,
    grid_emission_factor: float,
) -> ElectricityEmissionResult:
    hydrated = data.model_copy(deep=True)

    if hydrated.electricity_consumption_kwh is None:
        return ElectricityEmissionResult(
            data=hydrated,
            source="ELECTRICITY_LOOKUP",
            reason="Missing electricity_consumption_kwh for indirect emissions calculation",
        )

    hydrated.indirect_emissions = hydrated.electricity_consumption_kwh * grid_emission_factor
    if hydrated.direct_emissions is None:
        hydrated.direct_emissions = 0.0
    return ElectricityEmissionResult(
        data=hydrated,
        source="ELECTRICITY_LOOKUP",
        reason=None,
    )
