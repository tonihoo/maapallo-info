import { useCallback, useRef } from "react";
import { GeoJSON } from "ol/format";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import { FeatureLike } from "ol/Feature";
import { useLayerCache } from "./map/useLayerCache";

interface LiteracyData {
  [countryCode: string]: {
    rate: number;
    year: string;
    name: string;
  };
}

interface UseAdultLiteracyLayerProps {
  visible: boolean;
}

const LITERACY_COLOR_SCALE = [
  { color: "#006837", label: "95-100%", range: [95, 100] },
  { color: "#31a354", label: "85-94%", range: [85, 94] },
  { color: "#78c679", label: "75-84%", range: [75, 84] },
  { color: "#c2e699", label: "65-74%", range: [65, 74] },
  { color: "#ffffcc", label: "50-64%", range: [50, 64] },
  { color: "#fed976", label: "35-49%", range: [35, 49] },
  { color: "#fd8d3c", label: "20-34%", range: [20, 34] },
  { color: "#e31a1c", label: "0-19%", range: [0, 19] },
  { color: "rgba(200, 200, 200, 0.5)", label: "Ei dataa", range: null },
];

interface WDICollection {
  features: Array<{ properties: Record<string, unknown> }>;
}

export function useAdultLiteracyLayer({ visible }: UseAdultLiteracyLayerProps) {
  const layerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const literacyDataRef = useRef<LiteracyData>({});
  const { getCachedGeoJson } = useLayerCache();
  const pendingVisibilityRef = useRef<boolean | null>(null);
  const isLoadingRef = useRef<boolean>(false);

  // Color scale for literacy rates (0-100%)
  const getColorForRate = useCallback((rate: number): string => {
    for (const entry of LITERACY_COLOR_SCALE) {
      if (entry.range && rate >= entry.range[0] && rate <= entry.range[1]) {
        return entry.color;
      }
    }
    return "rgba(200, 200, 200, 0.5)";
  }, []);

  // Load literacy data
  const loadLiteracyData = useCallback(async () => {
    try {
      const response = await fetch(
        "/data/world_development_indicators.geojson"
      );
      if (!response.ok) {
        throw new Error("HTTP error! status: " + response.status);
      }
      const data = (await response.json()) as WDICollection;

      // Extract recent literacy data (2020-2023)
      const recentYears = ["2020", "2021", "2022", "2023"];
      const literacyMap: LiteracyData = {};

      for (const feature of data.features) {
        const props = feature.properties as Record<string, unknown>;
        const year = props.year as string;
        const country = props.country as string;
        const literacy = props.adult_literacy_rate as number | null;

        if (recentYears.includes(year) && literacy !== null) {
          if (!literacyMap[country] || year > literacyMap[country].year) {
            literacyMap[country] = {
              rate: literacy,
              year: year,
              name: (props.country_title_en as string) || country,
            };
          }
        }
      }

      literacyDataRef.current = literacyMap;
      return literacyMap;
    } catch (error) {
      console.error("Failed to load literacy data:", error);
      return {};
    }
  }, []);

  // Style function for the literacy layer
  const styleFunction = useCallback(
    (feature: FeatureLike) => {
      const countryName = feature.get("name") || "";
      let literacyRate: number | null = null;

      // Try to match country by name
      for (const [, info] of Object.entries(literacyDataRef.current)) {
        if (info.name.toLowerCase() === countryName.toLowerCase()) {
          literacyRate = info.rate;
          break;
        }
      }

      // Style based on literacy rate
      let fillColor = "rgba(200, 200, 200, 0.3)";
      let strokeColor = "rgba(255, 255, 255, 0.8)";
      let strokeWidth = 0.5;

      if (literacyRate !== null) {
        fillColor = getColorForRate(literacyRate);
        strokeColor = "rgba(255, 255, 255, 0.9)";
        strokeWidth = 0.8;
      }

      return new Style({
        fill: new Fill({ color: fillColor }),
        stroke: new Stroke({ color: strokeColor, width: strokeWidth }),
      });
    },
    [getColorForRate]
  );

  // Create and load the layer
  const createLayer = useCallback(async () => {
    if (isLoadingRef.current) {
      // Layer is already being created, wait for completion
      while (isLoadingRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return layerRef.current;
    }

    try {
      isLoadingRef.current = true;
      console.log("🔄 Creating adult literacy layer...");

      // Load literacy data first
      await loadLiteracyData();

      // Load world boundaries using cache
      const worldData = await getCachedGeoJson("/data/world.geojson");

      // Create layer with initial visibility from current state or pending state
      const initialVisibility =
        pendingVisibilityRef.current !== null
          ? pendingVisibilityRef.current
          : visible;

      const source = new VectorSource();
      const layer = new VectorLayer({
        source: source,
        style: styleFunction,
        visible: initialVisibility,
        zIndex: 10, // Adult literacy - base data layer
      });

      // Add features
      const format = new GeoJSON();
      const features = format.readFeatures(worldData, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      });

      source.addFeatures(features);
      console.info("Adult literacy world features: " + features.length);
      layerRef.current = layer;

      // Clear pending visibility state since layer is now created
      pendingVisibilityRef.current = null;
      isLoadingRef.current = false;

      console.log(
        "✅ Adult literacy layer created with visibility:",
        initialVisibility
      );
      return layer;
    } catch (error) {
      console.error("Failed to create adult literacy layer:", error);
      isLoadingRef.current = false;
      return null;
    }
  }, [loadLiteracyData, styleFunction, visible, getCachedGeoJson]);

  // Get layer instance
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
      console.log("✅ Adult literacy layer visibility set to:", isVisible);
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
      console.log("📝 Adult literacy layer visibility pending:", isVisible);

      // Don't trigger layer creation here - let useDataLoading handle it
      // The layer will be created when needed and visibility will be applied then
    }
  }, []);

  // Get legend data
  const getLegendData = useCallback(() => {
    return LITERACY_COLOR_SCALE;
  }, []);

  return {
    getLayer,
    setVisible,
    getLegendData,
    layerRef,
  };
}
