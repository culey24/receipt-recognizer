from pydantic import BaseModel, Field


class FuelMappingItem(BaseModel):
    product_key: str = Field(min_length=1)
    fuel_type: str = Field(min_length=1)


class EmissionFactorItem(BaseModel):
    fuel_type: str = Field(min_length=1)
    direct_ef: float = Field(gt=0)
