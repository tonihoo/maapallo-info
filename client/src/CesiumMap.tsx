import { useEffect, useRef, useState, useCallback } from "react";
import * as Cesium from "cesium";
import { GlobalStyles } from "@mui/material";
import { Feature, Geometry, GeoJsonProperties } from "geojson";
import { CoordinatesDisplay } from "./CoordinatesDisplay";
import { LocationSearch } from "./LocationSearch";

// Set Cesium configuration properly for Vite build
// The CESIUM_BASE_URL is defined in vite.config.ts
declare const CESIUM_BASE_URL: string;

// Set up Cesium base URL
if (typeof window !== "undefined") {
  try {
    // Set the base URL for Cesium
    (window as any).CESIUM_BASE_URL =
      typeof CESIUM_BASE_URL !== "undefined"
        ? CESIUM_BASE_URL
        : "/node_modules/cesium/Build/Cesium/";
  } catch (error) {
    console.warn("Could not set CESIUM_BASE_URL:", error);
    (window as any).CESIUM_BASE_URL = "/node_modules/cesium/Build/Cesium/";
  }
}

// Get Cesium Ion token from environment variable
const CESIUM_ION_TOKEN = import.meta.env.VITE_CESIUM_ION_TOKEN;

if (
  !CESIUM_ION_TOKEN ||
  CESIUM_ION_TOKEN === "YOUR_NEW_CESIUM_ION_TOKEN_HERE"
) {
  console.warn(
    "Warning: Cesium Ion token not set in .env file. Satellite imagery may not load properly."
  );
  console.warn(
    "Please add VITE_CESIUM_ION_TOKEN to your .env file with your token from https://cesium.com/ion/tokens"
  );
}

// Set the Cesium Ion access token
if (CESIUM_ION_TOKEN && CESIUM_ION_TOKEN !== "YOUR_NEW_CESIUM_ION_TOKEN_HERE") {
  Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;
}

interface Props {
  features: Feature<Geometry, GeoJsonProperties>[];
  onMapClick?: (coordinates: number[]) => void;
  selectedFeatureId?: number | null;
  onFeatureClick?: (featureId: number) => void;
}

// Constants
const INITIAL_CAMERA_POSITION = {
  longitude: 44.0,
  latitude: 10.0,
  height: 16000000,
};

const INITIAL_CAMERA_ORIENTATION = {
  heading: 0.0,
  pitch: -Cesium.Math.PI_OVER_TWO,
  roll: 0.0,
};

const ZOOM_LIMITS = {
  min: 0,
  max: 15000000,
};

const ANIMATION_DURATIONS = {
  zoom: 0.8,
  tilt: 0.5,
  rotate: 0.5,
  home: 2.0,
};

