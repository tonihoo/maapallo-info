import { useCallback, useEffect, useRef } from "react";
import { Feature } from "ol";
import { GeoJSON } from "ol/format";
import { Map } from "ol";
import { View } from "ol";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Circle } from "ol/style";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import { FeatureLike } from "ol/Feature";
import { fromLonLat } from "ol/proj";
import {
  Feature as GeoJSONFeature,
  Geometry,
  GeoJsonProperties,
} from "geojson";

interface UseFeatureManagementProps {
  features: GeoJSONFeature<Geometry, GeoJsonProperties>[];
  selectedFeatureId: number | null;
  olMap: Map;
  olView: View;
  layerVisibility: {
    articleLocators: boolean;
  };
}

export function useFeatureManagement({
  features,
  selectedFeatureId,
  olMap,
  olView,
  layerVisibility,
}: UseFeatureManagementProps) {
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

  // Effect to handle when features change (but visibility is controlled above)
  useEffect(() => {
    try {
      const layers = olMap.getLayers().getArray();

      // Find the features layer - it should be the VectorLayer with our styleFunction
      let featuresLayerIndex = -1;
      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        if (layer instanceof VectorLayer && layer.getZIndex() === 40) {
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
      if (layer instanceof VectorLayer && layer.getZIndex() === 40) {
        featuresLayer = layer;
        break;
      }
    }

    if (featuresLayer) {
      featuresLayer.setStyle(styleFunction);
    }
  }, [selectedFeatureId, styleFunction, olMap]);

  return {
    styleFunction,
  };
}
