from fastapi import APIRouter, HTTPException, Query, Request

from src.models.emission_lookup_schema import EmissionFactorItem, FuelMappingItem

router = APIRouter(prefix="/api/v1/emission", tags=["emission"])


def _get_lookup(request: Request):
    lookup = getattr(request.app.state, "emission_lookup", None)
    if lookup is None:
        raise HTTPException(status_code=503, detail="Emission lookup service is not ready")
    return lookup


@router.get("/fuel-mappings", response_model=list[FuelMappingItem])
async def list_fuel_mappings(
    request: Request,
    limit: int = Query(default=200, ge=1, le=1000),
) -> list[FuelMappingItem]:
    lookup = _get_lookup(request)
    rows = await lookup.list_fuel_mappings(limit=limit)
    return [FuelMappingItem.model_validate(row) for row in rows]


@router.put("/fuel-mappings", response_model=FuelMappingItem)
async def upsert_fuel_mapping(request: Request, payload: FuelMappingItem) -> FuelMappingItem:
    lookup = _get_lookup(request)
    try:
        row = await lookup.upsert_fuel_mapping(
            product_key=payload.product_key,
            fuel_type=payload.fuel_type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return FuelMappingItem.model_validate(row)


@router.get("/factors", response_model=list[EmissionFactorItem])
async def list_emission_factors(
    request: Request,
    limit: int = Query(default=200, ge=1, le=1000),
) -> list[EmissionFactorItem]:
    lookup = _get_lookup(request)
    rows = await lookup.list_emission_factors(limit=limit)
    return [EmissionFactorItem.model_validate(row) for row in rows]


@router.put("/factors", response_model=EmissionFactorItem)
async def upsert_emission_factor(request: Request, payload: EmissionFactorItem) -> EmissionFactorItem:
    lookup = _get_lookup(request)
    try:
        row = await lookup.upsert_emission_factor(
            fuel_type=payload.fuel_type,
            direct_ef=payload.direct_ef,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return EmissionFactorItem.model_validate(row)
