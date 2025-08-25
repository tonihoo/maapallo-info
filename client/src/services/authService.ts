import { LoginCredentials, AuthResponse, User } from "../types/authTypes";

const API_BASE_URL = "/api/v1";

// Helper function to get auth header
export const getAuthHeader = (): HeadersInit => {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Helper function to make authenticated requests
export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeader(),
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
  });
};

export const authAPI = {
  // Login with credentials
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Login failed");
    }

    return response.json();
  },

  // Verify token and get user info
  verifyToken: async (): Promise<{ message: string; user: string }> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/auth/verify`);

    if (!response.ok) {
      throw new Error("Token verification failed");
    }

    return response.json();
  },

  // Logout (client-side only - remove token)
  logout: (): void => {
    localStorage.removeItem("auth_token");
    sessionStorage.removeItem("auth_token");
  },
};

// Token management utilities
export const tokenUtils = {
  // Store token in localStorage
  setToken: (token: string): void => {
    localStorage.setItem("auth_token", token);
  },

  // Get token from localStorage
  getToken: (): string | null => {
    return localStorage.getItem("auth_token");
  },

  // Remove token
  removeToken: (): void => {
    localStorage.removeItem("auth_token");
    sessionStorage.removeItem("auth_token");
  },

  // Check if token exists
  hasToken: (): boolean => {
    return !!localStorage.getItem("auth_token");
  },
};
