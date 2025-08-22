import { useRef, useEffect } from "react";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
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
import { useLayerEffects } from "./map/useLayerEffects";
import { useMapEvents } from "./map/useMapEvents";

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

  // Layer effects management
  useLayerEffects({
    worldBoundariesLayerRef,
    oceanCurrentsLayerRef,
    adultLiteracyLayer,
    olView,
    layerVisibility: {
      worldBoundaries: layerVisibility.worldBoundaries,
      oceanCurrents: layerVisibility.oceanCurrents,
      adultLiteracy: layerVisibility.adultLiteracy,
    },
  });

  // Map events management
  useMapEvents({
    olMap,
    olView,
    mapRef,
    onMapClick,
    onFeatureClick,
    onFeatureHover,
    handlePointerMove,
  });

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
