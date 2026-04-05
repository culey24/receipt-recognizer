import json
import re
import unicodedata
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

import httpx

from src.core.config import Settings, get_model_fallback_chain
from src.models.report_schema import CBAMPeriodicReport, CBAMProductType, CBAMRuleSet, LLMReportDraft, ReportLanguage

_RETRYABLE_STATUS = {408, 429, 500, 502, 503, 504}

_CBAM_RULES: dict[CBAMProductType, dict[str, Any]] = {
    CBAMProductType.cement: {
        "gases_reported": ["CO2"],
        "transition_period_scope": {
            "en": "Direct and indirect greenhouse gas emissions",
            "vi": "Phát thải khí nhà kính trực tiếp và gián tiếp",
        },
        "specified_period_scope": {
            "en": "Direct and indirect greenhouse gas emissions",
            "vi": "Phát thải khí nhà kính trực tiếp và gián tiếp",
        },
        "direct_emissions_method": {
            "en": "Use actual emissions unless complete determination is not possible",
            "vi": "Dựa trên lượng phát thải thực tế, trừ khi không thể xác định đầy đủ",
        },
        "indirect_emissions_method": {
            "en": "Use default values unless direct determination/contractual data is available",
            "vi": "Dựa trên giá trị mặc định, trừ khi có dữ liệu xác định trực tiếp/hợp đồng",
        },
        "identification_method": {
            "en": "EU transitional CBAM method",
            "vi": "Phương pháp CBAM giai đoạn chuyển tiếp của EU",
        },
    },
    CBAMProductType.fertilizer: {
        "gases_reported": ["CO2"],
        "transition_period_scope": {
            "en": "Direct and indirect greenhouse gas emissions",
            "vi": "Phát thải khí nhà kính trực tiếp và gián tiếp",
        },
        "specified_period_scope": {
            "en": "Greenhouse gas emissions from relevant assessed entities only",
            "vi": "Chỉ bao gồm phát thải khí nhà kính trên các chủ thể được xem xét",
        },
        "direct_emissions_method": {
            "en": "Use actual emissions unless complete determination is not possible",
            "vi": "Dựa trên lượng phát thải thực tế, trừ khi không thể xác định đầy đủ",
        },
        "indirect_emissions_method": {
            "en": "Use default values unless direct determination/contractual data is available",
            "vi": "Dựa trên giá trị mặc định, trừ khi có dữ liệu xác định trực tiếp/hợp đồng",
        },
        "identification_method": {
            "en": "EU transitional CBAM method",
            "vi": "Phương pháp CBAM giai đoạn chuyển tiếp của EU",
        },
    },
    CBAMProductType.iron_steel: {
        "gases_reported": ["CO2"],
        "transition_period_scope": {
            "en": "Direct and indirect greenhouse gas emissions",
            "vi": "Phát thải khí nhà kính trực tiếp và gián tiếp",
        },
        "specified_period_scope": {
            "en": "Greenhouse gas emissions from relevant assessed entities only",
            "vi": "Chỉ bao gồm phát thải khí nhà kính trên các chủ thể được xem xét",
        },
        "direct_emissions_method": {
            "en": "Use actual emissions unless complete determination is not possible",
            "vi": "Dựa trên lượng phát thải thực tế, trừ khi không thể xác định đầy đủ",
        },
        "indirect_emissions_method": {
            "en": "Use default values unless direct determination/contractual data is available",
            "vi": "Dựa trên giá trị mặc định, trừ khi có dữ liệu xác định trực tiếp/hợp đồng",
        },
        "identification_method": {
            "en": "EU transitional CBAM method",
            "vi": "Phương pháp CBAM giai đoạn chuyển tiếp của EU",
        },
    },
    CBAMProductType.aluminum: {
        "gases_reported": ["CO2", "PFC"],
        "transition_period_scope": {
            "en": "Direct and indirect greenhouse gas emissions",
            "vi": "Phát thải khí nhà kính trực tiếp và gián tiếp",
        },
        "specified_period_scope": {
            "en": "Greenhouse gas emissions from relevant assessed entities only",
            "vi": "Chỉ bao gồm phát thải khí nhà kính trên các chủ thể được xem xét",
        },
        "direct_emissions_method": {
            "en": "Use actual emissions unless complete determination is not possible",
            "vi": "Dựa trên lượng phát thải thực tế, trừ khi không thể xác định đầy đủ",
        },
        "indirect_emissions_method": {
            "en": "Use default values unless direct determination/contractual data is available",
            "vi": "Dựa trên giá trị mặc định, trừ khi có dữ liệu xác định trực tiếp/hợp đồng",
        },
        "identification_method": {
            "en": "EU transitional CBAM method",
            "vi": "Phương pháp CBAM giai đoạn chuyển tiếp của EU",
        },
    },
    CBAMProductType.hydrogen: {
        "gases_reported": ["CO2"],
        "transition_period_scope": {
            "en": "Direct and indirect greenhouse gas emissions",
            "vi": "Phát thải khí nhà kính trực tiếp và gián tiếp",
        },
        "specified_period_scope": {
            "en": "Greenhouse gas emissions from relevant assessed entities only",
            "vi": "Chỉ bao gồm phát thải khí nhà kính trên các chủ thể được xem xét",
        },
        "direct_emissions_method": {
            "en": "Use actual emissions unless complete determination is not possible",
            "vi": "Dựa trên lượng phát thải thực tế, trừ khi không thể xác định đầy đủ",
        },
        "indirect_emissions_method": {
            "en": "Use default values unless direct determination/contractual data is available",
            "vi": "Dựa trên giá trị mặc định, trừ khi có dữ liệu xác định trực tiếp/hợp đồng",
        },
        "identification_method": {
            "en": "EU transitional CBAM method",
            "vi": "Phương pháp CBAM giai đoạn chuyển tiếp của EU",
        },
    },
    CBAMProductType.electricity: {
        "gases_reported": ["CO2"],
        "transition_period_scope": {
            "en": "Direct greenhouse gas emissions only",
            "vi": "Chỉ bao gồm phát thải khí nhà kính trực tiếp",
        },
        "specified_period_scope": {
            "en": "Direct greenhouse gas emissions only",
            "vi": "Chỉ bao gồm phát thải khí nhà kính trực tiếp",
        },
        "direct_emissions_method": {
            "en": "Use default values unless eligibility conditions are satisfied",
            "vi": "Dựa trên các giá trị mặc định, trừ khi một số điều kiện được đáp ứng",
        },
        "indirect_emissions_method": {
            "en": "Not applicable",
            "vi": "Không áp dụng",
        },
        "identification_method": {
            "en": "Electricity-specific CBAM default-value method",
            "vi": "Phương pháp mặc định CBAM dành cho điện",
        },
    },
}


