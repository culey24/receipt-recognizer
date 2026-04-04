from fastapi import APIRouter, HTTPException, Query, Request

from src.cases.repository import CaseRepository
from src.core.config import get_settings
from src.jobs.repository import JobRepository
from src.models.case_schema import (
    CaseCBAMTaxResponse,
    CaseCreateRequest,
    CaseResponse,
    CaseSEEBreakdown,
    CaseSEEResponse,
    CaseUpdateRequest,
)
from src.models.invoice_schema import CalculationStatus
from src.models.job_schema import DocumentType, JobStatus
from src.services.carbon_price import fetch_carbon_price_quote
from src.services.fx_rate import fetch_eur_vnd_rate

router = APIRouter(prefix="/api/v1/cases", tags=["cases"])


def _get_case_repo(request: Request) -> CaseRepository:
    collection = getattr(request.app.state, "cases_collection", None)
    if collection is None:
        raise HTTPException(status_code=503, detail="MongoDB cases collection is not connected")
    return CaseRepository(collection=collection)


def _get_job_repo(request: Request) -> JobRepository:
    collection = getattr(request.app.state, "jobs_collection", None)
    if collection is None:
        raise HTTPException(status_code=503, detail="MongoDB jobs collection is not connected")
    return JobRepository(collection=collection)


@router.post("", response_model=CaseResponse, status_code=201)
async def create_case(request: Request, payload: CaseCreateRequest | None = None) -> CaseResponse:
    repo = _get_case_repo(request)
    case = await repo.create(payload)
    return CaseResponse.model_validate(case.model_dump())


@router.get("", response_model=list[CaseResponse])
async def list_cases(request: Request, limit: int = Query(default=20, ge=1, le=100)) -> list[CaseResponse]:
    repo = _get_case_repo(request)
    cases = await repo.list_cases(limit=limit)
    return [CaseResponse.model_validate(case.model_dump()) for case in cases]


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(request: Request, case_id: str) -> CaseResponse:
    repo = _get_case_repo(request)
    case = await repo.get(case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return CaseResponse.model_validate(case.model_dump())


@router.patch("/{case_id}", response_model=CaseResponse)
async def update_case(request: Request, case_id: str, payload: CaseUpdateRequest) -> CaseResponse:
    repo = _get_case_repo(request)
    case = await repo.update(case_id=case_id, payload=payload)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return CaseResponse.model_validate(case.model_dump())


async def _calculate_case_see_internal(request: Request, case_id: str) -> CaseSEEResponse:
    case_repo = _get_case_repo(request)
    job_repo = _get_job_repo(request)

    case = await case_repo.get(case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")

    jobs = await job_repo.list_by_case(case_id=case_id, limit=500)
    completed_jobs = [job for job in jobs if job.status == JobStatus.completed and job.result is not None]

    direct = 0.0
    indirect = 0.0
    fuel_job_count = 0
    electricity_job_count = 0
    output_from_jobs: float | None = None

    for job in completed_jobs:
        data = job.result.data
        if job.document_type == DocumentType.fuel_invoice:
            fuel_job_count += 1
            direct += float(data.direct_emissions or 0.0)
        elif job.document_type == DocumentType.electricity_bill:
            electricity_job_count += 1
            indirect += float(data.indirect_emissions or 0.0)

        if output_from_jobs is None and data.total_product_output is not None:
            output_from_jobs = float(data.total_product_output)

    precursors = float(case.precursors_emissions or 0.0)
    total_output = case.total_product_output if case.total_product_output is not None else output_from_jobs

    missing_fields: list[str] = []
    reason: str | None = None
    see: float | None = None
    status = CalculationStatus.completed

    if fuel_job_count == 0:
        missing_fields.append("fuel_receipt")
    if electricity_job_count == 0:
        missing_fields.append("electricity_bill")
    if total_output is None:
        missing_fields.append("total_product_output")
    elif total_output <= 0:
        status = CalculationStatus.failed
        reason = "total_product_output must be non-zero"

    total_emissions = direct + indirect + precursors

    if status != CalculationStatus.failed:
        if total_output is None:
            status = CalculationStatus.manual_required
            reason = "Missing total_product_output for SEE calculation"
        else:
            see = total_emissions / total_output
            if missing_fields:
                status = CalculationStatus.estimated
                reason = "SEE computed with partial document set; upload missing documents for full scope"

    return CaseSEEResponse(
        case_id=case.case_id,
        status=status,
        direct_emissions=direct,
        indirect_emissions=indirect,
        precursors_emissions=precursors,
        total_emissions=total_emissions,
        total_product_output=total_output,
        specific_embedded_emissions=see,
        breakdown=CaseSEEBreakdown(
            fuel_job_count=fuel_job_count,
            electricity_job_count=electricity_job_count,
        ),
        missing_fields=missing_fields,
        reason=reason,
    )


@router.get("/{case_id}/see", response_model=CaseSEEResponse)
async def calculate_case_see(request: Request, case_id: str) -> CaseSEEResponse:
    return await _calculate_case_see_internal(request, case_id)


@router.get("/{case_id}/cbam-tax", response_model=CaseCBAMTaxResponse)
async def calculate_cbam_tax(
    request: Request,
    case_id: str,
    export_quantity: float | None = Query(default=None, ge=0),
) -> CaseCBAMTaxResponse:
    case_repo = _get_case_repo(request)
    case = await case_repo.get(case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")

    see_result = await _calculate_case_see_internal(request, case_id)
    missing_fields = list(see_result.missing_fields)
    reason = None

    quantity = export_quantity if export_quantity is not None else case.export_quantity
    if quantity is None:
        missing_fields.append("export_quantity")

    if see_result.specific_embedded_emissions is None:
        if "specific_embedded_emissions" not in missing_fields:
            missing_fields.append("specific_embedded_emissions")

    quote = None
    fx_quote = None
    carbon_price_vnd = None
    settings = get_settings()
    try:
        quote = await fetch_carbon_price_quote(
            tickers=settings.carbon_price_tickers,
            fallback_eur=settings.carbon_price_fallback_eur,
        )
    except Exception as exc:  # noqa: BLE001
        missing_fields.append("carbon_price")
        reason = f"Unable to fetch EU carbon price: {exc}"

    try:
        fx_quote = await fetch_eur_vnd_rate(
            ticker=settings.fx_rate_ticker,
            fallback_rate=settings.fx_rate_fallback_eur_vnd,
        )
        if quote is not None:
            carbon_price_vnd = quote.price * fx_quote.rate
    except Exception as exc:  # noqa: BLE001
        missing_fields.append("eur_vnd_rate")
        if reason is None:
            reason = f"Unable to fetch EUR->VND FX rate: {exc}"

    cbam_tax = None
    cbam_tax_vnd = None
    if quote is not None and quantity is not None and see_result.specific_embedded_emissions is not None:
        cbam_tax = quantity * quote.price * see_result.specific_embedded_emissions
        if fx_quote is not None:
            cbam_tax_vnd = cbam_tax * fx_quote.rate
    elif reason is None and missing_fields:
        reason = "Missing required values for CBAM tax calculation"

    return CaseCBAMTaxResponse(
        case_id=case_id,
        see_status=see_result.status,
        specific_embedded_emissions=see_result.specific_embedded_emissions,
        export_quantity=quantity,
        carbon_price=quote,
        fx_rate=fx_quote,
        carbon_price_vnd_per_tco2=carbon_price_vnd,
        cbam_tax=cbam_tax,
        cbam_tax_vnd=cbam_tax_vnd,
        missing_fields=sorted(set(missing_fields)),
        reason=reason,
    )
