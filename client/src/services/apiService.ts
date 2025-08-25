import { authenticatedFetch } from "./authService";
import { FeatureTypes } from "../types/featureTypes";

const API_BASE_URL = "/api/v1";

export const featureAPI = {
  // Get all features (public)
  getAllFeatures: async (): Promise<{ features: FeatureTypes[] }> => {
    const response = await fetch(`${API_BASE_URL}/feature/`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  // Get single feature (public)
  getFeature: async (id: number): Promise<{ feature: FeatureTypes }> => {
    const response = await fetch(`${API_BASE_URL}/feature/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  // Create feature (requires auth)
  createFeature: async (
    featureData: Partial<FeatureTypes>
  ): Promise<{ feature: FeatureTypes; message: string }> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/feature/`, {
      method: "POST",
      body: JSON.stringify(featureData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to create feature");
    }

    return response.json();
  },

  // Update feature (requires auth)
  updateFeature: async (
    id: number,
    featureData: Partial<FeatureTypes>
  ): Promise<FeatureTypes> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/feature/${id}`, {
      method: "PUT",
      body: JSON.stringify(featureData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to update feature");
    }

    return response.json();
  },

  // Delete feature (requires auth)
  deleteFeature: async (id: number): Promise<{ message: string }> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/feature/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to delete feature");
    }

    return response.json();
  },
};

export const analyticsAPI = {
  // Track pageview (public)
  trackPageview: async (data: {
    path: string;
    title?: string;
    referrer?: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/analytics/pageview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-analytics-consent": "true", // Assuming consent is given
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to track pageview");
    }

    return response.json();
  },

  // Track custom event (public)
  trackEvent: async (data: { name: string; data?: Record<string, any> }) => {
    const response = await fetch(`${API_BASE_URL}/analytics/event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-analytics-consent": "true", // Assuming consent is given
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to track event");
    }

    return response.json();
  },

  // Get analytics stats (requires auth)
  getStats: async (days: number = 30) => {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/analytics/stats?days=${days}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to get analytics stats");
    }

    return response.json();
  },
};
