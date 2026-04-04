from datetime import datetime, timezone
from uuid import uuid4

from src.models.case_schema import CalculationCase, CaseCreateRequest, CaseUpdateRequest


class CaseRepository:
    def __init__(self, collection) -> None:
        self.collection = collection

    async def create(self, payload: CaseCreateRequest | None = None) -> CalculationCase:
        if payload is None:
            payload = CaseCreateRequest()
        case = CalculationCase(
            case_id=uuid4().hex,
            precursors_emissions=payload.precursors_emissions,
            total_product_output=payload.total_product_output,
            export_quantity=payload.export_quantity,
        )
        await self.collection.update_one(
            {"case_id": case.case_id},
            {"$set": case.model_dump(mode="json")},
            upsert=True,
        )
        return case

    async def get(self, case_id: str) -> CalculationCase | None:
        raw = await self.collection.find_one({"case_id": case_id})
        if raw is None:
            return None
        raw.pop("_id", None)
        return CalculationCase.model_validate(raw)

    async def list_cases(self, limit: int = 50) -> list[CalculationCase]:
        cursor = self.collection.find({}).sort("updated_at", -1).limit(limit)
        cases: list[CalculationCase] = []
        async for raw in cursor:
            raw.pop("_id", None)
            cases.append(CalculationCase.model_validate(raw))
        return cases

    async def update(self, case_id: str, payload: CaseUpdateRequest) -> CalculationCase | None:
        case = await self.get(case_id)
        if case is None:
            return None
        if payload.precursors_emissions is not None:
            case.precursors_emissions = payload.precursors_emissions
        if payload.total_product_output is not None:
            case.total_product_output = payload.total_product_output
        if payload.export_quantity is not None:
            case.export_quantity = payload.export_quantity
        case.updated_at = datetime.now(timezone.utc)
        await self.collection.update_one(
            {"case_id": case_id},
            {"$set": case.model_dump(mode="json")},
            upsert=False,
        )
        return case

    async def touch(self, case_id: str) -> None:
        await self.collection.update_one(
            {"case_id": case_id},
            {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
        )
