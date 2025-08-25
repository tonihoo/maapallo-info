import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "./index";
import { Feature, Geometry, GeoJsonProperties } from "geojson";

// Map selectors
export const selectSelectedFeatureId = (state: RootState) =>
  state.map.selectedFeatureId;
export const selectIs3DMode = (state: RootState) => state.map.is3DMode;
export const selectCesiumPreloaded = (state: RootState) =>
  state.map.cesiumPreloaded;
export const selectCesiumComponent = (state: RootState) =>
  state.map.CesiumMapComponent;

// Features selectors
export const selectAllFeatures = (state: RootState) =>
  state.features.allFeatures;
export const selectRefreshTrigger = (state: RootState) =>
  state.features.refreshTrigger;
export const selectFeaturesLoading = (state: RootState) =>
  state.features.loading;
export const selectFeaturesError = (state: RootState) => state.features.error;

// Auth selectors
export const selectIsAuthenticated = (state: RootState) =>
  state.auth.isAuthenticated;
export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectAuthLoading = (state: RootState) => state.auth.isLoading;
export const selectAuthError = (state: RootState) => state.auth.error;

// Derived selectors
export const selectMapFeatures = createSelector(
  [selectAllFeatures, selectSelectedFeatureId],
  (allFeatures, selectedFeatureId): Feature<Geometry, GeoJsonProperties>[] => {
    return allFeatures
      .filter((feature) => feature.location)
      .map((feature) => ({
        type: "Feature",
        geometry: feature.location,
        properties: {
          id: feature.id,
          title: feature.title,
          featureType: "feature",
          isSelected: feature.id === selectedFeatureId,
        },
      }));
  }
);

export const selectHeaderFooterColor = createSelector(
  [selectIs3DMode],
  (is3DMode) =>
    is3DMode ? "rgba(126, 199, 129, 0.75)" : "rgba(255, 179, 76, 0.75)"
);
