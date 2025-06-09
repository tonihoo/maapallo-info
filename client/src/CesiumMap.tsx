import { useEffect, useRef, useState, useCallback } from "react";
import * as Cesium from "cesium";
import { GlobalStyles } from "@mui/material";
import { FeatureTypes } from "@shared/featureTypes";

// Set Cesium configuration
if (typeof window !== 'undefined') {
  (window as any).CESIUM_BASE_URL = '/node_modules/cesium/Build/Cesium/';
}

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYWE1OWUxNy1mMWZiLTQzYjYtYTQ0OS1kMWFjYmFkNjc5YzciLCJpZCI6NTc3MzMsImlhdCI6MTYyNzg0NTE4Mn0.XcKpgANiY19MC4bdFUXMVEBToBmqS8kuYpUlxJHYZxk';

interface Props {
  features: FeatureTypes[];
  onMapClick: (coordinates: number[]) => void;
  selectedFeatureId?: number | null;
}

export function CesiumMap({ features = [], onMapClick, selectedFeatureId }: Props) {
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleMapClick = useCallback((event: any) => {
    if (!viewerRef.current) return;

    const pickedPosition = viewerRef.current.camera.pickEllipsoid(
      event.position,
      viewerRef.current.scene.globe.ellipsoid
    );

    if (pickedPosition) {
      const cartographic = Cesium.Cartographic.fromCartesian(pickedPosition);
      const longitude = Cesium.Math.toDegrees(cartographic.longitude);
      const latitude = Cesium.Math.toDegrees(cartographic.latitude);
      onMapClick([longitude, latitude]);
    }
  }, [onMapClick]);

  const initializeViewer = useCallback(async (containerElement: HTMLDivElement) => {
    try {
      const viewer = new Cesium.Viewer(containerElement, {
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        navigationHelpButton: false,
        sceneModePicker: false,
        timeline: false,
        animation: false,
      });

      // Configure camera
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(0.0, 0.0, 12000000),
        orientation: {
          heading: 0.0,
          pitch: -Cesium.Math.PI_OVER_TWO,
          roll: 0.0
        }
      });

      // Configure camera controls
      const controller = viewer.scene.screenSpaceCameraController;
      controller.minimumZoomDistance = 1;
      controller.maximumZoomDistance = 15000000;

      // Enforce zoom limits
      viewer.scene.postRender.addEventListener(() => {
        const height = viewer.scene.camera.positionCartographic.height;
        if (height > 15000000 || height < 1) {
          const position = viewer.scene.camera.positionCartographic;
          viewer.scene.camera.position = Cesium.Cartesian3.fromRadians(
            position.longitude,
            position.latitude,
            Math.max(1, Math.min(height, 15000000))
          );
        }
      });

      // Load country boundaries
      await loadCountryBoundaries(viewer);

      // Set up click handler
      viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(
        handleMapClick,
        Cesium.ScreenSpaceEventType.LEFT_CLICK
      );

      viewerRef.current = viewer;
      setLoading(false);

      // Force resize after initialization
      setTimeout(() => viewer.resize(), 100);

    } catch (error) {
      console.error('Failed to initialize Cesium viewer:', error);
      setError('Failed to initialize 3D map: ' + (error as Error).message);
      setLoading(false);
    }
  }, [handleMapClick]);

  const loadCountryBoundaries = async (viewer: Cesium.Viewer) => {
    try {
      const countriesDataSource = await Cesium.GeoJsonDataSource.load('/data/world.geojson', {
        stroke: Cesium.Color.WHITE,
        fill: Cesium.Color.TRANSPARENT,
        strokeWidth: 2
      });

      viewer.dataSources.add(countriesDataSource);

      // Style boundaries and add labels
      const entities = countriesDataSource.entities.values;
      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];

        // Style country boundaries
        if (entity.polygon) {
          entity.polygon.material = Cesium.Color.TRANSPARENT;
          entity.polygon.outline = true;
          entity.polygon.outlineColor = Cesium.Color.WHITE.withAlpha(0.8);
          entity.polygon.outlineWidth = 2;
          entity.polygon.height = 0;
          entity.polygon.extrudedHeight = 0;
        }

        // Add country labels
        if (entity.properties?.name_fi && entity.polygon) {
          const name = entity.properties.name_fi.getValue();
          const hierarchy = entity.polygon.hierarchy.getValue(Cesium.JulianDate.now());

          if (hierarchy?.positions?.length > 0) {
            const boundingSphere = Cesium.BoundingSphere.fromPoints(hierarchy.positions);
            const cartographic = Cesium.Cartographic.fromCartesian(boundingSphere.center);

            viewer.entities.add({
              id: `country-label-${i}`,
              position: Cesium.Cartesian3.fromRadians(
                cartographic.longitude,
                cartographic.latitude,
                0
              ),
              label: {
                text: name,
                font: '16pt Arial, sans-serif',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                verticalOrigin: Cesium.VerticalOrigin.CENTER,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 10000000),
              },
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to load country boundaries:', error);
    }
  };

  const containerCallbackRef = useCallback((containerElement: HTMLDivElement | null) => {
    if (containerElement) {
      initializeViewer(containerElement);
    }
  }, [initializeViewer]);

  const handleZoom = useCallback((zoomIn: boolean) => {
    if (!viewerRef.current) return;

    const camera = viewerRef.current.scene.camera;
    const currentHeight = camera.positionCartographic.height;
    const newHeight = zoomIn
      ? Math.max(currentHeight * 0.5, 1)
      : Math.min(currentHeight * 2, 15000000);

    camera.flyTo({
      destination: Cesium.Cartesian3.fromRadians(
        camera.positionCartographic.longitude,
        camera.positionCartographic.latitude,
        newHeight
      ),
      orientation: {
        heading: camera.heading,
        pitch: camera.pitch,
        roll: camera.roll
      },
      duration: 0.8,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // Handle features updates
  useEffect(() => {
    if (!viewerRef.current?.entities) return;

    try {
      // Remove existing feature entities
      const entitiesToRemove = viewerRef.current.entities.values.filter(
        entity => entity.id && typeof entity.id === 'string' && entity.id.startsWith('feature-')
      );
      entitiesToRemove.forEach(entity => viewerRef.current!.entities.remove(entity));

      // Add new features
      features.forEach((feature, index) => {
        if (feature?.geometry?.type === 'Point' && feature.geometry.coordinates) {
          const [longitude, latitude] = feature.geometry.coordinates;

          viewerRef.current!.entities.add({
            id: `feature-${index}`,
            position: Cesium.Cartesian3.fromDegrees(longitude, latitude),
            point: {
              pixelSize: 20,
              color: Cesium.Color.ORANGE,
              outlineColor: Cesium.Color.DARKBLUE,
              outlineWidth: 2,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
            label: feature.name ? {
              text: feature.name,
              font: '12pt sans-serif',
              pixelOffset: new Cesium.Cartesian2(0, -40),
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            } : undefined,
          });
        }
      });

      // Prevent automatic tracking
      setTimeout(() => {
        if (viewerRef.current) {
          viewerRef.current.trackedEntity = undefined;
          viewerRef.current.selectedEntity = undefined;
        }
      }, 10);

    } catch (error) {
      console.error('Error updating features:', error);
    }
  }, [features]);

  // Handle selected feature centering
  useEffect(() => {
    if (!viewerRef.current || !selectedFeatureId) return;

    const selectedFeature = features.find(feature =>
      feature.properties?.id === selectedFeatureId
    );

    if (selectedFeature?.geometry?.type === 'Point') {
      const [longitude, latitude] = selectedFeature.geometry.coordinates;
      const currentHeight = viewerRef.current.scene.camera.positionCartographic.height;

      viewerRef.current.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, currentHeight),
        orientation: {
          heading: viewerRef.current.scene.camera.heading,
          pitch: viewerRef.current.scene.camera.pitch,
          roll: viewerRef.current.scene.camera.roll
        },
        duration: 2.0,
        easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
      });
    }
  }, [selectedFeatureId, features]);

  if (error) {
    return (
      <div style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f5f5f5",
        color: "red"
      }}>
        {error}
      </div>
    );
  }

  const zoomButtonStyle = {
    width: "40px",
    height: "40px",
    backgroundColor: "rgba(42, 42, 42, 0.8)",
    color: "white",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "20px",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  } as const;

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
            position: "absolute !important",
            top: "5px !important",
            right: "5px !important",
            background: "rgba(42, 42, 42, 0.8) !important",
          },
        }}
      />

      <div ref={containerCallbackRef} style={{ width: "100%", height: "100%" }}>
        {loading && (
          <div style={{
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
            zIndex: 1000
          }}>
            Loading 3D Map...
          </div>
        )}
      </div>

      {/* Zoom buttons */}
      <div style={{
        position: "absolute",
        bottom: "20px",
        right: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        zIndex: 1000
      }}>
        <button
          onClick={() => handleZoom(true)}
          style={zoomButtonStyle}
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => handleZoom(false)}
          style={zoomButtonStyle}
          title="Zoom Out"
        >
          −
        </button>
      </div>
    </div>
  );
}
