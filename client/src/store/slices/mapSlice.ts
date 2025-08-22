import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Feature, Geometry, GeoJsonProperties } from "geojson";
import { BaseMapKey } from "../../components/2d/BaseMapSelector";
import { INITIAL_VIEW } from "../../constants/mapConstants";

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
  isMeasuring: boolean;
  currentMeasurement: string;
  mouseCoordinates: { lon: number; lat: number } | null;
  viewState: {
    center: [number, number];
    zoom: number;
    rotation: number;
  };
  mapConfig: {
    isInitialized: boolean;
    hasTarget: boolean;
  };
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
  isMeasuring: false,
  currentMeasurement: "",
  mouseCoordinates: null,
  viewState: {
    center: INITIAL_VIEW.center,
    zoom: INITIAL_VIEW.zoom,
    rotation: 0,
  },
  mapConfig: {
    isInitialized: false,
    hasTarget: false,
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
    setLayerVisibility: (
      state,
      action: PayloadAction<{
        layerId: keyof LayerVisibility;
        visible: boolean;
      }>
    ) => {
      state.layerVisibility[action.payload.layerId] = action.payload.visible;
    },
    setIsMeasuring: (state, action: PayloadAction<boolean>) => {
      state.isMeasuring = action.payload;
    },
    setCurrentMeasurement: (state, action: PayloadAction<string>) => {
      state.currentMeasurement = action.payload;
    },
    setMouseCoordinates: (
      state,
      action: PayloadAction<{ lon: number; lat: number } | null>
    ) => {
      state.mouseCoordinates = action.payload;
    },
    setViewState: (
      state,
      action: PayloadAction<{
        center?: [number, number];
        zoom?: number;
        rotation?: number;
      }>
    ) => {
      if (action.payload.center !== undefined) {
        state.viewState.center = action.payload.center;
      }
      if (action.payload.zoom !== undefined) {
        state.viewState.zoom = action.payload.zoom;
      }
      if (action.payload.rotation !== undefined) {
        state.viewState.rotation = action.payload.rotation;
      }
    },
    setMapInitialized: (state, action: PayloadAction<boolean>) => {
      state.mapConfig.isInitialized = action.payload;
    },
    setMapHasTarget: (state, action: PayloadAction<boolean>) => {
      state.mapConfig.hasTarget = action.payload;
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
  setIsMeasuring,
  setCurrentMeasurement,
  setMouseCoordinates,
  setViewState,
  setMapInitialized,
  setMapHasTarget,
} = mapSlice.actions;

export default mapSlice.reducer;
