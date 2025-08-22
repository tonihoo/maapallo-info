import { useCallback, useEffect, useRef } from "react";
import { Feature } from "ol";
import { GeoJSON } from "ol/format";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Circle } from "ol/style";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import { FeatureLike } from "ol/Feature";
import { toLonLat, fromLonLat } from "ol/proj";
import type { MapBrowserEvent } from "ol";
import { Point } from "ol/geom";
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

  // Store selectedFeatureId in a ref so it's always current
  const selectedFeatureIdRef = useRef<number | null>(selectedFeatureId);

  // Update the ref whenever selectedFeatureId changes
  useEffect(() => {
    selectedFeatureIdRef.current = selectedFeatureId;
  }, [selectedFeatureId]);

  // Create a styleFunction that uses the ref for the current value
  const styleFunction = useCallback((feature: FeatureLike) => {
    const featureType = feature.get("featureType");
    const featureId = feature.get("id");
    const currentSelectedId = selectedFeatureIdRef.current;
    const isSelected = featureId === currentSelectedId;

    if (featureType === "feature") {
      return new Style({
        image: new Circle({
          radius: isSelected ? 12 : 8,
          fill: new Fill({ color: isSelected ? "#ff0000" : "#ff8c00" }),
          stroke: new Stroke({
            color: isSelected ? "#ffffff" : "#000080",
            width: isSelected ? 3 : 2,
          }),
        }),
      });
    } else if (featureType === "clickLocation") {
      return new Style({
        image: new Circle({
          radius: 8,
          fill: new Fill({ color: "#FF6B35" }),
          stroke: new Stroke({ color: "#E55100", width: 3 }),
        }),
      });
    } else {
      return new Style({
        image: new Circle({
          radius: 7,
          fill: new Fill({ color: "#ffb34c" }),
          stroke: new Stroke({ color: "darkblue", width: 3 }),
        }),
      });
    }
  }, []);

  // Map view management
  const { olView, handleZoom, handleRotate, handleHome, handleLocationSelect } =
    useMapView();

  // Map initialization management
  const { olMap, mapRef, currentBaseMap, handleBaseMapChange } =
    useMapInitialization({
      olView,
      styleFunction,
      measureSourceRef,
      worldBoundariesLayerRef,
      oceanCurrentsLayerRef,
    });

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

  // Load world boundaries
  const loadWorldBoundaries = useCallback(async () => {
    try {
      const response = await fetch("/data/world.geojson");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const geojsonData = await response.json();

      if (worldBoundariesLayerRef.current) {
        const source = worldBoundariesLayerRef.current.getSource();

        if (source) {
          source.clear();

          const format = new GeoJSON();
          const features = format.readFeatures(geojsonData, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
          });

          source.addFeatures(features);

          // Force redraw
          worldBoundariesLayerRef.current.changed();
        }
      } else {
        console.error("❌ World boundaries layer reference is null!");
      }
    } catch (error) {
      console.warn("❌ Failed to load world boundaries:", error);
    }
  }, []);

  // Load ocean currents
  const loadOceanCurrents = useCallback(async () => {
    try {
      const response = await fetch("/data/ocean-currents.geojson");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const geojsonData = await response.json();

      if (oceanCurrentsLayerRef.current) {
        const source = oceanCurrentsLayerRef.current.getSource();

        if (source) {
          source.clear();

          const format = new GeoJSON();
          const features = format.readFeatures(geojsonData, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
          });

          source.addFeatures(features);

          // Force redraw
          oceanCurrentsLayerRef.current.changed();
        }
      }
    } catch (error) {
      console.warn("❌ Failed to load ocean currents:", error);
    }
  }, []);

  // Load world boundaries when map is ready
  useEffect(() => {
    if (olMap && worldBoundariesLayerRef.current) {
      // Small delay to ensure map is fully initialized
      const timer = setTimeout(() => {
        loadWorldBoundaries();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [olMap, loadWorldBoundaries]);

  // Load ocean currents when map is ready
  useEffect(() => {
    if (olMap && oceanCurrentsLayerRef.current) {
      // Small delay to ensure map is fully initialized
      const timer = setTimeout(() => {
        loadOceanCurrents();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [olMap, loadOceanCurrents]);

  // No separate loading needed - features come from props
  // Article locators visibility is controlled via the main features layer

  // Load adult literacy layer when map is ready (only once)
  useEffect(() => {
    if (olMap && !adultLiteracyLayerAddedRef.current) {
      const timer = setTimeout(async () => {
        const layer = await adultLiteracyLayer.getLayer();
        if (layer) {
          // Check if layer is already in the map
          const existingLayers = olMap.getLayers().getArray();
          const layerExists = existingLayers.some(
            (existingLayer) => existingLayer === layer
          );

          if (!layerExists) {
            // Insert at position 1 (after base map, before world boundaries)
            const layers = olMap.getLayers();
            layers.insertAt(1, layer);
            adultLiteracyLayerAddedRef.current = true;
          }
        }
      }, 100);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [olMap]); // Remove adultLiteracyLayer dependency

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

  // Effect to handle when features change (but visibility is controlled above)
  useEffect(() => {
    try {
      const layers = olMap.getLayers().getArray();

      // Find the features layer - it should be the VectorLayer with our styleFunction
      let featuresLayerIndex = -1;
      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        if (layer instanceof VectorLayer && layer.getZIndex() === 20) {
          featuresLayerIndex = i;
          break;
        }
      }

      if (featuresLayerIndex === -1) return;

      const vectorLayer = layers[
        featuresLayerIndex
      ] as VectorLayer<VectorSource>;
      const source = vectorLayer.getSource();
      if (!source) return;

      // Always clear first
      source.clear();

      // Only add features if layer is currently visible
      if (layerVisibility.articleLocators && features && features.length) {
        const olFeatures = features.map((geoJsonFeature) => {
          const olFeature = new Feature({
            geometry: new GeoJSON().readGeometry(geoJsonFeature.geometry, {
              dataProjection: "EPSG:4326",
              featureProjection: "EPSG:3857",
            }),
          });

          if (geoJsonFeature.properties) {
            Object.keys(geoJsonFeature.properties).forEach((key) => {
              olFeature.set(key, geoJsonFeature.properties?.[key]);
            });
          }

          return olFeature;
        });

        source.addFeatures(olFeatures);
      }

      // Always set the layer visibility to match the state
      vectorLayer.setVisible(layerVisibility.articleLocators);
    } catch (error) {
      console.error(
        "Error updating features when features prop changes:",
        error
      );
    }
  }, [features, olMap, layerVisibility.articleLocators]);

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

  // Zoom to selected feature
  useEffect(() => {
    try {
      if (!selectedFeatureId) return;

      const selectedFeature = features.find(
        (feature) => feature.properties?.id === selectedFeatureId
      );

      if (selectedFeature?.geometry?.type === "Point") {
        const [lon, lat] = selectedFeature.geometry.coordinates;
        olView.animate({
          center: fromLonLat([lon, lat]),
          zoom: 6,
          duration: 1500,
        });
      }
    } catch (error) {
      console.error("Error zooming to feature:", error);
    }
  }, [selectedFeatureId, features, olView]);

  // Force re-render of feature styles when selection changes
  useEffect(() => {
    const layers = olMap.getLayers().getArray();

    // Find the features layer by zIndex
    let featuresLayer = null;
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      if (layer instanceof VectorLayer && layer.getZIndex() === 20) {
        featuresLayer = layer;
        break;
      }
    }

    if (featuresLayer) {
      featuresLayer.setStyle(styleFunction);
    }
  }, [selectedFeatureId, styleFunction, olMap]);

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
