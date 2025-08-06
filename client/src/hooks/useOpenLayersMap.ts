import { useCallback, useEffect, useRef, useState } from "react";
import { View, Map as OlMap, Feature } from "ol";
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
import { BASE_MAPS, BaseMapKey } from "../BaseMapSelector";
import {
  INITIAL_VIEW,
  ZOOM_LIMITS,
  ANIMATION_DURATIONS,
} from "../constants/mapConstants";

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
  const mapRef = useRef<HTMLDivElement>(null);
  const [mouseCoordinates, setMouseCoordinates] = useState<{
    lon: number;
    lat: number;
  } | null>(null);
  const [currentBaseMap, setCurrentBaseMap] = useState<BaseMapKey>("topo");

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

  // OpenLayers View
  const [olView] = useState(() => {
    return new View({
      center: fromLonLat(INITIAL_VIEW.center),
      zoom: INITIAL_VIEW.zoom,
      projection: "EPSG:3857",
      minZoom: ZOOM_LIMITS.min,
      maxZoom: ZOOM_LIMITS.max,
    });
  });

  // OpenLayers Map
  const [olMap] = useState(() => {
    return new OlMap({
      target: undefined,
      controls: [],
      view: olView,
      keyboardEventTarget: document,
      layers: [
        BASE_MAPS.topo.layer(),
        new VectorLayer({
          source: new VectorSource(),
          style: styleFunction,
        }),
      ],
    });
  });

  // Control functions
  const handleZoom = useCallback(
    (zoomIn: boolean) => {
      const currentZoom = olView.getZoom() || INITIAL_VIEW.zoom;
      const newZoom = zoomIn
        ? Math.min(currentZoom + 1, ZOOM_LIMITS.max)
        : Math.max(currentZoom - 1, ZOOM_LIMITS.min);

      olView.animate({
        zoom: newZoom,
        duration: ANIMATION_DURATIONS.zoom,
      });
    },
    [olView]
  );

  const handleRotate = useCallback(
    (direction: "left" | "right") => {
      const currentRotation = olView.getRotation();
      const rotationIncrement = Math.PI / 12; // 15 degrees in radians
      const newRotation =
        direction === "left"
          ? currentRotation - rotationIncrement
          : currentRotation + rotationIncrement;

      olView.animate({
        rotation: newRotation,
        duration: ANIMATION_DURATIONS.rotate,
      });
    },
    [olView]
  );

  const handleHome = useCallback(() => {
    olView.animate({
      center: fromLonLat(INITIAL_VIEW.center),
      zoom: INITIAL_VIEW.zoom,
      rotation: 0,
      duration: ANIMATION_DURATIONS.home,
    });
  }, [olView]);

  const handleLocationSelect = useCallback(
    (lat: number, lon: number) => {
      olView.animate({
        center: fromLonLat([lon, lat]),
        zoom: 12,
        duration: 1000,
      });
    },
    [olView]
  );

  const handleBaseMapChange = useCallback(
    (baseMapKey: BaseMapKey) => {
      const layers = olMap.getLayers();
      const newBaseLayer = BASE_MAPS[baseMapKey].layer();
      layers.setAt(0, newBaseLayer);
      setCurrentBaseMap(baseMapKey);
    },
    [olMap]
  );

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

    // Handle hover events and coordinate tracking
    const pointerMoveHandler = (event: MapBrowserEvent<UIEvent>) => {
      try {
        if (!event.coordinate) return;

        const feature = olMap.forEachFeatureAtPixel(
          event.pixel,
          (feature) => feature
        );

        const coordinates = toLonLat(event.coordinate);
        setMouseCoordinates({
          lon: Number(coordinates[0].toFixed(4)),
          lat: Number(coordinates[1].toFixed(4)),
        });

        if (feature && feature.get("featureType") === "feature") {
          const featureId = feature.get("id");
          if (onFeatureHover) {
            onFeatureHover(featureId);
          }
          const viewport = olMap.getViewport();
          if (viewport) {
            viewport.style.cursor = "pointer";
          }
        } else {
          if (onFeatureHover) {
            onFeatureHover(null);
          }
          const viewport = olMap.getViewport();
          if (viewport) {
            viewport.style.cursor = "";
          }
        }
      } catch (error) {
        console.error("Error in pointer move handler:", error);
      }
    };

    olMap.on("click", clickHandler);
    olMap.on("pointermove", pointerMoveHandler);

    return () => {
      olMap.un("click", clickHandler);
      olMap.un("pointermove", pointerMoveHandler);
    };
  }, [olMap, onMapClick, onFeatureClick, onFeatureHover, olView]);

  // Update features
  useEffect(() => {
    try {
      const layers = olMap.getLayers().getArray();
      if (!layers || layers.length < 2) return;

      const vectorLayer = layers[1] as VectorLayer<VectorSource>;
      const source = vectorLayer.getSource();
      if (!source) return;

      source.clear();

      if (!features || !features.length) return;

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
    } catch (error) {
      console.error("Error updating features:", error);
    }
  }, [features, olMap]);

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
    const vectorLayer = layers[1] as VectorLayer<VectorSource>;
    if (vectorLayer) {
      vectorLayer.setStyle(styleFunction);
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
  };
}
