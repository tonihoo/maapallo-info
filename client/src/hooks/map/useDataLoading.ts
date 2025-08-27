import { useCallback, useEffect } from "react";
import { Map as OlMap } from "ol";
import { GeoJSON } from "ol/format";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";

interface AdultLiteracyLayer {
  getLayer: () => Promise<VectorLayer<VectorSource> | null>;
  setVisible: (visible: boolean) => void;
  getLegendData: () => unknown;
  layerRef: React.RefObject<VectorLayer<VectorSource> | null>;
}

interface PopulationDensityLayer {
  getLayer: () => Promise<VectorLayer<VectorSource> | null>;
  setVisible: (visible: boolean) => void;
  getLegendData: () => unknown;
  layerRef: React.RefObject<VectorLayer<VectorSource> | null>;
}

interface UseDataLoadingProps {
  olMap: OlMap;
  worldBoundariesLayerRef: React.RefObject<VectorLayer<VectorSource> | null>;
  oceanCurrentsLayerRef: React.RefObject<VectorLayer<VectorSource> | null>;
  adultLiteracyLayer: AdultLiteracyLayer;
  adultLiteracyLayerAddedRef: React.RefObject<boolean>;
  populationDensityLayer: PopulationDensityLayer;
  populationDensityLayerAddedRef: React.RefObject<boolean>;
}

export function useDataLoading({
  olMap,
  worldBoundariesLayerRef,
  oceanCurrentsLayerRef,
  adultLiteracyLayer,
  adultLiteracyLayerAddedRef,
  populationDensityLayer,
  populationDensityLayerAddedRef,
}: UseDataLoadingProps) {
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
  }, [worldBoundariesLayerRef]);

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
  }, [oceanCurrentsLayerRef]);

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
  }, [olMap, adultLiteracyLayer, adultLiteracyLayerAddedRef]);

  // Load population density layer when map is ready (only once)
  useEffect(() => {
    if (olMap && !populationDensityLayerAddedRef.current) {
      const timer = setTimeout(async () => {
        const layer = await populationDensityLayer.getLayer();
        if (layer) {
          // Check if layer is already in the map
          const existingLayers = olMap.getLayers().getArray();
          const layerExists = existingLayers.some(
            (existingLayer) => existingLayer === layer
          );

          if (!layerExists) {
            // Insert at position 2 (after base map and adult literacy, before world boundaries)
            const layers = olMap.getLayers();
            layers.insertAt(2, layer);
            populationDensityLayerAddedRef.current = true;
          }
        }
      }, 100);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [olMap, populationDensityLayer, populationDensityLayerAddedRef]);

  return {
    // No return values needed - this hook manages side effects only
  };
}
