import { GlobalStyles } from "@mui/material";
import { ReactNode, useEffect } from "react";
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
import { PopulationDensityLegend } from "./PopulationDensityLegend";
import { useOpenLayersMap } from "../../hooks/useOpenLayersMap";
import { BaseMapKey } from "./BaseMapSelector";

interface Props {
  children?: ReactNode;
  features?: GeoJSONFeature<Geometry, GeoJsonProperties>[];
  onMapClick?: (coordinates: number[]) => void;
  onFeatureClick?: (featureId: number) => void;
  onFeatureHover?: (featureId: number | null) => void;
  selectedFeatureId?: number | null;
  onBaseMapChange?: (baseMapKey: BaseMapKey) => void;
}

export function Map({
  children,
  onMapClick,
  onFeatureClick,
  onFeatureHover,
  features = [],
  selectedFeatureId,
  onBaseMapChange,
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
    populationDensityLegendData,
  } = useOpenLayersMap({
    features,
    selectedFeatureId: selectedFeatureId || null,
    onMapClick,
    onFeatureClick,
    onFeatureHover,
  });

  // Call the onBaseMapChange callback when currentBaseMap changes
  useEffect(() => {
    if (onBaseMapChange) {
      onBaseMapChange(currentBaseMap);
    }
  }, [currentBaseMap, onBaseMapChange]);

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
      />

      <LocationSearch onLocationSelect={handleLocationSelect} />

      <MeasurementTool
        isActive={isMeasuring}
        onToggle={toggleMeasurement}
        onClear={clearMeasurements}
        currentMeasurement={currentMeasurement}
      />

      <MapControls
        onHome={handleHome}
        onZoom={handleZoom}
        onRotate={handleRotate}
      />

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
            id: "intactForests",
            name: "Luonnontilaiset metsät",
            description: "Luonnontilaiset metsäalueet 2020",
            visible: layerVisibility.intactForests,
          },
          {
            id: "populationDensity",
            name: "Väestöntiheys",
            description: "Väestöntiheys maittain 2022 (henkeä/km²)",
            visible: layerVisibility.populationDensity,
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
        legendData={adultLiteracyLegendData}
      />

      <PopulationDensityLegend
        visible={layerVisibility.populationDensity}
        legendData={populationDensityLegendData}
      />
    </div>
  );
}

export default Map;