export function CesiumMap({
  features = [],
  onMapClick,
  selectedFeatureId,
  onFeatureClick,
}: Props) {
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const [mouseCoordinates, setMouseCoordinates] = useState<{
    lon: number;
    lat: number;
  } | null>(null);

  const loadCountryBoundaries = useCallback(async (viewer: Cesium.Viewer) => {
    try {
      const countriesDataSource = await Cesium.GeoJsonDataSource.load(
        "/data/world.geojson",
        {
          stroke: Cesium.Color.WHITE,
          fill: Cesium.Color.TRANSPARENT,
          strokeWidth: 2,
        }
      );

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
          const hierarchy = entity.polygon.hierarchy.getValue(
            Cesium.JulianDate.now()
          );

          if (hierarchy?.positions?.length > 0) {
            const boundingSphere = Cesium.BoundingSphere.fromPoints(
              hierarchy.positions
            );
            const cartographic = Cesium.Cartographic.fromCartesian(
              boundingSphere.center
            );

            viewer.entities.add({
              id: `country-label-${index}`,
              position: Cesium.Cartesian3.fromRadians(
                cartographic.longitude,
                cartographic.latitude,
                0
              ),
              label: {
                text: name,
                font: "16pt Arial, sans-serif",
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                verticalOrigin: Cesium.VerticalOrigin.CENTER,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
                  0,
                  10000000
                ),
              },
            });
          }
        }
      });
    } catch (error) {
      console.error("Failed to load country boundaries:", error);
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

  // Move the initializeViewer function to only depend on stable callbacks
  const initializeViewer = useCallback(
    async (containerElement: HTMLDivElement) => {
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
          requestRenderMode: true,
        });

        // Add mouse move handler for coordinate tracking
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

        handler.setInputAction((movement: any) => {
          const cartesian = viewer.camera.pickEllipsoid(
            movement.endPosition,
            viewer.scene.globe.ellipsoid
          );
          if (cartesian) {
            const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            const longitude = Cesium.Math.toDegrees(cartographic.longitude);
            const latitude = Cesium.Math.toDegrees(cartographic.latitude);

            setMouseCoordinates({
              lon: Number(longitude.toFixed(4)),
              lat: Number(latitude.toFixed(4)),
            });
          }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        // Add click handler for feature selection and zoom
        handler.setInputAction((click: any) => {
          const pickedObject = viewer.scene.pick(click.position);

          if (pickedObject && pickedObject.id) {
            const entity = pickedObject.id;

            // Check if it's a feature entity (starts with 'feature-')
            if (
              typeof entity.id === "string" &&
              entity.id.startsWith("feature-")
            ) {
              // Extract the feature index from the entity ID
              const featureIndex = parseInt(entity.id.replace("feature-", ""));

              // Use the current features from the ref instead of closure
              const currentFeatures = featuresRef.current;
              const feature = currentFeatures[featureIndex];

              if (feature && feature.properties?.id) {
                // Call the onFeatureClick callback if provided
                onFeatureClick?.(feature.properties.id);

                // Zoom to the feature immediately on single click
                if (feature.geometry?.type === "Point") {
                  const [longitude, latitude] = feature.geometry.coordinates;
                  const zoomHeight = 50000;

                  viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(
                      longitude,
                      latitude,
                      zoomHeight
                    ),
                    orientation: {
                      heading: viewer.scene.camera.heading,
                      pitch: viewer.scene.camera.pitch,
                      roll: viewer.scene.camera.roll,
                    },
                    duration: 1.5,
                    easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
                  });
                }
              }
            }
          } else if (onMapClick) {
            // Clicked on empty space - handle map click for adding new features
            const cartesian = viewer.camera.pickEllipsoid(
              click.position,
              viewer.scene.globe.ellipsoid
            );
            if (cartesian) {
              const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
              const longitude = Cesium.Math.toDegrees(cartographic.longitude);
              const latitude = Cesium.Math.toDegrees(cartographic.latitude);
              onMapClick([longitude, latitude]);
            }
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Set initial camera position
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(
            INITIAL_CAMERA_POSITION.longitude,
            INITIAL_CAMERA_POSITION.latitude,
            INITIAL_CAMERA_POSITION.height
          ),
          orientation: INITIAL_CAMERA_ORIENTATION,
        });

        // Add these settings for better text rendering:
        viewer.scene.postProcessStages.fxaa.enabled = false;
        viewer.resolutionScale = 2.0;
        viewer.scene.highDynamicRange = false;
        viewer.scene.globe.enableLighting = false;
        viewer.scene.fog.enabled = false;
        viewer.scene.skyAtmosphere.show = false;

        setupCameraControls(viewer);
        await loadCountryBoundaries(viewer);

        // Add camera move handler to update marker visibility
        viewer.scene.camera.changed.addEventListener(() => {
          // Debounce the camera change events to avoid excessive updates
          if (cameraChangeTimeoutRef.current) {
            clearTimeout(cameraChangeTimeoutRef.current);
          }
          cameraChangeTimeoutRef.current = setTimeout(() => {
            updateMarkerVisibility();
          }, 100);
        });

        viewerRef.current = viewer;
        setLoading(false);
        setViewerReady(true);

        setTimeout(() => viewer.resize(), 100);
      } catch (error) {
        console.error("Failed to initialize Cesium viewer:", error);
        setError("Failed to initialize 3D map: " + (error as Error).message);
        setLoading(false);
        setViewerReady(false);
      }
    },
    [setupCameraControls, loadCountryBoundaries, onMapClick, onFeatureClick]
  );

  // Add a ref to track features and camera change timeout
  const featuresRef = useRef(features);
  const cameraChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to check if a point is on the visible hemisphere
  const isPointOnVisibleHemisphere = useCallback(
    (longitude: number, latitude: number): boolean => {
      if (!viewerRef.current) return true;

      const camera = viewerRef.current.scene.camera;
      const cameraPosition = camera.positionWC;

      // Convert marker position to Cartesian3
      const markerPosition = Cesium.Cartesian3.fromDegrees(longitude, latitude);

      // Calculate vector from Earth center to camera
      const cameraFromCenter = Cesium.Cartesian3.normalize(
        cameraPosition,
        new Cesium.Cartesian3()
      );

      // Calculate vector from Earth center to marker
      const markerFromCenter = Cesium.Cartesian3.normalize(
        markerPosition,
        new Cesium.Cartesian3()
      );

      // Calculate dot product - if positive, they're on the same hemisphere
      const cameraHeight = camera.positionCartographic.height;
      const dotProduct = Cesium.Cartesian3.dot(
        cameraFromCenter,
        markerFromCenter
      );
      const threshold = -0.8;

      return dotProduct > threshold;
    },
    []
  );

  // Function to update marker visibility based on current camera position
  const updateMarkerVisibility = useCallback(() => {
    if (!viewerRef.current?.entities) return;

    const entities = viewerRef.current.entities.values;
    entities.forEach((entity) => {
      if (
        entity.id &&
        typeof entity.id === "string" &&
        entity.id.startsWith("feature-")
      ) {
        const featureIndex = parseInt(entity.id.replace("feature-", ""));
        const feature = featuresRef.current[featureIndex];

        if (
          feature?.geometry?.type === "Point" &&
          feature.geometry.coordinates
        ) {
          const [longitude, latitude] = feature.geometry.coordinates;
          const isVisible = isPointOnVisibleHemisphere(longitude, latitude);

          // Update entity visibility
          if (entity.point) {
            entity.point.show = isVisible;
          }
          if (entity.label) {
            entity.label.show = isVisible;
          }
        }
      }
    });
  }, [isPointOnVisibleHemisphere]);

  // Update the features ref when features change
  useEffect(() => {
    featuresRef.current = features;
  }, [features]);
  const containerCallbackRef = useCallback(
    (containerElement: HTMLDivElement | null) => {
      if (containerElement) {
        initializeViewer(containerElement);
      }
    },
    [initializeViewer]
  );

  // Camera control functions
  const handleZoom = useCallback(
    (zoomIn: boolean) => {
      if (!viewerRef.current) {
        return;
      }

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
          roll: camera.roll,
        },
        duration: ANIMATION_DURATIONS.zoom,
        easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
      });
    },
    [viewerReady]
  ); // Add viewerReady as dependency

  const handleTiltAdjust = useCallback((direction: "up" | "down") => {
    if (!viewerRef.current) return;

    const camera = viewerRef.current.scene.camera;
    const pitchIncrement = Cesium.Math.toRadians(15);
    const newPitch =
      direction === "up"
        ? Math.min(camera.pitch + pitchIncrement, 0)
        : Math.max(camera.pitch - pitchIncrement, -Cesium.Math.PI_OVER_TWO);

    camera.flyTo({
      destination: camera.position,
      orientation: {
        heading: camera.heading,
        pitch: newPitch,
        roll: camera.roll,
      },
      duration: ANIMATION_DURATIONS.tilt,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }, []);

  const handleRotate = useCallback((direction: "left" | "right") => {
    if (!viewerRef.current) return;

    const camera = viewerRef.current.scene.camera;
    const rotationIncrement = Cesium.Math.toRadians(15);
    const newHeading =
      direction === "left"
        ? camera.heading - rotationIncrement
        : camera.heading + rotationIncrement;

    camera.flyTo({
      destination: camera.position,
      orientation: {
        heading: newHeading,
        pitch: camera.pitch,
        roll: camera.roll,
      },
      duration: ANIMATION_DURATIONS.rotate,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
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
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }, []);

  // Effects
  useEffect(() => {
    return () => {
      // Clean up timeout
      if (cameraChangeTimeoutRef.current) {
        clearTimeout(cameraChangeTimeoutRef.current);
      }

      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
        setViewerReady(false);
      }
    };
  }, []);

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
      entitiesToRemove.forEach((entity) => {
        if (viewerRef.current) {
          viewerRef.current.entities.remove(entity);
        }
      });

      // Helper function to check if a point is on the visible hemisphere
      const isPointOnVisibleHemisphere = (
        longitude: number,
        latitude: number
      ): boolean => {
        if (!viewerRef.current) return true;

        const camera = viewerRef.current.scene.camera;
        const cameraPosition = camera.positionWC;

        // Convert marker position to Cartesian3
        const markerPosition = Cesium.Cartesian3.fromDegrees(
          longitude,
          latitude
        );

        // Calculate vector from Earth center to camera
        const cameraFromCenter = Cesium.Cartesian3.normalize(
          cameraPosition,
          new Cesium.Cartesian3()
        );

        // Calculate vector from Earth center to marker
        const markerFromCenter = Cesium.Cartesian3.normalize(
          markerPosition,
          new Cesium.Cartesian3()
        );

        // Calculate dot product - if positive, they're on the same hemisphere
        const cameraHeight = camera.positionCartographic.height;
        const dotProduct = Cesium.Cartesian3.dot(
          cameraFromCenter,
          markerFromCenter
        );

        const threshold = -0.8;

        return dotProduct > threshold;
      };

      // Add new features with visibility filtering
      features.forEach((feature, index) => {
        if (
          feature?.geometry?.type === "Point" &&
          feature.geometry.coordinates
        ) {
          const [longitude, latitude] = feature.geometry.coordinates;
          const isSelected = feature.properties?.isSelected;

          // Check if the marker is on the visible hemisphere
          const isVisible = isPointOnVisibleHemisphere(longitude, latitude);

          if (isVisible && viewerRef.current) {
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
                heightReference: Cesium.HeightReference.NONE, // Changed from CLAMP_TO_GROUND
                disableDepthTestDistance: Number.POSITIVE_INFINITY, // Always visible
              },
              label: feature.properties?.title
                ? {
                    // Changed from 'name' to 'title'
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
                    disableDepthTestDistance: Number.POSITIVE_INFINITY, // Always visible
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
  }, [features]);

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

  // Handle location search selection
  const handleLocationSelect = useCallback((lat: number, lon: number) => {
    if (!viewerRef.current) return;

    // Zoom to the selected location
    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, 1000000),
      duration: 2.0,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }, []);

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
    justifyContent: "center",
  } as const;

  const smallButtonStyle = {
    ...buttonStyle,
    fontSize: "16px",
    fontWeight: "normal",
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
            display: "none !important",
          },
          // Move Cesium navigation widget higher on mobile to avoid search panel overlap
          "@media (max-width: 959px)": {
            ".cesium-viewer .cesium-viewer-navigationContainer": {
              bottom: "250px !important", // Lift navigation controls much higher on mobile
              right: "15px !important",
            },
            ".cesium-navigationHelpButton-wrapper": {
              bottom: "250px !important", // Lift navigation controls much higher on mobile
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

      {/* Location Search */}
      <LocationSearch onLocationSelect={handleLocationSelect} />

      {/* Control Panel */}
      <div
        style={{
          position: "absolute",
          bottom: "50px",
          right: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          zIndex: 1000,
        }}
      >
        <button
          onClick={handleHome}
          style={smallButtonStyle}
          title="View Home"
          disabled={!viewerReady}
        >
          🏠
        </button>
        <button
          onClick={() => handleZoom(true)}
          style={buttonStyle}
          title="Zoom In"
          disabled={!viewerReady}
        >
          +
        </button>
        <button
          onClick={() => handleZoom(false)}
          style={buttonStyle}
          title="Zoom Out"
          disabled={!viewerReady}
        >
          −
        </button>
        <button
          onClick={() => handleTiltAdjust("up")}
          style={smallButtonStyle}
          title="Tilt Up"
          disabled={!viewerReady}
        >
          ↑
        </button>
        <button
          onClick={() => handleTiltAdjust("down")}
          style={smallButtonStyle}
          title="Tilt Down"
          disabled={!viewerReady}
        >
          ↓
        </button>
        <button
          onClick={() => handleRotate("left")}
          style={smallButtonStyle}
          title="Rotate Left"
          disabled={!viewerReady}
        >
          ↶
        </button>
        <button
          onClick={() => handleRotate("right")}
          style={smallButtonStyle}
          title="Rotate Right"
          disabled={!viewerReady}
        >
          ↷
        </button>
      </div>

      <CoordinatesDisplay coordinates={mouseCoordinates} />
    </div>
  );
}
