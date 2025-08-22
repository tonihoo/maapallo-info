import { useEffect, useRef } from "react";
import { toLonLat } from "ol/proj";
import type { MapBrowserEvent } from "ol";
import { Point } from "ol/geom";
import VectorLayer from "ol/layer/Vector";
import {
  Feature as GeoJSONFeature,
  Geometry,
  GeoJsonProperties,
} from "geojson";
import { useLayerVisibility } from "./map/useLayerVisibility";
import { useMeasurement } from "./map/useMeasurement";
import { useMouseCoordinates } from "./map/useMouseCoordinates";
import { useMapView } from "./map/useMapView";
import { useMapInitialization } from "./map/useMapInitialization";
import { useDataLoading } from "./map/useDataLoading";
import { useFeatureManagement } from "./map/useFeatureManagement";

interface UseOpenLayersMapProps {
  features: GeoJSONFeature<Geometry, GeoJsonProperties>[];
  selectedFeatureId: number | null;
  onMapClick?: (coordinates: number[]) => void;
  onFeatureClick?: (featureId: number) => void;
  onFeatureHover?: (featureId: number | null) => void;
}

export function useOpenLayersMap({
  features,
  selectedFeatureId,
  onMapClick,
  onFeatureClick,
  onFeatureHover,
}: UseOpenLayersMapProps) {
  // Measurement source reference
  const measureSourceRef = useRef<VectorSource | null>(null);

  // World boundaries layer reference
  const worldBoundariesLayerRef = useRef<VectorLayer<VectorSource> | null>(
    null
  );

  // Ocean currents layer reference
  const oceanCurrentsLayerRef = useRef<VectorLayer<VectorSource> | null>(null);

  // Layer visibility management
  const { layerVisibility, handleLayerVisibilityChange, adultLiteracyLayer } =
    useLayerVisibility({
      worldBoundariesLayerRef,
      oceanCurrentsLayerRef,
    });

  // Flag to track if adult literacy layer has been added
  const adultLiteracyLayerAddedRef = useRef<boolean>(false);

  // Map view management
  const { olView, handleZoom, handleRotate, handleHome, handleLocationSelect } =
    useMapView();

  // Map initialization management
  const { olMap, mapRef, currentBaseMap, handleBaseMapChange } =
    useMapInitialization({
      olView,
      styleFunction: undefined, // Will be provided by feature management
      measureSourceRef,
      worldBoundariesLayerRef,
      oceanCurrentsLayerRef,
    });

  // Feature management
  const { styleFunction } = useFeatureManagement({
    features,
    selectedFeatureId,
    olMap,
    olView,
    layerVisibility: {
      articleLocators: layerVisibility.articleLocators,
    },
  });

  // Update map initialization with styleFunction after it's available
  useEffect(() => {
    if (olMap && styleFunction) {
      // Find the features layer and set the style function
      const layers = olMap.getLayers().getArray();
      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        if (layer instanceof VectorLayer && layer.getZIndex() === 20) {
          layer.setStyle(styleFunction);
          break;
        }
      }
    }
  }, [olMap, styleFunction]);

  // Measurement management
  const {
    isMeasuring,
    currentMeasurement,
    toggleMeasurement,
    clearMeasurements,
  } = useMeasurement({
    olMap,
    measureSourceRef,
  });

  // Mouse coordinates management
  const { mouseCoordinates, handlePointerMove } = useMouseCoordinates({
    olMap,
    onFeatureHover,
  });

  // Data loading management
  useDataLoading({
    olMap,
    worldBoundariesLayerRef,
    oceanCurrentsLayerRef,
    adultLiteracyLayer,
    adultLiteracyLayerAddedRef,
  });

  // Update layer visibility when state changes
  useEffect(() => {
    if (worldBoundariesLayerRef.current) {
      worldBoundariesLayerRef.current.setVisible(
        layerVisibility.worldBoundaries
      );
    }
  }, [layerVisibility.worldBoundaries]);

  useEffect(() => {
    if (oceanCurrentsLayerRef.current) {
      oceanCurrentsLayerRef.current.setVisible(layerVisibility.oceanCurrents);

      // Force a redraw to ensure the layer updates
      if (layerVisibility.oceanCurrents) {
        oceanCurrentsLayerRef.current.changed();
      }
    }
  }, [layerVisibility.oceanCurrents]);

  // Update adult literacy layer visibility when state changes
  useEffect(() => {
    adultLiteracyLayer.setVisible(layerVisibility.adultLiteracy);
  }, [layerVisibility.adultLiteracy, adultLiteracyLayer]);

  // Update world boundaries style when zoom changes (for labels)
  useEffect(() => {
    const handleZoomChange = () => {
      if (worldBoundariesLayerRef.current) {
        // Force style update by changing the layer
        worldBoundariesLayerRef.current.changed();
      }
    };

    olView.on("change:resolution", handleZoomChange);

    return () => {
      olView.un("change:resolution", handleZoomChange);
    };
  }, [olView]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    olMap.setTarget(mapRef.current as HTMLElement);

    // Handle click events
    const clickHandler = (event: MapBrowserEvent<UIEvent>) => {
      try {
        const feature = olMap.forEachFeatureAtPixel(
          event.pixel,
          (feature) => feature
        );

        if (feature && feature.get("featureType") === "feature") {
          const featureId = feature.get("id");
          if (featureId && onFeatureClick) {
            onFeatureClick(featureId);

            const geometry = feature.getGeometry();
            if (geometry && geometry instanceof Point) {
              olView.animate({
                center: geometry.getCoordinates(),
                zoom: 8,
                duration: 1000,
              });
            }
          }
        } else if (onMapClick && event.coordinate) {
          const coordinates = toLonLat(event.coordinate);
          onMapClick(coordinates);
        }
      } catch (error) {
        console.error("Error in click handler:", error);
      }
    };

    olMap.on("click", clickHandler);
    olMap.on("pointermove", handlePointerMove);

    return () => {
      olMap.un("click", clickHandler);
      olMap.un("pointermove", handlePointerMove);
    };
  }, [
    olMap,
    onMapClick,
    onFeatureClick,
    onFeatureHover,
    olView,
    handlePointerMove,
  ]);

  return {
    mapRef,
    mouseCoordinates,
    currentBaseMap,
    handleZoom,
    handleRotate,
    handleHome,
    handleLocationSelect,
    handleBaseMapChange,
    isMeasuring,
    currentMeasurement,
    toggleMeasurement,
    clearMeasurements,
    layerVisibility,
    handleLayerVisibilityChange,
    adultLiteracyLegendData: adultLiteracyLayer.getLegendData(),
  };
}
