from dataclasses import dataclass
import re
import unicodedata

from src.models.invoice_schema import OCRInvoiceData
from src.utils.logger import setup_logger

LOGGER = setup_logger("emission-lookup")


@dataclass
class DirectEmissionLookupResult:
    data: OCRInvoiceData
    found: bool
    fuel_type_mapped: str | None
    direct_emission_factor: float | None
    source: str
    reason: str | None = None


DEFAULT_FUEL_MAPPINGS = [
    {"product_key": "ron95 gasoline", "fuel_type": "RON95"},
    {"product_key": "xang ron 95 iii", "fuel_type": "RON95"},
    {"product_key": "xang ron95", "fuel_type": "RON95"},
    {"product_key": "diesel", "fuel_type": "DIESEL"},
    {"product_key": "lpg", "fuel_type": "LPG"},
]

DEFAULT_EMISSION_FACTORS = [
    {"fuel_type": "RON95", "direct_ef": 2.296},
    {"fuel_type": "DIESEL", "direct_ef": 2.680},
    {"fuel_type": "LPG", "direct_ef": 1.510},
]


class EmissionFactorLookupService:
    def __init__(self, fuel_mapping_collection, emission_factor_collection) -> None:
        self.fuel_mapping_collection = fuel_mapping_collection
        self.emission_factor_collection = emission_factor_collection

    async def ensure_seed_data(self) -> None:
        await self.fuel_mapping_collection.create_index("product_key", unique=True)
        await self.emission_factor_collection.create_index("fuel_type", unique=True)

        # Upsert defaults every startup so old/manual data shape does not break lookups.
        for mapping in DEFAULT_FUEL_MAPPINGS:
            normalized_product_key = _normalize_product_key(mapping["product_key"])
            normalized_fuel_type = _normalize_fuel_type(mapping["fuel_type"])
            if normalized_product_key is None or normalized_fuel_type is None:
                continue
            await self.fuel_mapping_collection.update_one(
                {"product_key": normalized_product_key},
                {"$set": {"product_key": normalized_product_key, "fuel_type": normalized_fuel_type}},
                upsert=True,
            )

        for factor in DEFAULT_EMISSION_FACTORS:
            normalized_fuel_type = _normalize_fuel_type(factor["fuel_type"])
            if normalized_fuel_type is None:
                continue
            await self.emission_factor_collection.update_one(
                {"fuel_type": normalized_fuel_type},
                {"$set": {"fuel_type": normalized_fuel_type, "direct_ef": float(factor["direct_ef"])}},
                upsert=True,
            )

    async def apply_direct_emission_lookup(self, data: OCRInvoiceData) -> DirectEmissionLookupResult:
        hydrated = data.model_copy(deep=True)
        hydrated.direct_emissions = None

        if hydrated.quantity_used is None and hydrated.product_output_quantity is not None:
            hydrated.quantity_used = hydrated.product_output_quantity

        if hydrated.quantity_used is None:
            return DirectEmissionLookupResult(
                data=hydrated,
                found=False,
                fuel_type_mapped=None,
                direct_emission_factor=None,
                source="LOOKUP",
                reason="Missing quantity_used for direct emissions lookup",
            )

        lookup_fuel = await self._resolve_fuel_type(
            product_name=hydrated.product_name,
            fuel_type=hydrated.fuel_type,
        )
        if lookup_fuel is None:
            return DirectEmissionLookupResult(
                data=hydrated,
                found=False,
                fuel_type_mapped=None,
                direct_emission_factor=None,
                source="LOOKUP",
                reason="Fuel type mapping not found for product_name/fuel_type",
            )

        factor_doc = await self.emission_factor_collection.find_one({"fuel_type": lookup_fuel})
        if factor_doc is None:
            return DirectEmissionLookupResult(
                data=hydrated,
                found=False,
                fuel_type_mapped=lookup_fuel,
                direct_emission_factor=None,
                source="LOOKUP",
                reason=f"Direct emission factor not found for fuel_type={lookup_fuel}",
            )

        direct_ef = float(factor_doc["direct_ef"])
        hydrated.fuel_type = lookup_fuel
        hydrated.direct_emissions = hydrated.quantity_used * direct_ef
        return DirectEmissionLookupResult(
            data=hydrated,
            found=True,
            fuel_type_mapped=lookup_fuel,
            direct_emission_factor=direct_ef,
            source="LOOKUP",
            reason=None,
        )

    async def list_fuel_mappings(self, *, limit: int = 200) -> list[dict]:
        cursor = self.fuel_mapping_collection.find({}).sort("product_key", 1).limit(limit)
        rows: list[dict] = []
        async for raw in cursor:
            raw.pop("_id", None)
            rows.append(raw)
        return rows

    async def list_emission_factors(self, *, limit: int = 200) -> list[dict]:
        cursor = self.emission_factor_collection.find({}).sort("fuel_type", 1).limit(limit)
        rows: list[dict] = []
        async for raw in cursor:
            raw.pop("_id", None)
            rows.append(raw)
        return rows

    async def upsert_fuel_mapping(self, *, product_key: str, fuel_type: str) -> dict:
        normalized_product_key = _normalize_product_key(product_key)
        normalized_fuel_type = _normalize_fuel_type(fuel_type)
        if normalized_product_key is None or normalized_fuel_type is None:
            raise ValueError("product_key and fuel_type are required")

        await self.fuel_mapping_collection.update_one(
            {"product_key": normalized_product_key},
            {"$set": {"product_key": normalized_product_key, "fuel_type": normalized_fuel_type}},
            upsert=True,
        )
        return {"product_key": normalized_product_key, "fuel_type": normalized_fuel_type}

    async def upsert_emission_factor(self, *, fuel_type: str, direct_ef: float) -> dict:
        normalized_fuel_type = _normalize_fuel_type(fuel_type)
        if normalized_fuel_type is None:
            raise ValueError("fuel_type is required")
        if direct_ef <= 0:
            raise ValueError("direct_ef must be greater than 0")

        await self.emission_factor_collection.update_one(
            {"fuel_type": normalized_fuel_type},
            {"$set": {"fuel_type": normalized_fuel_type, "direct_ef": float(direct_ef)}},
            upsert=True,
        )
        return {"fuel_type": normalized_fuel_type, "direct_ef": float(direct_ef)}

    async def _resolve_fuel_type(self, *, product_name: str | None, fuel_type: str | None) -> str | None:
        normalized_fuel = _normalize_fuel_type(fuel_type)
        if normalized_fuel is not None:
            exists = await self.emission_factor_collection.find_one({"fuel_type": normalized_fuel})
            if exists is not None:
                return normalized_fuel

        product_key = _normalize_product_key(product_name)
        if product_key is None:
            return None

        mapping_doc = await self.fuel_mapping_collection.find_one({"product_key": product_key})
        if mapping_doc is None:
            return None
        return mapping_doc["fuel_type"]


def _normalize_product_key(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = _normalize_text(value)
    return normalized or None


def _normalize_fuel_type(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = _normalize_text(value).replace(" ", "")
    if not normalized:
        return None

    # Canonical labels used by emission_factors collection.
    if ("ron" in normalized and "95" in normalized) or "ron95" in normalized:
        return "RON95"
    if "diesel" in normalized:
        return "DIESEL"
    if "lpg" in normalized:
        return "LPG"

    return normalized.upper()


def _normalize_text(value: str) -> str:
    lowered = value.strip().lower().replace("đ", "d")
    folded = unicodedata.normalize("NFKD", lowered)
    no_diacritics = "".join(ch for ch in folded if not unicodedata.combining(ch))
    alnum_spaces = re.sub(r"[^a-z0-9]+", " ", no_diacritics)
    return " ".join(alnum_spaces.split())
