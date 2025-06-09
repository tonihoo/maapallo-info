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

// Constants
const INITIAL_CAMERA_POSITION = {
  longitude: 44.0,
  latitude: 10.0,
  height: 16000000
};

const INITIAL_CAMERA_ORIENTATION = {
  heading: 0.0,
  pitch: -Cesium.Math.PI_OVER_TWO,
  roll: 0.0
};

const ZOOM_LIMITS = {
  min: 0,
  max: 15000000
};

const ANIMATION_DURATIONS = {
  zoom: 0.8,
  tilt: 0.5,
  rotate: 0.5,
  home: 2.0
};

export function CesiumMap({ features = [], onMapClick, selectedFeatureId }: Props) {
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCountryBoundaries = useCallback(async (viewer: Cesium.Viewer) => {
    try {
      const countriesDataSource = await Cesium.GeoJsonDataSource.load('/data/world.geojson', {
        stroke: Cesium.Color.WHITE,
        fill: Cesium.Color.TRANSPARENT,
        strokeWidth: 2
      });

      viewer.dataSources.add(countriesDataSource);

      const entities = countriesDataSource.entities.values;
      entities.forEach((entity, index) => {
        // Style country boundaries
        if (entity.polygon) {
          entity.polygon.material = Cesium.Color.TRANSPARENT;
          entity.polygon.outline = true;
          entity.polygon.outlineColor = Cesium.Color.WHITE.withAlpha(0.5); // More transparent
          entity.polygon.outlineWidth = 1; // Thinner lines
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
              id: `country-label-${index}`,
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
      });
    } catch (error) {
      console.error('Failed to load country boundaries:', error);
    }
  }, []);

  const setupCameraControls = useCallback((viewer: Cesium.Viewer) => {
    const controller = viewer.scene.screenSpaceCameraController;

    controller.minimumZoomDistance = ZOOM_LIMITS.min;
    controller.maximumZoomDistance = ZOOM_LIMITS.max;
    controller.enableCollisionDetection = false;

    // Enforce zoom limits
    viewer.scene.postRender.addEventListener(() => {
      const height = viewer.scene.camera.positionCartographic.height;
      if (height > ZOOM_LIMITS.max || height < ZOOM_LIMITS.min) {
        const position = viewer.scene.camera.positionCartographic;
        viewer.scene.camera.position = Cesium.Cartesian3.fromRadians(
          position.longitude,
          position.latitude,
          Math.max(ZOOM_LIMITS.min, Math.min(height, ZOOM_LIMITS.max))
        );
      }
    });
  }, []);

  const initializeViewer = useCallback(async (containerElement: HTMLDivElement) => {
    try {
      const viewer = new Cesium.Viewer(containerElement, {
        baseLayerPicker: true,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        navigationHelpButton: false,
        sceneModePicker: false,
        timeline: false,
        animation: false,
      });

      // Set initial camera position
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(
          INITIAL_CAMERA_POSITION.longitude,
          INITIAL_CAMERA_POSITION.latitude,
          INITIAL_CAMERA_POSITION.height
        ),
        orientation: INITIAL_CAMERA_ORIENTATION
      });

      // Add these settings for better text rendering:
      viewer.scene.postProcessStages.fxaa.enabled = false; // Try disabling FXAA
      viewer.resolutionScale = 2.0; // Try higher resolution scale
      viewer.scene.highDynamicRange = false; // Disable HDR for better text

      // Additional settings to try:
      viewer.scene.globe.enableLighting = false;
      viewer.scene.fog.enabled = false;
      viewer.scene.skyAtmosphere.show = false;

      setupCameraControls(viewer);
      await loadCountryBoundaries(viewer);

      viewerRef.current = viewer;
      setLoading(false);

      setTimeout(() => viewer.resize(), 100);

    } catch (error) {
      console.error('Failed to initialize Cesium viewer:', error);
      setError('Failed to initialize 3D map: ' + (error as Error).message);
      setLoading(false);
    }
  }, [setupCameraControls, loadCountryBoundaries]);

  const containerCallbackRef = useCallback((containerElement: HTMLDivElement | null) => {
    if (containerElement) {
      initializeViewer(containerElement);
    }
  }, [initializeViewer]);

  // Camera control functions
  const handleZoom = useCallback((zoomIn: boolean) => {
    if (!viewerRef.current) return;

    const camera = viewerRef.current.scene.camera;
    const currentHeight = camera.positionCartographic.height;
    const newHeight = zoomIn
      ? Math.max(currentHeight * 0.5, ZOOM_LIMITS.min)
      : Math.min(currentHeight * 2, ZOOM_LIMITS.max);

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
      duration: ANIMATION_DURATIONS.zoom,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT
    });
  }, []);

  const handleTiltAdjust = useCallback((direction: 'up' | 'down') => {
    if (!viewerRef.current) return;

    const camera = viewerRef.current.scene.camera;
    const pitchIncrement = Cesium.Math.toRadians(15);
    const newPitch = direction === 'up'
      ? Math.min(camera.pitch + pitchIncrement, 0)
      : Math.max(camera.pitch - pitchIncrement, -Cesium.Math.PI_OVER_TWO);

    camera.flyTo({
      destination: camera.position,
      orientation: {
        heading: camera.heading,
        pitch: newPitch,
        roll: camera.roll
      },
      duration: ANIMATION_DURATIONS.tilt,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT
    });
  }, []);

  const handleRotate = useCallback((direction: 'left' | 'right') => {
    if (!viewerRef.current) return;

    const camera = viewerRef.current.scene.camera;
    const rotationIncrement = Cesium.Math.toRadians(15);
    const newHeading = direction === 'left'
      ? camera.heading - rotationIncrement
      : camera.heading + rotationIncrement;

    camera.flyTo({
      destination: camera.position,
      orientation: {
        heading: newHeading,
        pitch: camera.pitch,
        roll: camera.roll
      },
      duration: ANIMATION_DURATIONS.rotate,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT
    });
  }, []);

  const handleHome = useCallback(() => {
    if (!viewerRef.current) return;

    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        INITIAL_CAMERA_POSITION.longitude,
        INITIAL_CAMERA_POSITION.latitude,
        INITIAL_CAMERA_POSITION.height
      ),
      orientation: INITIAL_CAMERA_ORIENTATION,
      duration: ANIMATION_DURATIONS.home,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT
    });
  }, []);

  // Effects
  useEffect(() => {
    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

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
          const isSelected = feature.properties?.isSelected;

          viewerRef.current!.entities.add({
            id: `feature-${index}`,
            position: Cesium.Cartesian3.fromDegrees(longitude, latitude, 100000), // Add height: 100km above ground
            point: {
              pixelSize: isSelected ? 25 : 15,
              color: isSelected ? Cesium.Color.RED : Cesium.Color.ORANGE,
              outlineColor: isSelected ? Cesium.Color.WHITE : Cesium.Color.DARKBLUE,
              outlineWidth: isSelected ? 3 : 2,
              heightReference: Cesium.HeightReference.NONE, // Changed from CLAMP_TO_GROUND
              disableDepthTestDistance: Number.POSITIVE_INFINITY, // Always visible
            },
            label: feature.properties?.name ? {
              text: feature.properties.name,
              font: isSelected ? '14pt sans-serif' : '12pt sans-serif',
              pixelOffset: new Cesium.Cartesian2(0, isSelected ? -50 : -40),
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              disableDepthTestDistance: Number.POSITIVE_INFINITY, // Always visible
            } : undefined,
          });
        }
      });

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

  useEffect(() => {
    if (!viewerRef.current || !selectedFeatureId) return;

    const selectedFeature = features.find(feature =>
      feature.properties?.id === selectedFeatureId
    );

    if (selectedFeature?.geometry?.type === 'Point') {
      const [longitude, latitude] = selectedFeature.geometry.coordinates;
      const zoomHeight = 150000;

      viewerRef.current.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, zoomHeight),
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

  const buttonStyle = {
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

  const smallButtonStyle = {
    ...buttonStyle,
    fontSize: "16px",
    fontWeight: "normal"
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
          ".cesium-viewer-toolbar": {
            display: "none !important",
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

      {/* Control Panel */}
      <div style={{
        position: "absolute",
        bottom: "20px",
        right: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        zIndex: 1000
      }}>
        <button onClick={handleHome} style={smallButtonStyle} title="View Home">🏠</button>
        <button onClick={() => handleZoom(true)} style={buttonStyle} title="Zoom In">+</button>
        <button onClick={() => handleZoom(false)} style={buttonStyle} title="Zoom Out">−</button>
        <button onClick={() => handleTiltAdjust('up')} style={smallButtonStyle} title="Tilt Up">↑</button>
        <button onClick={() => handleTiltAdjust('down')} style={smallButtonStyle} title="Tilt Down">↓</button>
        <button onClick={() => handleRotate('left')} style={smallButtonStyle} title="Rotate Left">↶</button>
        <button onClick={() => handleRotate('right')} style={smallButtonStyle} title="Rotate Right">↷</button>
      </div>
    </div>
  );
}
