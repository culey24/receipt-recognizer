from src.models.invoice_schema import CalculationResult, CalculationStatus


def calculate_see(
    *,
    precursors_emissions: float | None,
    indirect_emissions: float | None,
    direct_emissions: float | None,
    total_product_output: float | None,
) -> CalculationResult:
    if (
        precursors_emissions is None
        or indirect_emissions is None
        or direct_emissions is None
        or total_product_output is None
    ):
        return CalculationResult(
            status=CalculationStatus.failed,
            reason="Missing emissions or product output values for SEE calculation",
        )

    if total_product_output == 0:
        return CalculationResult(
            status=CalculationStatus.failed,
            reason="total_product_output must be non-zero",
        )

    total_emissions = precursors_emissions + indirect_emissions + direct_emissions
    see_value = total_emissions / total_product_output
    return CalculationResult(
        status=CalculationStatus.completed,
        specific_embedded_emissions=see_value,
        total_emissions=total_emissions,
        total_product_output=total_product_output,
        reason=None,
    )
