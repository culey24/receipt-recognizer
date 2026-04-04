from src.api.cases import router as cases_router
from src.api.emission import router as emission_router
from src.api.ocr import router as ocr_router
from src.api.jobs import router as jobs_router
from src.api.reports import router as reports_router

__all__ = ["ocr_router", "jobs_router", "emission_router", "cases_router", "reports_router"]
