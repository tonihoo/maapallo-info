import { GlobalStyles } from "@mui/material";
import { ReactNode } from "react";
import {
  Feature as GeoJSONFeature,
  Geometry,
  GeoJsonProperties,
} from "geojson";
import { CoordinatesDisplay } from "../common/CoordinatesDisplay";
import { LocationSearch } from "../common/LocationSearch";
import { BaseMapSelector } from "./BaseMapSelector";
import { MapControls } from "./MapControls";
import { MeasurementTool } from "./MeasurementTool";
import { LayerSwitcher } from "./LayerSwitcher";
import { useOpenLayersMap } from "../../hooks/useOpenLayersMap";

interface Props {
  children?: ReactNode;
  features?: GeoJSONFeature<Geometry, GeoJsonProperties>[];
  onMapClick?: (coordinates: number[]) => void;
  onFeatureClick?: (featureId: number) => void;
  onFeatureHover?: (featureId: number | null) => void;
  selectedFeatureId?: number | null;
}

export function Map({
  children,
  onMapClick,
  onFeatureClick,
  onFeatureHover,
  features = [],
  selectedFeatureId,
}: Props) {
  const {
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
  } = useOpenLayersMap({
    features,
    selectedFeatureId: selectedFeatureId || null,
    onMapClick,
    onFeatureClick,
    onFeatureHover,
  });

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* Styles for the OpenLayers controls */}
      <GlobalStyles
        styles={{
          ".ol-viewport": {
            cursor: "default",
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

      <BaseMapSelector
        currentBaseMap={currentBaseMap}
        onBaseMapChange={handleBaseMapChange}
        onHome={handleHome}
      />

      <LocationSearch onLocationSelect={handleLocationSelect} />

      <MeasurementTool
        isActive={isMeasuring}
        onToggle={toggleMeasurement}
        onClear={clearMeasurements}
        currentMeasurement={currentMeasurement}
      />

      <MapControls onZoom={handleZoom} onRotate={handleRotate} />

      <LayerSwitcher
        layers={[
          {
            id: "worldBoundaries",
            name: "World Boundaries",
            description: "Country borders and names",
            visible: layerVisibility.worldBoundaries,
          },
          {
            id: "oceanCurrents",
            name: "Ocean Currents",
            description: "Global ocean circulation patterns",
            visible: layerVisibility.oceanCurrents,
          },
        ]}
        onLayerToggle={handleLayerVisibilityChange}
        style={{
          position: "absolute",
          top: "246px", // Position under BaseMapSelector (150px + 40px home + 8px gap + 40px base + 8px gap)
          right: "20px",
          zIndex: 1000,
        }}
      />

      <CoordinatesDisplay coordinates={mouseCoordinates} />
    </div>
  );
}

export default Map;
