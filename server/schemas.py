from typing import Any, List, Optional, Union

from pydantic import BaseModel, HttpUrl, ValidationError, field_validator
from pydantic_core import core_schema


class GeoJSONGeometry(BaseModel):
    type: str
    coordinates: Union[List[float], List[List[float]], List[List[List[float]]]]


class FeatureBase(BaseModel):
    title: str
    author: str
    thumbnail: Optional[Union[HttpUrl, str]] = None
    excerpt: str
    publication: str
    link: Union[HttpUrl, str]
    location: GeoJSONGeometry

    @field_validator('thumbnail', 'link', mode='before')
    @classmethod
    def allow_relative_url(cls, v):
        if isinstance(v, str) and v.startswith('/'):
            return v
        return v


class FeatureCreate(FeatureBase):
    pass


class FeatureUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    thumbnail: Optional[HttpUrl] = None
    excerpt: Optional[str] = None
    publication: Optional[str] = None
    link: Optional[HttpUrl] = None
    location: Optional[GeoJSONGeometry] = None


class FeatureResponse(FeatureBase):
    id: int

    class Config:
        from_attributes = True


class FeatureListResponse(BaseModel):
    features: List[FeatureResponse]


class FeatureCreateResponse(BaseModel):
    feature: FeatureResponse
    message: str


class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[Any] = None


class HealthCheckComponent(BaseModel):
    status: str
    time: str


class HealthCheckResponse(BaseModel):
    status: str
    description: str
    checks: dict[str, HealthCheckComponent]
