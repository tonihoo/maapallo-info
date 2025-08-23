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
import { AdultLiteracyLegend } from "./AdultLiteracyLegend";
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
    adultLiteracyLegendData,
  } = useOpenLayersMap({
    features,
    selectedFeatureId: selectedFeatureId || null,
    onMapClick,
    onFeatureClick,
    onFeatureHover,
  });

  // Debug: Static legend data
  const staticLegendData = [
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
            name: "Valtioiden rajat",
            description: "Valtioiden rajat ja nimet",
            visible: layerVisibility.worldBoundaries,
          },
          {
            id: "oceanCurrents",
            name: "Merivirrat",
            description: "Merivirtojen globaalit kiertomallit",
            visible: layerVisibility.oceanCurrents,
          },
          {
            id: "adultLiteracy",
            name: "Lukutaito, aikuiset",
            description: "Aikuisten lukutaitoprosentit maittain (2020-2023)",
            visible: layerVisibility.adultLiteracy,
          },
          {
            id: "articleLocators",
            name: "Artikkelien kohteet",
            description: "Maapallo-lehden artikkelien kohdealueet",
            visible: layerVisibility.articleLocators,
          },
        ]}
        onLayerToggle={handleLayerVisibilityChange}
        style={{
          position: "absolute",
          top: "246px",
          right: "20px",
          zIndex: 1000,
        }}
      />

      <CoordinatesDisplay coordinates={mouseCoordinates} />

      <AdultLiteracyLegend
        visible={layerVisibility.adultLiteracy}
        legendData={staticLegendData}
      />
    </div>
  );
}

export default Map;
