from src.models.invoice_schema import (
    CalculationResult,
    CalculationStatus,
    EmissionOverrideRequest,
    OCRInvoiceData,
)


def calculate_see(
    *,
    data: OCRInvoiceData,
    override: EmissionOverrideRequest | None = None,
    source: str = "OCR",
    fuel_type_mapped: str | None = None,
    direct_emission_factor: float | None = None,
) -> tuple[OCRInvoiceData, CalculationResult]:
    hydrated = data.model_copy(deep=True)
    used_manual = False

    if hydrated.quantity_used is None and hydrated.product_output_quantity is not None:
        hydrated.quantity_used = hydrated.product_output_quantity

    if override is not None:
        if override.quantity_used is not None and override.quantity_used != hydrated.quantity_used:
            hydrated.quantity_used = override.quantity_used
            used_manual = True
        if (
            override.precursors_emissions is not None
            and override.precursors_emissions != hydrated.precursors_emissions
        ):
            hydrated.precursors_emissions = override.precursors_emissions
            used_manual = True
        if (
            override.indirect_emissions is not None
            and override.indirect_emissions != hydrated.indirect_emissions
        ):
            hydrated.indirect_emissions = override.indirect_emissions
            used_manual = True
        if (
            override.total_product_output is not None
            and override.total_product_output != hydrated.total_product_output
        ):
            hydrated.total_product_output = override.total_product_output
            used_manual = True

    if direct_emission_factor is not None and hydrated.quantity_used is not None:
        hydrated.direct_emissions = hydrated.quantity_used * direct_emission_factor

    quantity_used = hydrated.quantity_used
    output = hydrated.total_product_output
    if quantity_used is not None and quantity_used < 0:
        return hydrated, CalculationResult(
            status=CalculationStatus.failed,
            source="MANUAL" if used_manual else source,
            fuel_type_mapped=fuel_type_mapped,
            direct_emission_factor=direct_emission_factor,
            reason="quantity_used must be non-negative",
        )
    if output is not None and output < 0:
        return hydrated, CalculationResult(
            status=CalculationStatus.failed,
            source="MANUAL" if used_manual else source,
            fuel_type_mapped=fuel_type_mapped,
            direct_emission_factor=direct_emission_factor,
            reason="total_product_output must be non-negative",
        )
    if output == 0:
        return hydrated, CalculationResult(
            status=CalculationStatus.failed,
            source="MANUAL" if used_manual else source,
            fuel_type_mapped=fuel_type_mapped,
            direct_emission_factor=direct_emission_factor,
            reason="total_product_output must be non-zero",
        )

    missing = []
    if hydrated.precursors_emissions is None:
        missing.append("precursors_emissions")
    if hydrated.indirect_emissions is None:
        missing.append("indirect_emissions")
    if hydrated.direct_emissions is None:
        missing.append("direct_emissions")
    if hydrated.total_product_output is None:
        missing.append("total_product_output")

    result_source = "MANUAL_OVERRIDE+LOOKUP" if used_manual else source
    if missing:
        return hydrated, CalculationResult(
            status=CalculationStatus.manual_required,
            source=result_source,
            fuel_type_mapped=fuel_type_mapped,
            direct_emission_factor=direct_emission_factor,
            missing_fields=missing,
            reason="Missing emissions or total_product_output for SEE calculation",
        )

    total_emissions = (
        hydrated.precursors_emissions
        + hydrated.indirect_emissions
        + hydrated.direct_emissions
    )
    see_value = total_emissions / hydrated.total_product_output

    return hydrated, CalculationResult(
        status=CalculationStatus.completed,
        source=result_source,
        fuel_type_mapped=fuel_type_mapped,
        direct_emission_factor=direct_emission_factor,
        specific_embedded_emissions=see_value,
        total_emissions=total_emissions,
        total_product_output=hydrated.total_product_output,
        missing_fields=[],
        reason=None,
    )
