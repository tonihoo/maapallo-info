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

interface UseLayerEffectsProps {
  worldBoundariesLayerRef: React.RefObject<VectorLayer<VectorSource> | null>;
  oceanCurrentsLayerRef: React.RefObject<VectorLayer<VectorSource> | null>;
  adultLiteracyLayer: AdultLiteracyLayer;
  olView: View;
  layerVisibility: {
    worldBoundaries: boolean;
    oceanCurrents: boolean;
    adultLiteracy: boolean;
  };
}

export function useLayerEffects({
  worldBoundariesLayerRef,
  oceanCurrentsLayerRef,
  adultLiteracyLayer,
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
  }, [layerVisibility.adultLiteracy, adultLiteracyLayer]);

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
