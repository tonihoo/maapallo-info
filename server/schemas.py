from typing import Any, List, Optional, Union

from pydantic import BaseModel, HttpUrl


class GeoJSONGeometry(BaseModel):
    type: str
    coordinates: Union[List[float], List[List[float]], List[List[List[float]]]]


class FeatureBase(BaseModel):
    title: str
    author: str
    thumbnail: Optional[HttpUrl] = None
    excerpt: str
    publication: str
    link: HttpUrl
    location: GeoJSONGeometry


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
