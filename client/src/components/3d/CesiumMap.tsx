import { useEffect, useRef, useCallback } from "react";
import * as Cesium from "cesium";
import { GlobalStyles } from "@mui/material";
import { Feature, Geometry, GeoJsonProperties } from "geojson";
import { CoordinatesDisplay } from "../common/CoordinatesDisplay";
import { LocationSearch } from "../common/LocationSearch";
import { CameraControls } from "./CameraControls";
import { useCesiumViewer } from "../../hooks/useCesiumViewer";
import { useCameraOperations } from "../../hooks/useCameraOperations";
import { initializeCesiumConfig } from "../../utils/cesiumConfig";

// Initialize Cesium configuration
initializeCesiumConfig();

interface Props {
  features: Feature<Geometry, GeoJsonProperties>[];
  onMapClick?: (coordinates: number[]) => void;
  selectedFeatureId?: number | null;
  onFeatureClick?: (featureId: number) => void;
}

export function CesiumMap({
  features = [],
  onMapClick,
  selectedFeatureId,
  onFeatureClick,
}: Props) {
  const featuresRef = useRef(features);

  const {
    viewerRef,
    loading,
    error,
    viewerReady,
    mouseCoordinates,
    initializeViewer,
    isPointOnVisibleHemisphere,
  } = useCesiumViewer({ onMapClick, onFeatureClick }); // Pass the real callbacks

  const {
    handleZoom,
    handleTiltAdjust,
    handleRotate,
    handleHome,
    handleLocationSelect,
  } = useCameraOperations(viewerRef);

  // Container ref for initializing viewer
  const containerCallbackRef = useCallback(
    (containerElement: HTMLDivElement | null) => {
      if (containerElement) {
        initializeViewer(containerElement, featuresRef);
      }
    },
    [initializeViewer]
  );

  // Update the features ref when features change
  useEffect(() => {
    featuresRef.current = features;
  }, [features]);

  // Remove the duplicate click handler - the hook already handles this
  // useEffect(() => { ... click handler ... }, [viewerReady, onMapClick, onFeatureClick]);

  // Update features on viewer - ensure all markers are added but with correct visibility
  useEffect(() => {
    if (!viewerRef.current?.entities) return;

    try {
      // Remove existing feature entities
      const entitiesToRemove = viewerRef.current.entities.values.filter(
        (entity) =>
          entity.id &&
          typeof entity.id === "string" &&
          entity.id.startsWith("feature-")
      );
      entitiesToRemove.forEach((entity) =>
        viewerRef.current?.entities.remove(entity)
      );

      // Add ALL features, but control their visibility
      features.forEach((feature, index) => {
        if (feature?.geometry?.type === "Point") {
          const [longitude, latitude] = feature.geometry.coordinates;
          const isSelected = feature.properties?.id === selectedFeatureId;
          const isVisible = isPointOnVisibleHemisphere(longitude, latitude);

          if (viewerRef.current) {
            viewerRef.current.entities.add({
              id: `feature-${index}`,
              position: Cesium.Cartesian3.fromDegrees(
                longitude,
                latitude,
                100000
              ),
              point: {
                pixelSize: isSelected ? 25 : 15,
                color: isSelected ? Cesium.Color.RED : Cesium.Color.ORANGE,
                outlineColor: isSelected
                  ? Cesium.Color.WHITE
                  : Cesium.Color.DARKBLUE,
                outlineWidth: isSelected ? 3 : 2,
                heightReference: Cesium.HeightReference.NONE,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                show: isVisible,
              },
              label: feature.properties?.title
                ? {
                    text: feature.properties.title,
                    font: isSelected ? "14pt sans-serif" : "12pt sans-serif",
                    pixelOffset: new Cesium.Cartesian2(
                      0,
                      isSelected ? -50 : -40
                    ),
                    fillColor: Cesium.Color.WHITE,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    show: isVisible,
                  }
                : undefined,
            });
          }
        }
      });

      setTimeout(() => {
        if (viewerRef.current) {
          viewerRef.current.trackedEntity = undefined;
          viewerRef.current.selectedEntity = undefined;
        }
      }, 10);
    } catch (error) {
      console.error("Error updating features:", error);
    }
  }, [features, isPointOnVisibleHemisphere, selectedFeatureId]);

  // Fly to selected feature
  useEffect(() => {
    if (!viewerRef.current || !selectedFeatureId) return;

    const selectedFeature = features.find(
      (feature) => feature.properties?.id === selectedFeatureId
    );

    if (selectedFeature?.geometry?.type === "Point") {
      const [longitude, latitude] = selectedFeature.geometry.coordinates;
      const zoomHeight = 150000;

      viewerRef.current.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          longitude,
          latitude,
          zoomHeight
        ),
        orientation: {
          heading: viewerRef.current.scene.camera.heading,
          pitch: viewerRef.current.scene.camera.pitch,
          roll: viewerRef.current.scene.camera.roll,
        },
        duration: 2.0,
        easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
      });
    }
  }, [selectedFeatureId, features]);

  if (error) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f5f5f5",
          color: "red",
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <GlobalStyles
        styles={{
          ".cesium-viewer": {
            width: "100% !important",
            height: "100% !important",
          },
          ".cesium-viewer-cesiumWidgetContainer": {
            width: "100% !important",
            height: "100% !important",
          },
          ".cesium-widget": {
            width: "100% !important",
            height: "100% !important",
          },
          ".cesium-widget canvas": {
            width: "100% !important",
            height: "100% !important",
          },
          ".cesium-widget-credits": {
            display: "none !important",
          },
          ".cesium-viewer-fullscreenContainer": {
            display: "none !important",
          },
          ".cesium-viewer-toolbar": {
            display: "none !important",
          },
          "@media (max-width: 959px)": {
            ".cesium-viewer .cesium-viewer-navigationContainer": {
              bottom: "250px !important",
              right: "15px !important",
            },
            ".cesium-navigationHelpButton-wrapper": {
              bottom: "250px !important",
            },
            ".cesium-viewer .cesium-navigationHelpButton-wrapper": {
              bottom: "250px !important",
            },
            ".cesium-navigation-help": {
              bottom: "250px !important",
            },
            ".cesium-compass": {
              bottom: "250px !important",
            },
            ".cesium-zoomControls": {
              bottom: "250px !important",
            },
          },
        }}
      />

      <div ref={containerCallbackRef} style={{ width: "100%", height: "100%" }}>
        {loading && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f5f5f5",
              color: "#666",
              zIndex: 1000,
            }}
          >
            Loading 3D Map...
          </div>
        )}
      </div>

      <LocationSearch onLocationSelect={handleLocationSelect} />

      <CameraControls
        onZoom={handleZoom}
        onTiltAdjust={handleTiltAdjust}
        onRotate={handleRotate}
        onHome={handleHome}
        disabled={!viewerReady}
      />

      <CoordinatesDisplay coordinates={mouseCoordinates} />
    </div>
  );
}

export default CesiumMap;
