import re
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import FileResponse

from src.api.cases import _calculate_case_see_internal
from src.cases.repository import CaseRepository
from src.core.config import get_settings
from src.jobs.repository import JobRepository
from src.models.report_schema import (
    CBAMPeriodicReport,
    ReportFileFormat,
    ReportFileLinks,
    ReportGenerateResponse,
    ReportLanguage,
    ReportPreviewRequest,
    ReportPreviewResponse,
    ReportingPeriod,
)
from src.services.carbon_price import fetch_carbon_price_quote
from src.services.fx_rate import fetch_eur_vnd_rate
from src.services.reporting import (
    choose_reporting_note,
    generate_llm_report_draft,
    get_cbam_rules,
    save_report_files,
    serialize_report_json,
    serialize_report_pdf,
    serialize_report_txt,
    serialize_report_xml,
)

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


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


async def _compose_report(
    request: Request,
    payload: ReportPreviewRequest,
) -> tuple[str, CBAMPeriodicReport]:
    case_repo = _get_case_repo(request)
    case = await case_repo.get(payload.case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")

    settings = get_settings()
    see_result = await _calculate_case_see_internal(request, payload.case_id)
    missing_fields = list(see_result.missing_fields)
    reason = see_result.reason

    quantity = payload.export_quantity if payload.export_quantity is not None else case.export_quantity
    if quantity is None:
        missing_fields.append("export_quantity")
    if see_result.specific_embedded_emissions is None:
        missing_fields.append("specific_embedded_emissions")

    carbon_quote = None
    fx_quote = None
    carbon_price_vnd = None
    cbam_tax_eur = None
    cbam_tax_vnd = None
    try:
        carbon_quote = await fetch_carbon_price_quote(
            tickers=settings.carbon_price_tickers,
            fallback_eur=settings.carbon_price_fallback_eur,
        )
    except Exception as exc:  # noqa: BLE001
        missing_fields.append("carbon_price")
        if reason is None:
            reason = f"Unable to fetch EU carbon price: {exc}"

    try:
        fx_quote = await fetch_eur_vnd_rate(
            ticker=settings.fx_rate_ticker,
            fallback_rate=settings.fx_rate_fallback_eur_vnd,
        )
        if carbon_quote is not None:
            carbon_price_vnd = carbon_quote.price * fx_quote.rate
    except Exception as exc:  # noqa: BLE001
        missing_fields.append("eur_vnd_rate")
        if reason is None:
            reason = f"Unable to fetch EUR->VND FX rate: {exc}"

    if carbon_quote is not None and quantity is not None and see_result.specific_embedded_emissions is not None:
        cbam_tax_eur = quantity * carbon_quote.price * see_result.specific_embedded_emissions
        if fx_quote is not None:
            cbam_tax_vnd = cbam_tax_eur * fx_quote.rate
    elif reason is None and missing_fields:
        reason = "Missing required values for CBAM tax calculation"

    job_repo = _get_job_repo(request)
    jobs = await job_repo.list_by_case(case_id=payload.case_id, limit=500)
    completed_jobs = [job for job in jobs if job.result is not None and job.status.value == "COMPLETED"]
    vendor_names = sorted(
        {
            job.result.data.vendor_name.strip()
            for job in completed_jobs
            if job.result and job.result.data.vendor_name and job.result.data.vendor_name.strip()
        }
    )
    product_names = sorted(
        {
            job.result.data.product_name.strip()
            for job in completed_jobs
            if job.result and job.result.data.product_name and job.result.data.product_name.strip()
        }
    )

    rules = get_cbam_rules(payload.product_type, payload.language)

    llm_status = "SKIPPED"
    llm_model_used = None
    llm_draft = None
    if payload.include_llm_draft:
        llm_draft, llm_model_used, llm_error = await generate_llm_report_draft(
            settings=settings,
            case_context={
                "case_id": payload.case_id,
                "period_year": payload.period_year,
                "period_quarter": payload.period_quarter,
                "vendor_names": vendor_names,
                "product_names": product_names,
                "specific_embedded_emissions": see_result.specific_embedded_emissions,
                "total_emissions": see_result.total_emissions,
                "total_product_output": see_result.total_product_output,
                "export_quantity": quantity,
                "cbam_tax_eur": cbam_tax_eur,
            },
            product_type=payload.product_type,
            language=payload.language,
        )
        if llm_draft is not None:
            llm_status = "COMPLETED"
        else:
            llm_status = "FAILED"
            if reason is None and llm_error:
                reason = f"LLM draft unavailable: {llm_error}"

    fallback_note = (
        "Drafted with deterministic CBAM rules and validated calculations."
        if payload.language == ReportLanguage.en
        else "Bản nháp được tạo bằng bộ quy tắc CBAM cố định và số liệu đã được xác thực."
    )
    reporting_note = choose_reporting_note(
        draft=llm_draft,
        language=payload.language,
        fallback_note=fallback_note,
    )

    report = CBAMPeriodicReport(
        report_id=uuid4().hex,
        case_id=payload.case_id,
        period=ReportingPeriod(year=payload.period_year, quarter=payload.period_quarter),
        language=payload.language,
        product_type=payload.product_type,
        llm_status=llm_status,
        llm_model_used=llm_model_used,
        invoice_count=len(completed_jobs),
        vendor_names=vendor_names,
        gases_reported=rules.gases_reported,
        transition_period_scope=rules.transition_period_scope,
        specified_period_scope=rules.specified_period_scope,
        direct_emissions_method=rules.direct_emissions_method,
        indirect_emissions_method=rules.indirect_emissions_method,
        identification_method=rules.identification_method,
        reporting_note=reporting_note,
        direct_emissions=see_result.direct_emissions,
        indirect_emissions=see_result.indirect_emissions,
        precursors_emissions=see_result.precursors_emissions,
        total_emissions=see_result.total_emissions,
        total_product_output=see_result.total_product_output,
        specific_embedded_emissions=see_result.specific_embedded_emissions,
        export_quantity=quantity,
        eu_carbon_price_eur_per_tco2=carbon_quote.price if carbon_quote is not None else None,
        eur_vnd_rate=fx_quote.rate if fx_quote is not None else None,
        cbam_tax_eur=cbam_tax_eur,
        cbam_tax_vnd=cbam_tax_vnd,
        missing_fields=sorted(set(missing_fields)),
        reason=reason,
    )
    status = "COMPLETED" if not report.missing_fields and report.cbam_tax_eur is not None else "PARTIAL"
    return status, report


@router.post("/preview", response_model=ReportPreviewResponse)
async def preview_report(request: Request, payload: ReportPreviewRequest) -> ReportPreviewResponse:
    status, report = await _compose_report(request, payload)
    return ReportPreviewResponse(status=status, reason=report.reason, report=report)


@router.post("/generate", response_model=ReportGenerateResponse)
async def generate_report(request: Request, payload: ReportPreviewRequest) -> ReportGenerateResponse:
    status, report = await _compose_report(request, payload)
    settings = get_settings()
    json_content = serialize_report_json(report)
    xml_content = serialize_report_xml(report)
    txt_content = serialize_report_txt(report)
    pdf_content = serialize_report_pdf(report)
    json_path, xml_path, txt_path, pdf_path = save_report_files(
        report_id=report.report_id,
        report_storage_path=settings.report_storage_path,
        json_content=json_content,
        xml_content=xml_content,
        txt_content=txt_content,
        pdf_content=pdf_content,
    )
    files = ReportFileLinks(
        json_path=str(json_path),
        xml_path=str(xml_path),
        txt_path=str(txt_path),
        pdf_path=str(pdf_path),
        json_download_url=f"/api/v1/reports/{report.report_id}/download?format=json",
        xml_download_url=f"/api/v1/reports/{report.report_id}/download?format=xml",
        txt_download_url=f"/api/v1/reports/{report.report_id}/download?format=txt",
        pdf_download_url=f"/api/v1/reports/{report.report_id}/download?format=pdf",
    )
    return ReportGenerateResponse(status=status, reason=report.reason, report=report, files=files)


@router.get("/{report_id}/download")
async def download_report(
    report_id: str,
    format: ReportFileFormat = Query(default=ReportFileFormat.json),
):
    if not re.fullmatch(r"[A-Za-z0-9_-]+", report_id):
        raise HTTPException(status_code=400, detail="Invalid report_id")

    settings = get_settings()
    base_path = Path(settings.report_storage_path).expanduser().resolve()
    file_path = base_path / f"{report_id}.{format.value}"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Report file not found")

    if format == ReportFileFormat.json:
        media_type = "application/json"
    elif format == ReportFileFormat.xml:
        media_type = "application/xml"
    elif format == ReportFileFormat.txt:
        media_type = "text/plain"
    else:
        media_type = "application/pdf"
    filename = file_path.name
    return FileResponse(file_path, media_type=media_type, filename=filename)
