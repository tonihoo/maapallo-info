import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { FeatureTypes } from "../../types/featureTypes";

interface FeaturesState {
  allFeatures: FeatureTypes[];
  refreshTrigger: number;
  loading: boolean;
  error: string | null;
}

const initialState: FeaturesState = {
  allFeatures: [],
  refreshTrigger: 0,
  loading: false,
  error: null,
};

export const fetchAllFeatures = createAsyncThunk(
  "features/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/v1/feature/");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.features || [];
    } catch (error) {
      console.error("Error fetching all features:", error);
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch features"
      );
    }
  }
);

const featuresSlice = createSlice({
  name: "features",
  initialState,
  reducers: {
    setAllFeatures: (state, action: PayloadAction<FeatureTypes[]>) => {
      state.allFeatures = action.payload;
      state.error = null;
    },
    triggerRefresh: (state) => {
      state.refreshTrigger += 1;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllFeatures.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllFeatures.fulfilled, (state, action) => {
        state.loading = false;
        state.allFeatures = action.payload;
        state.error = null;
      })
      .addCase(fetchAllFeatures.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setAllFeatures, triggerRefresh, clearError } =
  featuresSlice.actions;

export default featuresSlice.reducer;
