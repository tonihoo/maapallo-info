import { GlobalStyles } from "@mui/material";
import { View, Map as OlMap, Feature } from "ol";
import { GeoJSON } from "ol/format";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import OSM from "ol/source/OSM.js";
import VectorSource from "ol/source/Vector";
import { Circle } from "ol/style";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import Text from "ol/style/Text";
import { ReactNode, useEffect, useRef, useState } from "react";
import { register } from 'ol/proj/proj4';
import proj4 from 'proj4';
import { FeatureLike } from 'ol/Feature';
import { Zoom } from 'ol/control';
import { toLonLat, fromLonLat } from 'ol/proj';
import { Feature as GeoJSONFeature, Geometry, GeoJsonProperties } from 'geojson';

// Define the Finnish coordinate system
proj4.defs("EPSG:3067", "+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
register(proj4);

interface Props {
  children?: ReactNode;
  features?: GeoJSONFeature<Geometry, GeoJsonProperties>[];
  onMapClick?: (coordinates: number[]) => void;
  onFeatureClick?: (featureId: number) => void;
  selectedFeatureId?: number | null;
}

export function Map({ children, onMapClick, onFeatureClick, features = [], selectedFeatureId }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);

  const styleFunction = (feature: FeatureLike) => {
    const featureType = feature.get('featureType');
    const isSelected = feature.get('id') === selectedFeatureId;
    const name = feature.get('name');

    if (featureType === 'feature') {
      return new Style({
        image: new Circle({
          radius: isSelected ? 12 : 8,
          fill: new Fill({ color: isSelected ? "#ff0000" : "#ff8c00" }),
          stroke: new Stroke({
            color: isSelected ? "#ffffff" : "#000080",
            width: isSelected ? 3 : 2
          }),
        }),
        text: name ? new Text({
          text: name,
          font: isSelected ? 'bold 14px Arial' : 'bold 12px Arial',
          fill: new Fill({ color: '#ffffff' }),
          stroke: new Stroke({ color: '#000000', width: 2 }),
          offsetY: isSelected ? -20 : -15,
        }) : undefined,
      });
    } else if (featureType === 'clickLocation') {
      // Orange style for click locations
      return new Style({
        image: new Circle({
          radius: 8,
          fill: new Fill({ color: "#FF6B35" }),
          stroke: new Stroke({ color: "#E55100", width: 3 }),
        }),
      });
    } else {
      // Default style for features
      return new Style({
        image: new Circle({
          radius: 7,
          fill: new Fill({ color: "#ffb34c" }),
          stroke: new Stroke({ color: "darkblue", width: 3 }),
        }),
      });
    }
  };

  /**
   * OpenLayers View: @see https://openlayers.org/en/latest/apidoc/module-ol_View-View.html
   */
  const [olView] = useState(() => {
    return new View({
      center: fromLonLat([25, 0]), // Center on Africa in lon/lat
      zoom: 3,
      projection: 'EPSG:3857', // Web Mercator for global view
    });
  });

  /**
   * OpenLayers Map: @see https://openlayers.org/en/latest/apidoc/module-ol_Map-Map.html
   */
  const [olMap] = useState(() => {
    return new OlMap({
      target: "",
      controls: [
        new Zoom({
          className: 'ol-zoom'
        })
      ],
      view: olView,
      keyboardEventTarget: document,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        new VectorLayer({
          source: new VectorSource(),
          style: styleFunction,
        }),
      ],
    });
  });

  /** olMap -object's initialization on startup  */
  useEffect(() => {
    olMap.setTarget(mapRef.current as HTMLElement);

    olMap.on("click", (event) => {
      // Check if a feature was clicked
      const feature = olMap.forEachFeatureAtPixel(event.pixel, (feature) => feature);

      if (feature && feature.get('featureType') === 'feature') {
        // Feature clicked
        const featureId = feature.get('id');
        if (featureId && onFeatureClick) {
          onFeatureClick(featureId);

          // Zoom to feature
          const geometry = feature.getGeometry();
          if (geometry) {
            olView.animate({
              center: (geometry as any).getCoordinates(),
              zoom: 8,
              duration: 1000,
            });
          }
        }
      } else if (onMapClick) {
        // Empty space clicked - convert coordinates to lon/lat
        const coordinates = toLonLat(event.coordinate);
        onMapClick(coordinates);
      }
    });
  }, [olMap, onMapClick, onFeatureClick, olView]);

  /** Listen for changes in the 'features' property */
  useEffect(() => {
    const layers = olMap.getLayers().getArray();
    const vectorLayer = layers[1] as VectorLayer<VectorSource>;
    const source = vectorLayer.getSource();

    // Clear existing features
    source?.clear();

    // Skip adding new features if none provided
    if (!features || !features.length) return;

    // Add new features
    const olFeatures = features.map((geoJsonFeature) => {
      const olFeature = new Feature({
        geometry: new GeoJSON().readGeometry(geoJsonFeature.geometry, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857'
        }),
      });

      // Copy properties to the OpenLayers feature
      if (geoJsonFeature.properties) {
        Object.keys(geoJsonFeature.properties).forEach(key => {
          olFeature.set(key, geoJsonFeature.properties?.[key]);
        });
      }

      return olFeature;
    });

    source?.addFeatures(olFeatures);
  }, [features, olMap]);

  // Zoom to selected feature
  useEffect(() => {
    if (!selectedFeatureId) return;

    const selectedFeature = features.find(feature =>
      feature.properties?.id === selectedFeatureId
    );

    if (selectedFeature?.geometry?.type === 'Point') {
      const [lon, lat] = selectedFeature.geometry.coordinates;
      olView.animate({
        center: fromLonLat([lon, lat]),
        zoom: 6,
        duration: 1500,
      });
    }
  }, [selectedFeatureId, features, olView]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      {/* Styles for the OpenLayers controls */}
      <GlobalStyles
        styles={{
          ".ol-viewport": {
            cursor: "pointer",
          },
          ".ol-zoom": {
            position: "absolute",
            top: "65px",
            left: "8px",
            background: "rgba(255,255,255,0.4)",
            borderRadius: "4px",
            padding: "2px",
            display: "flex",
            flexDirection: "column",
          },
        }}
      />
      <div
        style={{ width: "100%", height: "100%", position: "relative" }}
        ref={mapRef}
      >
        {children}
      </div>
    </div>
  );
}
