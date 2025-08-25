import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { AuthState, LoginCredentials, User } from "../../types/authTypes";
import { authAPI, tokenUtils } from "../../services/authService";

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Async thunk for login
export const login = createAsyncThunk(
  "auth/login",
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      tokenUtils.setToken(response.access_token);

      // Verify token to get user info
      const userInfo = await authAPI.verifyToken();

      return {
        token: response.access_token,
        user: { username: userInfo.user, isActive: true } as User,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Login failed"
      );
    }
  }
);

// Async thunk for token verification on app start
export const verifyStoredToken = createAsyncThunk(
  "auth/verifyStoredToken",
  async (_, { rejectWithValue }) => {
    try {
      const token = tokenUtils.getToken();
      if (!token) {
        throw new Error("No token found");
      }

      const userInfo = await authAPI.verifyToken();

      return {
        token,
        user: { username: userInfo.user, isActive: true } as User,
      };
    } catch (error) {
      tokenUtils.removeToken();
      return rejectWithValue("Token verification failed");
    }
  }
);

// Async thunk for logout
export const logout = createAsyncThunk("auth/logout", async () => {
  authAPI.logout();
  return null;
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setAuthenticated: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      })
      // Token verification cases
      .addCase(verifyStoredToken.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(verifyStoredToken.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(verifyStoredToken.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null; // Don't show error for silent verification
      })
      // Logout cases
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      });
  },
});

export const { clearError, setAuthenticated } = authSlice.actions;
export default authSlice.reducer;
