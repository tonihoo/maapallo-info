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
  features: FeatureTypes[];
  onMapClick: (coordinates: number[]) => void;
  selectedFeatureId?: number | null; // Add this prop
}

export function CesiumMap({ features = [], onMapClick, selectedFeatureId }: Props) {
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

        // Set zoom limits to allow much closer zoom but prevent going to space
        viewer.scene.screenSpaceCameraController.minimumZoomDistance = 1; // 1 meter minimum (very close street level)
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

          // If camera is too low, bring it back up (now much closer)
          if (cameraHeight < 1) {
            const currentPosition = viewer.scene.camera.positionCartographic;
            viewer.scene.camera.position = Cesium.Cartesian3.fromRadians(
              currentPosition.longitude,
              currentPosition.latitude,
              1
            );
          }
        });

        // Disable automatic entity tracking completely
        viewer.trackedEntity = undefined;
        viewer.selectedEntity = undefined;

        // Add country boundaries and labels as vector overlay
        try {
          // Load country boundaries from local file
          const countriesDataSource = await Cesium.GeoJsonDataSource.load(
            '/data/world.geojson',
            {
              stroke: Cesium.Color.WHITE, // Ensure stroke color is set
              fill: Cesium.Color.TRANSPARENT, // Ensure fill is transparent
              strokeWidth: 2 // Set stroke width for visibility
            }
          );

          viewer.dataSources.add(countriesDataSource);

          // Style the country boundaries
          const entities = countriesDataSource.entities.values;
          for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];

            if (entity.polygon) {
              entity.polygon.material = Cesium.Color.TRANSPARENT; // Transparent fill
              entity.polygon.outline = true; // Enable outline
              entity.polygon.outlineColor = Cesium.Color.WHITE.withAlpha(0.8); // Set outline color
              entity.polygon.outlineWidth = 2; // Set outline width
              entity.polygon.height = 0; // Ensure height is set to 0
              entity.polygon.extrudedHeight = 0; // Ensure extruded height is set to 0
            }

            // Add country name labels
            if (entity.properties && entity.properties.name) {
              const name = entity.properties.name.getValue();

              // Calculate the center of the polygon for label placement
              if (entity.polygon) {
                const hierarchy = entity.polygon.hierarchy.getValue(Cesium.JulianDate.now());
                if (hierarchy && hierarchy.positions.length > 0) {
                  const boundingSphere = Cesium.BoundingSphere.fromPoints(hierarchy.positions);
                  const center = boundingSphere.center;
                  const cartographic = Cesium.Cartographic.fromCartesian(center);

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
                      disableDepthTestDistance: Number.POSITIVE_INFINITY, // Ensure labels are always visible
                    },
                  });
                }
              }
            }
          }

          console.log('Successfully loaded and styled country boundaries');
        } catch (error) {
          console.error('Failed to load country boundaries:', error);
        }

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
      // Remove only feature entities, not country borders/labels
      const entitiesToRemove = [];
      for (let i = 0; i < viewerRef.current.entities.values.length; i++) {
        const entity = viewerRef.current.entities.values[i];
        if (entity.id && typeof entity.id === 'string' && entity.id.startsWith('feature-')) {
          entitiesToRemove.push(entity);
        }
      }

      entitiesToRemove.forEach(entity => {
        viewerRef.current!.entities.remove(entity);
      });

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

      // Prevent automatic zooming after adding entities
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

  // Add useEffect to handle selected feature centering with smooth animation
  useEffect(() => {
    if (!viewerRef.current || !selectedFeatureId) return;

    // Find the selected feature in the mapFeatures array
    const selectedFeature = features.find(feature =>
      feature.properties?.id === selectedFeatureId
    );

    if (!selectedFeature || selectedFeature.geometry?.type !== 'Point') return;

    const [longitude, latitude] = selectedFeature.geometry.coordinates;

    // Get current camera height to maintain zoom level
    const currentHeight = viewerRef.current.scene.camera.positionCartographic.height;

    // Smooth camera animation to selected feature
    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, currentHeight),
      orientation: {
        heading: viewerRef.current.scene.camera.heading,
        pitch: viewerRef.current.scene.camera.pitch,
        roll: viewerRef.current.scene.camera.roll
      },
      duration: 2.0, // 2 seconds animation duration
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT, // Smooth easing
    });

  }, [selectedFeatureId, features]);

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

  // Remove the forced small container size and make it fullscreen
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
            // Remove the maxWidth and maxHeight restrictions
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
          width: "100%",   // Full width instead of 600px
          height: "100%",  // Full height instead of 400px
          // Remove margin: "auto"
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
