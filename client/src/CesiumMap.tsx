import { useEffect, useRef, useState, useCallback } from "react";
import * as Cesium from "cesium";
import { GlobalStyles } from "@mui/material";
import { FeatureTypes } from "@shared/featureTypes";

// Set Cesium base URL for assets
if (typeof window !== 'undefined') {
  (window as any).CESIUM_BASE_URL = '/node_modules/cesium/Build/Cesium/';
}

// Set Cesium Ion access token
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYWE1OWUxNy1mMWZiLTQzYjYtYTQ0OS1kMWFjYmFkNjc5YzciLCJpZCI6NTc3MzMsImlhdCI6MTYyNzg0NTE4Mn0.XcKpgANiY19MC4bdFUXMVEBToBmqS8kuYpUlxJHYZxk';

interface Props {
  features: FeatureTypes[]; // Change this to match what App.tsx sends
  onMapClick: (coordinates: number[]) => void;
}

export function CesiumMap({ features = [], onMapClick }: Props) {
  console.log('CesiumMap component rendered');

  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize the click handler to prevent unnecessary re-renders
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

  // Use callback ref to initialize Cesium when container is available
  const containerCallbackRef = useCallback((containerElement: HTMLDivElement | null) => {
    console.log('CesiumMap: Callback ref called with:', containerElement);

    if (!containerElement) {
      console.log('CesiumMap: Container removed');
      return;
    }

    console.log('CesiumMap: Container is ready, initializing...');

    const initializeViewer = async () => {
      try {
        console.log('CesiumMap: About to create Cesium.Viewer');

        // Initialize Cesium viewer
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

        console.log('CesiumMap: Viewer created successfully');

        // Force resize to ensure it fills the container
        setTimeout(() => {
          viewer.resize();
        }, 100);

        // Set camera to show whole Earth at safe distance
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(0.0, 0.0, 12000000), // 12 million meters to see whole Earth
          orientation: {
            heading: 0.0,
            pitch: -Cesium.Math.PI_OVER_TWO,
            roll: 0.0
          }
        });

        // COMPLETELY disable all automatic camera movements
        viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
        viewer.scene.screenSpaceCameraController.enableLook = true;
        viewer.scene.screenSpaceCameraController.enableRotate = true;
        viewer.scene.screenSpaceCameraController.enableTranslate = true;
        viewer.scene.screenSpaceCameraController.enableZoom = true;
        viewer.scene.screenSpaceCameraController.enableTilt = true;

        // Set zoom limits to prevent going to space but allow good Earth view
        viewer.scene.screenSpaceCameraController.minimumZoomDistance = 100000; // 100k meters minimum (street level)
        viewer.scene.screenSpaceCameraController.maximumZoomDistance = 15000000; // 15 million meters maximum (prevents space view)

        // Re-enable Cesium's built-in zoom
        viewer.scene.screenSpaceCameraController.enableZoom = true;

        // Remove the custom wheel event handler that wasn't working
        // viewer.cesiumWidget.canvas.addEventListener('wheel', (event) => {
        //   // Remove this entire block
        // }, { passive: false });

        // Add a post-render listener to enforce zoom limits after any camera movement
        viewer.scene.postRender.addEventListener(() => {
          const cameraHeight = viewer.scene.camera.positionCartographic.height;

          // If camera is too high (in space), smoothly bring it back down
          if (cameraHeight > 15000000) {
            const currentPosition = viewer.scene.camera.positionCartographic;
            viewer.scene.camera.position = Cesium.Cartesian3.fromRadians(
              currentPosition.longitude,
              currentPosition.latitude,
              15000000
            );
          }

          // If camera is too low, bring it back up
          if (cameraHeight < 100000) {
            const currentPosition = viewer.scene.camera.positionCartographic;
            viewer.scene.camera.position = Cesium.Cartesian3.fromRadians(
              currentPosition.longitude,
              currentPosition.latitude,
              100000
            );
          }
        });

        // Disable automatic entity tracking completely
        viewer.trackedEntity = undefined;
        viewer.selectedEntity = undefined;

        // Handle click events
        viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(
          handleMapClick,
          Cesium.ScreenSpaceEventType.LEFT_CLICK
        );

        viewerRef.current = viewer;
        setLoading(false);

      } catch (error) {
        console.error('Failed to initialize Cesium viewer:', error);
        setError('Failed to initialize 3D map: ' + (error as Error).message);
        setLoading(false);
      }
    };

    initializeViewer();
  }, [handleMapClick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (viewerRef.current) {
        console.log('CesiumMap: Cleaning up viewer');
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // Handle features updates without camera movement
  useEffect(() => {
    if (!viewerRef.current || !viewerRef.current.entities) return;

    try {
      // Clear existing entities
      viewerRef.current.entities.removeAll();

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

      // Force prevent any automatic zooming after adding entities
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

  console.log('CesiumMap: Rendering with loading =', loading, 'error =', error);

  if (error) {
    console.log('CesiumMap: Rendering error state');
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

  // Always render the container, let loading state show inside it
  console.log('CesiumMap: Rendering container');
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
            maxWidth: "600px !important", // Force smaller canvas width
            maxHeight: "400px !important", // Force smaller canvas height
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
      <div
        ref={containerCallbackRef}
        style={{
          width: "600px",  // Force smaller container
          height: "400px", // Force smaller container
          margin: "auto"   // Center it
        }}
      >
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
    </div>
  );
}
