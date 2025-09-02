import { useEffect } from "react";
import { View } from "ol";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";

interface AdultLiteracyLayer {
  setVisible: (visible: boolean) => void;
  getLegendData: () => Array<{
    color: string;
    label: string;
    range: [number, number] | null;
  }>;
  getLayer: () => VectorLayer<VectorSource>;
}

interface PopulationDensityLayer {
  setVisible: (visible: boolean) => void;
  getLegendData: () => Array<{
    color: string;
    label: string;
    range: [number, number] | null;
  }>;
  getLayer: () => VectorLayer<VectorSource>;
}

interface IntactForestsLayer {
  setVisible: (visible: boolean) => void;
  getLayer: () => VectorLayer<VectorSource>;
  layerRef: React.RefObject<VectorLayer<VectorSource> | null>;
}

interface UseLayerEffectsProps {
  worldBoundariesLayerRef: React.RefObject<VectorLayer<VectorSource> | null>;
  oceanCurrentsLayerRef: React.RefObject<VectorLayer<VectorSource> | null>;
  adultLiteracyLayer: AdultLiteracyLayer;
  populationDensityLayer: PopulationDensityLayer;
  intactForestsLayer: IntactForestsLayer;
  olView: View;
  layerVisibility: {
    worldBoundaries: boolean;
    oceanCurrents: boolean;
    adultLiteracy: boolean;
    populationDensity: boolean;
    intactForests: boolean;
  };
}

export function useLayerEffects({
  worldBoundariesLayerRef,
  oceanCurrentsLayerRef,
  adultLiteracyLayer,
  populationDensityLayer,
  intactForestsLayer,
  olView,
  layerVisibility,
}: UseLayerEffectsProps) {
  // Update world boundaries layer visibility when state changes
  useEffect(() => {
    if (worldBoundariesLayerRef.current) {
      worldBoundariesLayerRef.current.setVisible(
        layerVisibility.worldBoundaries
      );
    }
  }, [layerVisibility.worldBoundaries, worldBoundariesLayerRef]);

  // Update ocean currents layer visibility when state changes
  useEffect(() => {
    if (oceanCurrentsLayerRef.current) {
      oceanCurrentsLayerRef.current.setVisible(layerVisibility.oceanCurrents);

      // Force a redraw to ensure the layer updates
      if (layerVisibility.oceanCurrents) {
        oceanCurrentsLayerRef.current.changed();
      }
    }
  }, [layerVisibility.oceanCurrents, oceanCurrentsLayerRef]);

  // Update adult literacy layer visibility when state changes
  useEffect(() => {
    adultLiteracyLayer.setVisible(layerVisibility.adultLiteracy);
    // Force redraw for production environments and clear layer cache
    if (adultLiteracyLayer.layerRef?.current) {
      const layer = adultLiteracyLayer.layerRef.current;
      layer.changed();
      const source = layer.getSource();
      if (source) {
        source.changed();
      }
    }
  }, [layerVisibility.adultLiteracy, adultLiteracyLayer]);

  // Update population density layer visibility when state changes
  useEffect(() => {
    populationDensityLayer.setVisible(layerVisibility.populationDensity);
    // Force redraw for production environments and clear layer cache
    if (populationDensityLayer.layerRef?.current) {
      const layer = populationDensityLayer.layerRef.current;
      layer.changed();
      const source = layer.getSource();
      if (source) {
        source.changed();
      }
    }
  }, [layerVisibility.populationDensity, populationDensityLayer]);

  // Update intact forests layer visibility when state changes
  useEffect(() => {
    intactForestsLayer.setVisible(layerVisibility.intactForests);
    // Force redraw for production environments
    if (intactForestsLayer.layerRef?.current) {
      intactForestsLayer.layerRef.current.changed();
    }
  }, [layerVisibility.intactForests, intactForestsLayer]);

  // Update world boundaries style when zoom changes (for labels)
  useEffect(() => {
    const handleZoomChange = () => {
      if (worldBoundariesLayerRef.current) {
        // Force style update by changing the layer
        worldBoundariesLayerRef.current.changed();
      }
    };

    olView.on("change:resolution", handleZoomChange);

    return () => {
      olView.un("change:resolution", handleZoomChange);
    };
  }, [olView, worldBoundariesLayerRef]);
}
