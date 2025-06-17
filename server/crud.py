import json
import logging
from typing import List, Optional

from database import Feature
from geoalchemy2.functions import ST_AsGeoJSON
from schemas import FeatureCreate, FeatureResponse, FeatureUpdate
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def get_all_features(db: AsyncSession) -> List[FeatureResponse]:
    """Get all features from database"""
    try:
        query = select(
            Feature.id,
            Feature.title,
            Feature.author,
            Feature.thumbnail,
            Feature.excerpt,
            Feature.publication,
            Feature.link,
            ST_AsGeoJSON(Feature.location).label("location"),
        )

        result = await db.execute(query)
        features = result.fetchall()

        feature_list = []
        for feature in features:
            if feature.location:
                location_data = (
                    feature.location
                    if isinstance(feature.location, dict)
                    else json.loads(feature.location)
                )
            else:
                location_data = None
            feature_dict = {
                "id": feature.id,
                "title": feature.title,
                "author": feature.author,
                "thumbnail": feature.thumbnail,
                "excerpt": feature.excerpt,
                "publication": feature.publication,
                "link": feature.link,
                "location": location_data,
            }
            # Debug logging for link and thumbnail
            logger.debug(
                "Feature ID %s: link=%s, thumbnail=%s",
                feature.id,
                feature.link,
                feature.thumbnail,
            )
            try:
                feature_list.append(FeatureResponse(**feature_dict))
            except Exception as e:
                logger.error(
                    f"Validation error for feature ID {feature.id}: {e}\n"
                    f"Data: {feature_dict}"
                )
                raise

        return feature_list
    except Exception as e:
        logger.error(f"Failed to retrieve features list: {e}")
        raise Exception(f"Database error: {str(e)}")


async def get_feature_by_id(
    db: AsyncSession, feature_id: int
) -> Optional[FeatureResponse]:
    """Get a single feature by ID"""
    try:
        query = select(
            Feature.id,
            Feature.title,
            Feature.author,
            Feature.thumbnail,
            Feature.excerpt,
            Feature.publication,
            Feature.link,
            ST_AsGeoJSON(Feature.location).label("location"),
        ).where(Feature.id == feature_id)

        result = await db.execute(query)
        feature = result.fetchone()

        if not feature:
            return None

        location_data = (
            json.loads(feature.location) if feature.location else None
        )
        feature_dict = {
            "id": feature.id,
            "title": feature.title,
            "author": feature.author,
            "thumbnail": feature.thumbnail,
            "excerpt": feature.excerpt,
            "publication": feature.publication,
            "link": feature.link,
            "location": location_data,
        }

        return FeatureResponse(**feature_dict)
    except Exception as e:
        logger.error(f"Failed to retrieve feature with ID {feature_id}: {e}")
        raise Exception(f"Database error: {str(e)}")


async def create_feature(
    db: AsyncSession, feature_data: FeatureCreate
) -> FeatureResponse:
    """Create a new feature"""
    try:
        location_json = json.dumps(feature_data.location.dict())

        # Use raw SQL for spatial operations
        query = text(
            """
            INSERT INTO feature (
                title, author, thumbnail, excerpt, publication, link, location
            )
            VALUES (
                :title, :author, :thumbnail, :excerpt, :publication, :link,
                ST_SetSRID(ST_GeomFromGeoJSON(:location), 3067)
            )
            RETURNING id, title, author, thumbnail, excerpt, publication, link,
                      ST_AsGeoJSON(location) as location
            """
        )

        result = await db.execute(
            query,
            {
                "title": feature_data.title,
                "author": feature_data.author,
                "thumbnail": (
                    str(feature_data.thumbnail)
                    if feature_data.thumbnail
                    else None
                ),
                "excerpt": feature_data.excerpt,
                "publication": feature_data.publication,
                "link": str(feature_data.link),
                "location": location_json,
            },
        )

        await db.commit()

        feature = result.fetchone()
        if not feature:
            raise Exception("Failed to create feature")

        location_data = (
            json.loads(feature.location) if feature.location else None
        )
        feature_dict = {
            "id": feature.id,
            "title": feature.title,
            "author": feature.author,
            "thumbnail": feature.thumbnail,
            "excerpt": feature.excerpt,
            "publication": feature.publication,
            "link": feature.link,
            "location": location_data,
        }

        return FeatureResponse(**feature_dict)
    except Exception as e:
        logger.error(f"Failed to create feature: {e}")
        await db.rollback()
        raise Exception(f"Database error: {str(e)}")


async def update_feature(
    db: AsyncSession, feature_id: int, feature_update: FeatureUpdate
) -> Optional[FeatureResponse]:
    """Update an existing feature"""
    try:
        # Build dynamic update query based on provided fields
        update_fields = []
        params: dict[str, str | int | None] = {"feature_id": feature_id}

        if feature_update.title is not None:
            update_fields.append("title = :title")
            params["title"] = feature_update.title
        if feature_update.author is not None:
            update_fields.append("author = :author")
            params["author"] = feature_update.author
        if feature_update.thumbnail is not None:
            update_fields.append("thumbnail = :thumbnail")
            params["thumbnail"] = (
                str(feature_update.thumbnail)
                if feature_update.thumbnail is not None
                else None
            )
        if feature_update.excerpt is not None:
            update_fields.append("excerpt = :excerpt")
            params["excerpt"] = feature_update.excerpt
        if feature_update.publication is not None:
            update_fields.append("publication = :publication")
            params["publication"] = feature_update.publication
        if feature_update.link is not None:
            update_fields.append("link = :link")
            params["link"] = str(feature_update.link)
        if feature_update.location is not None:
            update_fields.append(
                "location = ST_SetSRID(ST_GeomFromGeoJSON(:location), 3067)"
            )
            params["location"] = json.dumps(feature_update.location.dict())

        if not update_fields:
            # No fields to update, just return the current feature
            return await get_feature_by_id(db, feature_id)

        query = text(
            f"""
            UPDATE feature
            SET {', '.join(update_fields)}
            WHERE id = :feature_id
            RETURNING id, title, author, thumbnail, excerpt, publication, link,
                      ST_AsGeoJSON(location) as location
        """
        )

        result = await db.execute(query, params)
        await db.commit()

        feature = result.fetchone()
        if not feature:
            return None

        location_data = (
            json.loads(feature.location) if feature.location else None
        )
        feature_dict = {
            "id": feature.id,
            "title": feature.title,
            "author": feature.author,
            "thumbnail": feature.thumbnail,
            "excerpt": feature.excerpt,
            "publication": feature.publication,
            "link": feature.link,
            "location": location_data,
        }

        return FeatureResponse(**feature_dict)
    except Exception as e:
        logger.error(f"Failed to update feature with ID {feature_id}: {e}")
        await db.rollback()
        raise Exception(f"Database error: {str(e)}")


async def delete_feature(db: AsyncSession, feature_id: int) -> bool:
    """Delete a feature"""
    try:
        query = text("DELETE FROM feature WHERE id = :feature_id RETURNING id")
        result = await db.execute(query, {"feature_id": feature_id})
        deleted_row = result.fetchone()
        await db.commit()

        return deleted_row is not None
    except Exception as e:
        logger.error(f"Failed to delete feature with ID {feature_id}: {e}")
        await db.rollback()
        raise Exception(f"Database error: {str(e)}")
