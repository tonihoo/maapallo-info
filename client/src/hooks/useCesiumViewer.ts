import { useCallback, useRef, useState, useEffect } from "react";
import * as Cesium from "cesium";
import { Feature, Geometry, GeoJsonProperties } from "geojson";
import {
  INITIAL_CAMERA,
  LIMITS_AND_DURATIONS,
  OPTIMIZED_CESIUM_OPTIONS,
} from "../utils/cesiumConfig";

interface UseCesiumViewerProps {
  onMapClick?: (coordinates: number[]) => void;
  onFeatureClick?: (featureId: number) => void;
}

export function useCesiumViewer({
  onMapClick,
  onFeatureClick,
}: UseCesiumViewerProps) {
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const cameraChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const [mouseCoordinates, setMouseCoordinates] = useState<{
    lon: number;
    lat: number;
  } | null>(null);

  const isPointOnVisibleHemisphere = useCallback(
    (longitude: number, latitude: number): boolean => {
      if (!viewerRef.current) return true;

      const camera = viewerRef.current.scene.camera;
      const cameraPosition = camera.positionWC;
      const markerPosition = Cesium.Cartesian3.fromDegrees(longitude, latitude);

      const cameraFromCenter = Cesium.Cartesian3.normalize(
        cameraPosition,
        new Cesium.Cartesian3()
      );
      const markerFromCenter = Cesium.Cartesian3.normalize(
        markerPosition,
        new Cesium.Cartesian3()
      );
      const dotProduct = Cesium.Cartesian3.dot(
        cameraFromCenter,
        markerFromCenter
      );

      return dotProduct > LIMITS_AND_DURATIONS.visibility.threshold;
    },
    []
  );

  const updateMarkerVisibility = useCallback(
    (
      featuresRef: React.MutableRefObject<
        Feature<Geometry, GeoJsonProperties>[]
      >
    ) => {
      if (!viewerRef.current?.entities) return;

      const entities = viewerRef.current.entities.values;
      entities.forEach((entity) => {
        if (entity.id?.toString().startsWith("feature-")) {
          const featureIndex = parseInt(
            entity.id.toString().replace("feature-", "")
          );
          const feature = featuresRef.current[featureIndex];

          if (feature?.geometry?.type === "Point") {
            const [longitude, latitude] = feature.geometry.coordinates;
            const isVisible = isPointOnVisibleHemisphere(longitude, latitude);

            if (entity.point) entity.point.show = new Cesium.ConstantProperty(isVisible);
            if (entity.label) entity.label.show = new Cesium.ConstantProperty(isVisible);
          }
        }
      });
    },
    [isPointOnVisibleHemisphere]
  );

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
          entity.polygon.material = new Cesium.ColorMaterialProperty(Cesium.Color.TRANSPARENT);
          entity.polygon.outline = new Cesium.ConstantProperty(true);
          entity.polygon.outlineColor = new Cesium.ConstantProperty(Cesium.Color.WHITE.withAlpha(0.5));
          entity.polygon.outlineWidth = new Cesium.ConstantProperty(1);
          entity.polygon.height = new Cesium.ConstantProperty(0);
          entity.polygon.extrudedHeight = new Cesium.ConstantProperty(0);
        }

        // Add country labels
        if (entity.properties?.name_fi && entity.polygon && entity.polygon.hierarchy) {
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
    controller.minimumZoomDistance = LIMITS_AND_DURATIONS.zoom.min;
    controller.maximumZoomDistance = LIMITS_AND_DURATIONS.zoom.max;
    controller.enableCollisionDetection = false;

    viewer.scene.postRender.addEventListener(() => {
      const height = viewer.scene.camera.positionCartographic.height;
      if (
        height > LIMITS_AND_DURATIONS.zoom.max ||
        height < LIMITS_AND_DURATIONS.zoom.min
      ) {
        const position = viewer.scene.camera.positionCartographic;
        viewer.scene.camera.position = Cesium.Cartesian3.fromRadians(
          position.longitude,
          position.latitude,
          Math.max(
            LIMITS_AND_DURATIONS.zoom.min,
            Math.min(height, LIMITS_AND_DURATIONS.zoom.max)
          )
        );
      }
    });
  }, []);

  const createEventHandlers = useCallback(
    (
      viewer: Cesium.Viewer,
      featuresRef: React.MutableRefObject<
        Feature<Geometry, GeoJsonProperties>[]
      >
    ) => {
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

      handler.setInputAction((click: any) => {
        const pickedObject = viewer.scene.pick(click.position);

        if (pickedObject && pickedObject.id) {
          const entity = pickedObject.id;

          // Check if this entity has an ID that starts with "feature-"
          if (
            entity.id &&
            typeof entity.id === "string" &&
            entity.id.startsWith("feature-")
          ) {
            const featureIndex = parseInt(entity.id.replace("feature-", ""));
            const feature = featuresRef.current[featureIndex];

            if (feature?.properties?.id) {
              onFeatureClick?.(feature.properties.id);

              if (feature.geometry?.type === "Point") {
                const [longitude, latitude] = feature.geometry.coordinates;
                viewer.camera.flyTo({
                  destination: Cesium.Cartesian3.fromDegrees(
                    longitude,
                    latitude,
                    50000
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

      return handler;
    },
    [onMapClick, onFeatureClick]
  );

  const initializeViewer = useCallback(
    async (
      containerElement: HTMLDivElement,
      featuresRef: React.MutableRefObject<
        Feature<Geometry, GeoJsonProperties>[]
      >
    ) => {
      try {
        const viewer = new Cesium.Viewer(containerElement, {
          ...OPTIMIZED_CESIUM_OPTIONS,
          baseLayerPicker: true, // Keep this enabled for imagery options
        });

        createEventHandlers(viewer, featuresRef);

        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(
            INITIAL_CAMERA.position.longitude,
            INITIAL_CAMERA.position.latitude,
            INITIAL_CAMERA.position.height
          ),
          orientation: INITIAL_CAMERA.orientation,
        });

        // Scene optimizations for better quality
        viewer.scene.postProcessStages.fxaa.enabled = true; // Enable anti-aliasing for smoother edges
        viewer.resolutionScale = 1.0; // Full resolution for crisp rendering
        viewer.scene.highDynamicRange = false;
        viewer.scene.globe.enableLighting = false;
        viewer.scene.fog.enabled = false;
        viewer.scene.skyAtmosphere.show = false;

        // Better quality settings while maintaining reasonable memory usage
        viewer.scene.globe.maximumScreenSpaceError = 2; // Lower value for higher detail
        viewer.scene.globe.tileCacheSize = 100; // Larger cache for smoother experience
        viewer.scene.globe.loadingDescendantLimit = 20; // More concurrent loads for responsiveness

        // Disable preloading to reduce memory usage
        viewer.scene.globe.preloadAncestors = false;
        viewer.scene.globe.preloadSiblings = false;

        setupCameraControls(viewer);
        await loadCountryBoundaries(viewer);

        viewer.scene.camera.changed.addEventListener(() => {
          if (cameraChangeTimeoutRef.current) {
            clearTimeout(cameraChangeTimeoutRef.current);
          }
          cameraChangeTimeoutRef.current = setTimeout(
            () => updateMarkerVisibility(featuresRef),
            100
          );
        });

        viewerRef.current = viewer;
        setLoading(false);
        setViewerReady(true);
        setTimeout(() => viewer.resize(), 100);
      } catch (error) {
        console.error("Failed to initialize Cesium viewer:", error);
        setError("Failed to initialize 3D map: " + (error as Error).message);
        setLoading(false);
      }
    },
    [
      setupCameraControls,
      loadCountryBoundaries,
      createEventHandlers,
      updateMarkerVisibility,
    ]
  );

  useEffect(() => {
    return () => {
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

  return {
    viewerRef,
    loading,
    error,
    viewerReady,
    mouseCoordinates,
    initializeViewer,
    isPointOnVisibleHemisphere,
  };
}
