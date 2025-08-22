import { configureStore } from "@reduxjs/toolkit";
import mapReducer from "./slices/mapSlice";
import featuresReducer from "./slices/featuresSlice";

export const store = configureStore({
  reducer: {
    map: mapReducer,
    features: featuresReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ["map/setCesiumComponent"],
        // Ignore these field paths in all actions
        ignoredActionsPaths: ["payload.CesiumMapComponent"],
        // Ignore these paths in the state
        ignoredPaths: ["map.CesiumMapComponent"],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
