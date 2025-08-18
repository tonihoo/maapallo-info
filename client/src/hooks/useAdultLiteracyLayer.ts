import { useCallback, useRef } from "react";
import { GeoJSON } from "ol/format";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import { FeatureLike } from "ol/Feature";

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

export function useAdultLiteracyLayer({ visible }: UseAdultLiteracyLayerProps) {
  const layerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const literacyDataRef = useRef<LiteracyData>({});

  // Color scale for literacy rates (0-100%)
  const getColorForRate = useCallback((rate: number): string => {
    if (rate >= 95) return "#006837"; // Dark green - Very high literacy
    if (rate >= 85) return "#31a354"; // Green - High literacy
    if (rate >= 75) return "#78c679"; // Light green - Good literacy
    if (rate >= 65) return "#c2e699"; // Very light green - Moderate literacy
    if (rate >= 50) return "#ffffcc"; // Light yellow - Low-moderate literacy
    if (rate >= 35) return "#fed976"; // Yellow - Low literacy
    if (rate >= 20) return "#fd8d3c"; // Orange - Very low literacy
    return "#e31a1c"; // Red - Extremely low literacy
  }, []);

  // Create country code to name mapping for better matching
  const countryCodeMapping = useCallback(() => {
    return {
      AE: "United Arab Emirates",
      AW: "Aruba",
      BA: "Bosnia and Herzegovina",
      BD: "Bangladesh",
      BH: "Bahrain",
      BN: "Brunei",
      CG: "Republic of the Congo",
      CR: "Costa Rica",
      CV: "Cape Verde",
      EC: "Ecuador",
      KH: "Cambodia",
      KW: "Kuwait",
      MV: "Maldives",
      QA: "Qatar",
      SV: "El Salvador",
      TH: "Thailand",
      TM: "Turkmenistan",
      UZ: "Uzbekistan",
      US: "United States of America",
      GB: "United Kingdom",
      RU: "Russia",
      CN: "China",
      IN: "India",
      BR: "Brazil",
      DE: "Germany",
      FR: "France",
      IT: "Italy",
      ES: "Spain",
      MX: "Mexico",
      CA: "Canada",
      AU: "Australia",
      ZA: "South Africa",
      EG: "Egypt",
      NG: "Nigeria",
      KE: "Kenya",
      GH: "Ghana",
      MA: "Morocco",
      TN: "Tunisia",
      DZ: "Algeria",
      ET: "Ethiopia",
      UG: "Uganda",
      TZ: "Tanzania",
      ZW: "Zimbabwe",
      BW: "Botswana",
      ZM: "Zambia",
      MW: "Malawi",
      MZ: "Mozambique",
      MG: "Madagascar",
      AO: "Angola",
      CD: "Democratic Republic of the Congo",
      CF: "Central African Republic",
      TD: "Chad",
      NE: "Niger",
      ML: "Mali",
      BF: "Burkina Faso",
      SN: "Senegal",
      GN: "Guinea",
      SL: "Sierra Leone",
      LR: "Liberia",
      CI: "Ivory Coast",
      GW: "Guinea-Bissau",
      GM: "Gambia",
      MR: "Mauritania",
    };
  }, []);

  // Style function for the literacy layer
  const styleFunction = useCallback(
    (feature: FeatureLike) => {
      const countryName = feature.get("name") || "";

      // Try to match country by name and code mapping
      let literacyRate: number | null = null;
      const codeMapping = countryCodeMapping();

      // Method 1: Try code mapping first (most accurate)
      for (const [code, info] of Object.entries(literacyDataRef.current)) {
        const mappedName = codeMapping[code as keyof typeof codeMapping];
        if (
          mappedName &&
          mappedName.toLowerCase() === countryName.toLowerCase()
        ) {
          literacyRate = info.rate;
          break;
        }
      }

      // Method 2: Try exact name match
      if (literacyRate === null) {
        for (const [, info] of Object.entries(literacyDataRef.current)) {
          if (info.name.toLowerCase() === countryName.toLowerCase()) {
            literacyRate = info.rate;
            break;
          }
        }
      }

      // Method 3: Try fuzzy matching as fallback
      if (literacyRate === null) {
        for (const [, info] of Object.entries(literacyDataRef.current)) {
          if (
            countryName.toLowerCase().includes(info.name.toLowerCase()) ||
            info.name.toLowerCase().includes(countryName.toLowerCase())
          ) {
            literacyRate = info.rate;
            break;
          }
        }
      }

      // Style based on literacy rate
      let fillColor = "rgba(200, 200, 200, 0.3)"; // Default gray for no data
      let strokeColor = "rgba(255, 255, 255, 0.8)";
      let strokeWidth = 0.5;

      if (literacyRate !== null) {
        fillColor = getColorForRate(literacyRate);
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
    [getColorForRate, countryCodeMapping]
  );

  // Load literacy data
  const loadLiteracyData = useCallback(async () => {
    try {
      const response = await fetch(
        "/data/world_development_indicators.geojson"
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // Extract recent literacy data (2020-2023)
      const recentYears = ["2020", "2021", "2022", "2023"];
      const literacyMap: LiteracyData = {};

      for (const feature of data.features) {
        const props = feature.properties;
        const year = props.year;
        const country = props.country;
        const literacy = props.adult_literacy_rate;

        if (recentYears.includes(year) && literacy !== null) {
          if (!literacyMap[country] || year > literacyMap[country].year) {
            literacyMap[country] = {
              rate: literacy,
              year: year,
              name: props.country_title_en || country,
            };
          }
        }
      }

      literacyDataRef.current = literacyMap;

      return literacyMap;
    } catch (error) {
      console.error("❌ Failed to load literacy data:", error);
      return {};
    }
  }, []);

  // Create and load the layer
  const createLayer = useCallback(async () => {
    try {
      // Load literacy data first
      await loadLiteracyData();

      // Load world boundaries
      const response = await fetch("/data/world.geojson");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const worldData = await response.json();

      // Create layer
      const source = new VectorSource();
      const layer = new VectorLayer({
        source: source,
        style: styleFunction,
        visible: visible,
        zIndex: 1, // Below other layers but above base map
      });

      // Add features
      const format = new GeoJSON();
      const features = format.readFeatures(worldData, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      });

      source.addFeatures(features);
      layerRef.current = layer;

      return layer;
    } catch (error) {
      console.error("❌ Failed to create adult literacy layer:", error);
      return null;
    }
  }, [loadLiteracyData, styleFunction, visible]);

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
      layerRef.current.setVisible(isVisible);
    }
  }, []);

  // Get legend data
  const getLegendData = useCallback(() => {
    return [
      { color: "#006837", label: "95-100% (Very High)", range: [95, 100] },
      { color: "#31a354", label: "85-94% (High)", range: [85, 94] },
      { color: "#78c679", label: "75-84% (Good)", range: [75, 84] },
      { color: "#c2e699", label: "65-74% (Moderate)", range: [65, 74] },
      { color: "#ffffcc", label: "50-64% (Low-Moderate)", range: [50, 64] },
      { color: "#fed976", label: "35-49% (Low)", range: [35, 49] },
      { color: "#fd8d3c", label: "20-34% (Very Low)", range: [20, 34] },
      { color: "#e31a1c", label: "0-19% (Extremely Low)", range: [0, 19] },
      { color: "rgba(200, 200, 200, 0.5)", label: "No Data", range: null },
    ];
  }, []);

  return {
    getLayer,
    setVisible,
    getLegendData,
    layerRef,
  };
}
