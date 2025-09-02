import { useCallback, useEffect } from "react";
import { Map as OlMap } from "ol";
import { GeoJSON } from "ol/format";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { useLayerCache } from "./useLayerCache";

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

interface IntactForestsLayer {
  getLayer: () => Promise<VectorLayer<VectorSource> | null>;
  setVisible: (visible: boolean) => void;
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
  intactForestsLayer: IntactForestsLayer;
  intactForestsLayerAddedRef: React.RefObject<boolean>;
  adultLiteracyVisible: boolean;
  populationDensityVisible: boolean;
  intactForestsVisible: boolean;
}

export function useDataLoading({
  olMap,
  worldBoundariesLayerRef,
  oceanCurrentsLayerRef,
  adultLiteracyLayer,
  adultLiteracyLayerAddedRef,
  populationDensityLayer,
  populationDensityLayerAddedRef,
  intactForestsLayer,
  intactForestsLayerAddedRef,
  adultLiteracyVisible,
  populationDensityVisible,
  intactForestsVisible,
}: UseDataLoadingProps) {
  const { preloadGeoJson, getCachedGeoJson } = useLayerCache();

  // Preload all geojson data in parallel when map is initialized
  const preloadAllData = useCallback(async () => {
    try {
      console.log("🚀 Starting parallel preload of all geojson data...");
      const startTime = Date.now();

      // Preload all geojson files in parallel using array
      await preloadGeoJson([
        "/data/world.geojson",
        "/data/ocean-currents.geojson",
        "/data/pop_density_by_country_2022_num.geojson",
        "/data/intact-forest-landscapes-simplified-2020.geojson"
      ]);

      const loadTime = Date.now() - startTime;
      console.log(`✅ All geojson data preloaded in ${loadTime}ms`);
    } catch (error) {
      console.warn("⚠️ Error during parallel preload:", error);
    }
  }, [preloadGeoJson]);

  // Start preloading immediately when map is ready
  useEffect(() => {
    if (olMap) {
      preloadAllData();
    }
  }, [olMap, preloadAllData]);
  // Load world boundaries
  const loadWorldBoundaries = useCallback(async () => {
    try {
      const geojsonData = await getCachedGeoJson("/data/world.geojson");

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
  }, [worldBoundariesLayerRef, getCachedGeoJson]);

  // Load ocean currents
  const loadOceanCurrents = useCallback(async () => {
    try {
      const geojsonData = await getCachedGeoJson("/data/ocean-currents.geojson");

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
  }, [oceanCurrentsLayerRef, getCachedGeoJson]);

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
            // Insert at position 1 - Adult literacy base layer
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

  // Ensure adult literacy layer is created/added when toggled on later
  useEffect(() => {
    (async () => {
      if (
        olMap &&
        adultLiteracyVisible &&
        !adultLiteracyLayerAddedRef.current
      ) {
        const layer = await adultLiteracyLayer.getLayer();
        if (layer) {
          const layers = olMap.getLayers();
          layers.insertAt(1, layer); // Adult literacy base layer
          adultLiteracyLayerAddedRef.current = true;
          adultLiteracyLayer.setVisible(true);
        }
      }
    })();
  }, [
    olMap,
    adultLiteracyVisible,
    adultLiteracyLayer,
    adultLiteracyLayerAddedRef,
  ]);

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
            // Insert at position 2 - Population density above adult literacy
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

  // Ensure population density layer is created/added when toggled on later
  useEffect(() => {
    (async () => {
      if (
        olMap &&
        populationDensityVisible &&
        !populationDensityLayerAddedRef.current
      ) {
        const layer = await populationDensityLayer.getLayer();
        if (layer) {
          const layers = olMap.getLayers();
          layers.insertAt(2, layer); // Population density above adult literacy
          populationDensityLayerAddedRef.current = true;
          populationDensityLayer.setVisible(true);
        }
      }
    })();
  }, [
    olMap,
    populationDensityVisible,
    populationDensityLayer,
    populationDensityLayerAddedRef,
  ]);

  // Load intact forests layer when map is ready (only once)
  useEffect(() => {
    if (olMap && !intactForestsLayerAddedRef.current) {
      const timer = setTimeout(async () => {
        const layer = await intactForestsLayer.getLayer();
        if (layer) {
          // Check if layer is already in the map
          const existingLayers = olMap.getLayers().getArray();
          const layerExists = existingLayers.some(
            (existingLayer) => existingLayer === layer
          );

          if (!layerExists) {
            // Insert at position 3 - Intact forests above population density
            const layers = olMap.getLayers();
            layers.insertAt(3, layer);
            intactForestsLayerAddedRef.current = true;
          }
        }
      }, 100);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [olMap, intactForestsLayer, intactForestsLayerAddedRef]);

  // Ensure intact forests layer is created/added when toggled on later
  useEffect(() => {
    (async () => {
      if (
        olMap &&
        intactForestsVisible &&
        !intactForestsLayerAddedRef.current
      ) {
        const layer = await intactForestsLayer.getLayer();
        if (layer) {
          const layers = olMap.getLayers();
          layers.insertAt(3, layer); // Intact forests above population density
          intactForestsLayerAddedRef.current = true;
          intactForestsLayer.setVisible(true);
        }
      }
    })();
  }, [
    olMap,
    intactForestsVisible,
    intactForestsLayer,
    intactForestsLayerAddedRef,
  ]);

  return {
    // No return values needed - this hook manages side effects only
  };
}
