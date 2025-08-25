import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { FeatureTypes } from "../../types/featureTypes";
import { featureAPI } from "../../services/apiService";

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
      const data = await featureAPI.getAllFeatures();
      return data.features || [];
    } catch (error) {
      console.error("Error fetching all features:", error);
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch features"
      );
    }
  }
);

export const createFeature = createAsyncThunk(
  "features/create",
  async (featureData: Partial<FeatureTypes>, { rejectWithValue }) => {
    try {
      const response = await featureAPI.createFeature(featureData);
      return response.feature;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create feature"
      );
    }
  }
);

export const updateFeature = createAsyncThunk(
  "features/update",
  async (
    { id, data }: { id: number; data: Partial<FeatureTypes> },
    { rejectWithValue }
  ) => {
    try {
      const updatedFeature = await featureAPI.updateFeature(id, data);
      return updatedFeature;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update feature"
      );
    }
  }
);

export const deleteFeature = createAsyncThunk(
  "features/delete",
  async (id: number, { rejectWithValue }) => {
    try {
      await featureAPI.deleteFeature(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete feature"
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
      // Fetch all features
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
      })
      // Create feature
      .addCase(createFeature.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createFeature.fulfilled, (state, action) => {
        state.loading = false;
        state.allFeatures.push(action.payload);
        state.refreshTrigger += 1;
        state.error = null;
      })
      .addCase(createFeature.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update feature
      .addCase(updateFeature.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateFeature.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.allFeatures.findIndex(
          (f) => f.id === action.payload.id
        );
        if (index !== -1) {
          state.allFeatures[index] = action.payload;
        }
        state.refreshTrigger += 1;
        state.error = null;
      })
      .addCase(updateFeature.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete feature
      .addCase(deleteFeature.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteFeature.fulfilled, (state, action) => {
        state.loading = false;
        state.allFeatures = state.allFeatures.filter(
          (f) => f.id !== action.payload
        );
        state.refreshTrigger += 1;
        state.error = null;
      })
      .addCase(deleteFeature.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setAllFeatures, triggerRefresh, clearError } =
  featuresSlice.actions;

export default featuresSlice.reducer;
