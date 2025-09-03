import { useCallback, useRef, useEffect } from "react";
import { GeoJSON } from "ol/format";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import { FeatureLike } from "ol/Feature";
import { useLayerCache } from "./map/useLayerCache";

interface UsePopulationDensityLayerProps {
  visible: boolean;
}

// Color scale for population density (people per km²) - matches QGIS categorization
const POPULATION_DENSITY_COLOR_SCALE = [
  { color: "#800000", label: "242 - 18681", range: [242, Infinity] },
  { color: "#ff0000", label: "103 - 242", range: [103, 242] },
  { color: "#ff6666", label: "52 - 103", range: [52, 103] },
  { color: "#ffaaaa", label: "15 - 52", range: [15, 52] },
  { color: "#ffdddd", label: "0 - 15", range: [0, 15] },
  { color: "rgba(200, 200, 200, 0.5)", label: "Ei dataa", range: null },
];

export function usePopulationDensityLayer({
  visible,
}: UsePopulationDensityLayerProps) {
  const layerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const { getCachedGeoJson } = useLayerCache();
  const pendingVisibilityRef = useRef<boolean | null>(null);
  const isLoadingRef = useRef<boolean>(false);

  // Color scale for population density
  const getColorForDensity = useCallback((density: number): string => {
    for (const entry of POPULATION_DENSITY_COLOR_SCALE) {
      if (
        entry.range &&
        density >= entry.range[0] &&
        density <= entry.range[1]
      ) {
        return entry.color;
      }
    }
    return "rgba(200, 200, 200, 0.5)";
  }, []);

  // Style function for the population density layer
  const styleFunction = useCallback(
    (feature: FeatureLike) => {
      // Get density directly from feature properties
      const density = feature.get("pop_density_2022_num");

      // Style based on population density
      let fillColor = "rgba(200, 200, 200, 0.3)"; // Default gray for no data
      let strokeColor = "rgba(255, 255, 255, 0.8)";
      let strokeWidth = 0.5;

      if (density !== null && density !== undefined) {
        fillColor = getColorForDensity(density);
        strokeColor = "rgba(255, 255, 255, 0.9)";
        strokeWidth = 0.8;
      }

      return new Style({
        fill: new Fill({
          color: fillColor,
        }),
        stroke: new Stroke({
          color: strokeColor,
          width: strokeWidth,
        }),
      });
    },
    [getColorForDensity]
  );

  // Create and load the layer
  const createLayer = useCallback(async () => {
    if (isLoadingRef.current) {
      // Layer is already being created, wait for completion
      while (isLoadingRef.current) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return layerRef.current;
    }

    try {
      isLoadingRef.current = true;
      console.log("🔄 Creating population density layer...");

      // Load population density GeoJSON using cache
      const geoJsonData = await getCachedGeoJson(
        "/data/pop_density_by_country_2022_num.geojson"
      );

      // Create layer with initial visibility from current state or pending state
      const initialVisibility = pendingVisibilityRef.current !== null 
        ? pendingVisibilityRef.current 
        : visible;

      // Create layer
      const source = new VectorSource();
      const layer = new VectorLayer({
        source: source,
        style: styleFunction,
        visible: initialVisibility,
        zIndex: 20, // Population density above adult literacy
      });

      // Add features
      const format = new GeoJSON();
      const features = format.readFeatures(geoJsonData, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      });

      source.addFeatures(features);
      console.info("✅ Population density features loaded: " + features.length);
      layerRef.current = layer;

      // Clear pending visibility state since layer is now created
      pendingVisibilityRef.current = null;
      isLoadingRef.current = false;

      console.log("✅ Population density layer created with visibility:", initialVisibility);
      return layer;
    } catch (error) {
      console.error("Failed to create population density layer:", error);
      isLoadingRef.current = false;
      return null;
    }
  }, [styleFunction, visible, getCachedGeoJson]);  // Get layer instance
  const getLayer = useCallback(async () => {
    if (!layerRef.current) {
      return await createLayer();
    }
    return layerRef.current;
  }, [createLayer]);

  // Update visibility
  const setVisible = useCallback((isVisible: boolean) => {
    if (layerRef.current) {
      // Layer exists, apply visibility immediately
      layerRef.current.setVisible(isVisible);
      console.log("✅ Population density layer visibility set to:", isVisible);
      // Force layer redraw and clear any cached tiles
      layerRef.current.changed();
      const source = layerRef.current.getSource();
      if (source) {
        source.changed();
      }
      // Clear any pending state since we applied it
      pendingVisibilityRef.current = null;
    } else {
      // Layer doesn't exist yet, store the desired visibility state
      pendingVisibilityRef.current = isVisible;
      console.log("📝 Population density layer visibility pending:", isVisible);
      
      // If layer is not currently loading and user wants it visible, trigger loading
      if (isVisible && !isLoadingRef.current) {
        console.log("🚀 Triggering population density layer creation due to visibility toggle");
        createLayer();
      }
    }
  }, [createLayer]);

  // Update visibility when the visible prop changes
  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.setVisible(visible);
      // Force layer redraw and clear any cached tiles
      layerRef.current.changed();
      const source = layerRef.current.getSource();
      if (source) {
        source.changed();
      }
    }
  }, [visible]);

  // Get legend data
  const getLegendData = useCallback(() => {
    return POPULATION_DENSITY_COLOR_SCALE;
  }, []);

  return {
    getLayer,
    setVisible,
    getLegendData,
    layerRef,
  };
}
