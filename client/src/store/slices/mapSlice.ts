import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Feature, Geometry, GeoJsonProperties } from "geojson";
import { BaseMapKey } from "../../components/2d/BaseMapSelector";

interface LayerVisibility {
  worldBoundaries: boolean;
  oceanCurrents: boolean;
  articleLocators: boolean;
  adultLiteracy: boolean;
}

interface CesiumMapProps {
  features: Feature<Geometry, GeoJsonProperties>[];
  selectedFeatureId?: number | null;
  onMapClick?: (coordinates: number[]) => void;
  onFeatureClick?: (featureId: number) => void;
}

interface MapState {
  selectedFeatureId: number | null;
  is3DMode: boolean;
  cesiumPreloaded: boolean;
  CesiumMapComponent: React.ComponentType<CesiumMapProps> | null;
  currentBaseMap: BaseMapKey;
  layerVisibility: LayerVisibility;
}

const initialState: MapState = {
  selectedFeatureId: null,
  is3DMode: false,
  cesiumPreloaded: false,
  CesiumMapComponent: null,
  currentBaseMap: "topo",
  layerVisibility: {
    worldBoundaries: false,
    oceanCurrents: false,
    articleLocators: false,
    adultLiteracy: false,
  },
};

const mapSlice = createSlice({
  name: "map",
  initialState,
  reducers: {
    setSelectedFeatureId: (state, action: PayloadAction<number | null>) => {
      state.selectedFeatureId = action.payload;
    },
    clearSelectedFeature: (state) => {
      state.selectedFeatureId = null;
    },
    toggleMapMode: (state) => {
      state.is3DMode = !state.is3DMode;
    },
    setMapMode: (state, action: PayloadAction<boolean>) => {
      state.is3DMode = action.payload;
    },
    setCesiumPreloaded: (state, action: PayloadAction<boolean>) => {
      state.cesiumPreloaded = action.payload;
    },
    setCesiumComponent: (
      state,
      action: PayloadAction<React.ComponentType<CesiumMapProps> | null>
    ) => {
      state.CesiumMapComponent = action.payload;
    },
    setCurrentBaseMap: (state, action: PayloadAction<BaseMapKey>) => {
      state.currentBaseMap = action.payload;
    },
    setLayerVisibility: (state, action: PayloadAction<{ layerId: keyof LayerVisibility; visible: boolean }>) => {
      state.layerVisibility[action.payload.layerId] = action.payload.visible;
    },
  },
});

export const {
  setSelectedFeatureId,
  clearSelectedFeature,
  toggleMapMode,
  setMapMode,
  setCesiumPreloaded,
  setCesiumComponent,
  setCurrentBaseMap,
  setLayerVisibility,
} = mapSlice.actions;

export default mapSlice.reducer;