def get_cbam_rules(product_type: CBAMProductType, language: ReportLanguage) -> CBAMRuleSet:
    raw = _CBAM_RULES[product_type]
    lang_key = language.value
    return CBAMRuleSet(
        gases_reported=list(raw["gases_reported"]),
        transition_period_scope=raw["transition_period_scope"][lang_key],
        specified_period_scope=raw["specified_period_scope"][lang_key],
        direct_emissions_method=raw["direct_emissions_method"][lang_key],
        indirect_emissions_method=raw["indirect_emissions_method"][lang_key],
        identification_method=raw["identification_method"][lang_key],
    )


async def generate_llm_report_draft(
    *,
    settings: Settings,
    case_context: dict[str, Any],
    product_type: CBAMProductType,
    language: ReportLanguage,
) -> tuple[LLMReportDraft | None, str | None, str | None]:
    model_candidates = get_model_fallback_chain(settings)
    if not model_candidates:
        return None, None, "No OpenRouter model configured"

    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key.strip()}",
        "Content-Type": "application/json",
        "HTTP-Referer": settings.openrouter_site_url,
        "X-Title": settings.openrouter_site_name,
    }

    system_prompt = (
        "You are a CBAM reporting assistant. Output strict JSON only, no markdown. "
        "Do not invent unavailable values."
    )
    user_payload = {
        "selected_product_type": product_type.value,
        "language": language.value,
        "case_context": case_context,
        "required_json_shape": {
            "product_type_normalized": "string | null",
            "gases_reported": ["string"],
            "emission_scopes": ["string"],
            "direct_method": "string | null",
            "indirect_method": "string | null",
            "identification_method": "string | null",
            "reporting_notes_en": "string | null",
            "reporting_notes_vi": "string | null",
            "confidence": "number | null",
        },
    }

    last_error: str | None = None
    async with httpx.AsyncClient(timeout=60.0) as client:
        for idx, model in enumerate(model_candidates):
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
                ],
                "temperature": 0,
            }
            response = await client.post(
                f"{settings.openrouter_base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            if response.status_code >= 400:
                last_error = f"{model}: OpenRouter error ({response.status_code})"
                can_fallback = settings.openrouter_auto_fallback and idx < len(model_candidates) - 1
                if can_fallback and response.status_code in _RETRYABLE_STATUS:
                    continue
                continue
            try:
                body = response.json()
                content = _extract_text_content(body.get("choices", [{}])[0].get("message", {}).get("content", ""))
                parsed = _extract_json_from_text(content)
                draft = LLMReportDraft.model_validate(parsed)
                return draft, model, None
            except Exception as exc:  # noqa: BLE001
                last_error = f"{model}: failed to parse LLM report draft ({exc})"
                continue
    return None, None, last_error or "LLM report draft generation failed"


def choose_reporting_note(
    *,
    draft: LLMReportDraft | None,
    language: ReportLanguage,
    fallback_note: str,
) -> str:
    if draft is None:
        return fallback_note
    if language == ReportLanguage.vi and draft.reporting_notes_vi:
        return draft.reporting_notes_vi
    if language == ReportLanguage.en and draft.reporting_notes_en:
        return draft.reporting_notes_en
    if draft.reporting_notes_en:
        return draft.reporting_notes_en
    if draft.reporting_notes_vi:
        return draft.reporting_notes_vi
    return fallback_note


def serialize_report_json(report: CBAMPeriodicReport) -> str:
    return report.model_dump_json(indent=2)


def serialize_report_xml(report: CBAMPeriodicReport) -> str:
    root = ET.Element("CBAMReport")
    ET.SubElement(root, "ReportId").text = report.report_id
    ET.SubElement(root, "CaseId").text = report.case_id
    ET.SubElement(root, "GeneratedAt").text = report.generated_at.isoformat()
    ET.SubElement(root, "Language").text = report.language.value
    ET.SubElement(root, "ProductType").text = report.product_type.value

    period = ET.SubElement(root, "ReportingPeriod")
    ET.SubElement(period, "Year").text = str(report.period.year)
    ET.SubElement(period, "Quarter").text = str(report.period.quarter)

    scope = ET.SubElement(root, "ScopeAndMethods")
    ET.SubElement(scope, "TransitionPeriodScope").text = report.transition_period_scope
    ET.SubElement(scope, "SpecifiedPeriodScope").text = report.specified_period_scope
    ET.SubElement(scope, "DirectEmissionsMethod").text = report.direct_emissions_method
    ET.SubElement(scope, "IndirectEmissionsMethod").text = report.indirect_emissions_method
    ET.SubElement(scope, "IdentificationMethod").text = report.identification_method

    gases = ET.SubElement(root, "ReportedGases")
    for gas in report.gases_reported:
        ET.SubElement(gases, "Gas").text = gas

    summary = ET.SubElement(root, "Summary")
    ET.SubElement(summary, "InvoiceCount").text = str(report.invoice_count)
    ET.SubElement(summary, "VendorNames").text = ", ".join(report.vendor_names)
    ET.SubElement(summary, "DirectEmissions").text = _to_xml_number(report.direct_emissions)
    ET.SubElement(summary, "IndirectEmissions").text = _to_xml_number(report.indirect_emissions)
    ET.SubElement(summary, "PrecursorsEmissions").text = _to_xml_number(report.precursors_emissions)
    ET.SubElement(summary, "TotalEmissions").text = _to_xml_number(report.total_emissions)
    ET.SubElement(summary, "TotalProductOutput").text = _to_xml_number(report.total_product_output)
    ET.SubElement(summary, "SpecificEmbeddedEmissions").text = _to_xml_number(report.specific_embedded_emissions)
    ET.SubElement(summary, "ExportQuantity").text = _to_xml_number(report.export_quantity)
    ET.SubElement(summary, "EUCarbonPriceEURPerTCO2").text = _to_xml_number(report.eu_carbon_price_eur_per_tco2)
    ET.SubElement(summary, "EURVNDRate").text = _to_xml_number(report.eur_vnd_rate)
    ET.SubElement(summary, "CBAMTaxEUR").text = _to_xml_number(report.cbam_tax_eur)
    ET.SubElement(summary, "CBAMTaxVND").text = _to_xml_number(report.cbam_tax_vnd)

    llm = ET.SubElement(root, "LLM")
    ET.SubElement(llm, "Status").text = report.llm_status
    ET.SubElement(llm, "ModelUsed").text = report.llm_model_used or ""
    ET.SubElement(llm, "ReportingNote").text = report.reporting_note or ""

    missing = ET.SubElement(root, "MissingFields")
    for field in report.missing_fields:
        ET.SubElement(missing, "Field").text = field
    ET.SubElement(root, "Reason").text = report.reason or ""

    xml_bytes = ET.tostring(root, encoding="utf-8")
    return xml_bytes.decode("utf-8")


def serialize_report_txt(report: CBAMPeriodicReport) -> str:
    lines = _build_report_lines(report)
    return "\n".join(lines) + "\n"


def serialize_report_pdf(report: CBAMPeriodicReport) -> bytes:
    lines = _build_report_lines(report)
    return _render_simple_pdf(lines)


def save_report_files(
    *,
    report_id: str,
    report_storage_path: str,
    json_content: str,
    xml_content: str,
    txt_content: str,
    pdf_content: bytes,
) -> tuple[Path, Path, Path, Path]:
    base_path = Path(report_storage_path).expanduser().resolve()
    base_path.mkdir(parents=True, exist_ok=True)

    json_path = base_path / f"{report_id}.json"
    xml_path = base_path / f"{report_id}.xml"
    txt_path = base_path / f"{report_id}.txt"
    pdf_path = base_path / f"{report_id}.pdf"
    json_path.write_text(json_content, encoding="utf-8")
    xml_path.write_text(xml_content, encoding="utf-8")
    txt_path.write_text(txt_content, encoding="utf-8")
    pdf_path.write_bytes(pdf_content)
    return json_path, xml_path, txt_path, pdf_path


def _extract_text_content(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        chunks: list[str] = []
        for part in content:
            if isinstance(part, dict) and part.get("type") == "text":
                chunks.append(str(part.get("text", "")))
        return "\n".join(chunks)
    return str(content)


def _extract_json_from_text(text: str) -> dict[str, Any]:
    raw = text.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{[\s\S]*\}", raw)
    if not match:
        raise ValueError("No JSON object detected in LLM output")
    return json.loads(match.group(0))


def _to_xml_number(value: float | None) -> str:
    if value is None:
        return ""
    return str(value)


def _build_report_lines(report: CBAMPeriodicReport) -> list[str]:
    def fmt_num(value: float | None) -> str:
        if value is None:
            return "-"
        return f"{value:.2f}"

    lines = [
        "CBAM PERIODIC REPORT",
        "====================",
        "",
        "[GENERAL]",
        f"Report ID               : {report.report_id}",
        f"Case ID                 : {report.case_id}",
        f"Generated At            : {report.generated_at.isoformat()}",
        f"Reporting Period        : {report.period.year}-Q{report.period.quarter}",
        f"Language                : {report.language.value}",
        f"Product Type            : {report.product_type.value}",
        f"Invoice Count           : {report.invoice_count}",
        f"Vendors                 : {', '.join(report.vendor_names) if report.vendor_names else '-'}",
        "",
        "[CBAM RULES]",
        f"Gases Reported          : {', '.join(report.gases_reported) if report.gases_reported else '-'}",
        f"Transition Scope        : {report.transition_period_scope}",
        f"Specified Scope         : {report.specified_period_scope}",
        f"Direct Method           : {report.direct_emissions_method}",
        f"Indirect Method         : {report.indirect_emissions_method}",
        f"Identification Method   : {report.identification_method}",
        "",
        "[EMISSIONS + SEE]",
        f"Direct Emissions        : {fmt_num(report.direct_emissions)}",
        f"Indirect Emissions      : {fmt_num(report.indirect_emissions)}",
        f"Precursors Emissions    : {fmt_num(report.precursors_emissions)}",
        f"Total Emissions         : {fmt_num(report.total_emissions)}",
        f"Total Product Output    : {fmt_num(report.total_product_output)}",
        f"Specific Embedded Emis. : {fmt_num(report.specific_embedded_emissions)}",
        "",
        "[CBAM TAX]",
        f"Export Quantity         : {fmt_num(report.export_quantity)}",
        f"EU Carbon Price (EUR)   : {fmt_num(report.eu_carbon_price_eur_per_tco2)} / tCO2",
        f"EUR -> VND Rate         : {fmt_num(report.eur_vnd_rate)}",
        f"CBAM Tax (EUR)          : {fmt_num(report.cbam_tax_eur)}",
        f"CBAM Tax (VND)          : {fmt_num(report.cbam_tax_vnd)}",
        "",
        "[LLM DRAFT]",
        f"LLM Status              : {report.llm_status}",
        f"LLM Model               : {report.llm_model_used or '-'}",
        f"Reporting Note          : {report.reporting_note or '-'}",
        "",
        "[QUALITY]",
        f"Missing Fields          : {', '.join(report.missing_fields) if report.missing_fields else '-'}",
        f"Reason                  : {report.reason or '-'}",
    ]
    return lines


def _render_simple_pdf(lines: list[str]) -> bytes:
    content_lines = ["BT", "/F1 10 Tf", "50 800 Td", "14 TL"]
    for line in lines:
        safe_line = _pdf_escape(_ascii_safe(line))
        content_lines.append(f"({safe_line}) Tj")
        content_lines.append("T*")
    content_lines.append("ET")
    content_stream = "\n".join(content_lines).encode("latin-1", errors="replace")

    objects: list[bytes] = []
    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    objects.append(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    objects.append(
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
        b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>"
    )
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    objects.append(
        b"<< /Length "
        + str(len(content_stream)).encode("ascii")
        + b" >>\nstream\n"
        + content_stream
        + b"\nendstream"
    )

    pdf = bytearray()
    pdf.extend(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")

    offsets = [0]
    for idx, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{idx} 0 obj\n".encode("ascii"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref_start = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        pdf.extend(f"{off:010d} 00000 n \n".encode("ascii"))
    pdf.extend(
        (
            "trailer\n"
            f"<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            "startxref\n"
            f"{xref_start}\n"
            "%%EOF\n"
        ).encode("ascii")
    )
    return bytes(pdf)


def _ascii_safe(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    ascii_bytes = normalized.encode("ascii", errors="ignore")
    return ascii_bytes.decode("ascii")


def _pdf_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
