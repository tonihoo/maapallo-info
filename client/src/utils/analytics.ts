/**
 * Privacy-focused analytics for Maapallo.info
 * EU GDPR compliant - respects user cookie preferences
 */

import { analyticsAPI } from "../services/apiService";

export interface AnalyticsStats {
  period_days: number;
  total_pageviews: number;
  unique_visitors: number;
  top_pages: Array<{ path: string; views: number }>;
  countries: Array<{ country: string; visitors: number }>;
  popular_events: Array<{ event: string; count: number }>;
}

class AnalyticsService {
  private sessionId: string | null = null;
  private analyticsEnabled = false;

  constructor() {
    // Check cookie consent on initialization
    this.checkConsentStatus();
  }

  private checkConsentStatus(): void {
    const consent = localStorage.getItem("cookie-consent");
    this.analyticsEnabled = consent === "accepted";
  }

  /**
   * Enable analytics tracking (called after cookie consent)
   */
  enable(): void {
    this.analyticsEnabled = true;
    localStorage.setItem("cookie-consent", "accepted");
  }

  /**
   * Disable analytics tracking
   */
  disable(): void {
    this.analyticsEnabled = false;
    this.sessionId = null;
    localStorage.setItem("cookie-consent", "declined");
  }

  /**
   * Track a page view (respects consent)
   */
  async trackPageView(path: string, referrer?: string): Promise<void> {
    if (!this.analyticsEnabled) {
      return;
    }

    try {
      const data = await analyticsAPI.trackPageview({
        path,
        title: document.title,
        referrer: referrer || document.referrer,
      });

      if (data.session_id && !this.sessionId) {
        this.sessionId = data.session_id;
      }
    } catch (error) {
      // Fail silently for analytics - don't disrupt user experience
      console.debug("Analytics pageview tracking failed:", error);
    }
  }

  /**
   * Track custom events (map interactions, feature selections, etc.)
   */
  async trackEvent(
    eventName: string,
    eventData?: Record<string, string | number | boolean>
  ): Promise<void> {
    if (!this.analyticsEnabled) {
      return;
    }

    try {
      await analyticsAPI.trackEvent({
        name: eventName,
        data: eventData || {},
      });
    } catch (error) {
      console.debug("Analytics event tracking failed:", error);
    }
  }

  /**
   * Track map mode toggle (2D ↔ 3D)
   */
  async trackMapModeToggle(
    newMode: "2d" | "3d",
    previousMode: "2d" | "3d"
  ): Promise<void> {
    await this.trackEvent("map_mode_toggle", {
      new_mode: newMode,
      previous_mode: previousMode,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track feature selection on map
   */
  async trackFeatureSelection(
    featureId: number,
    mapMode: "2d" | "3d",
    source: "map_click" | "menu_select" = "map_click"
  ): Promise<void> {
    await this.trackEvent("feature_selected", {
      feature_id: featureId,
      map_mode: mapMode,
      selection_source: source,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track layer visibility changes
   */
  async trackLayerToggle(
    layerName: string,
    isVisible: boolean,
    mapMode: "2d" | "3d"
  ): Promise<void> {
    await this.trackEvent("layer_toggle", {
      layer_name: layerName,
      is_visible: isVisible,
      map_mode: mapMode,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track base map changes
   */
  async trackBaseMapChange(
    newBaseMap: string,
    previousBaseMap: string
  ): Promise<void> {
    await this.trackEvent("base_map_change", {
      new_base_map: newBaseMap,
      previous_base_map: previousBaseMap,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track measurement tool usage
   */
  async trackMeasurementTool(
    action: "start" | "complete" | "clear"
  ): Promise<void> {
    await this.trackEvent("measurement_tool", {
      action,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get basic public analytics stats
   */
  async getPublicStats(days = 30): Promise<AnalyticsStats | null> {
    try {
      const response = await fetch(`/api/v1/analytics/stats?days=${days}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error("Failed to fetch analytics stats:", error);
    }
    return null;
  }

  /**
   * Check if analytics is enabled
   */
  isEnabled(): boolean {
    return this.analyticsEnabled;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }
}

// Create singleton instance
export const analytics = new AnalyticsService();

// Auto-track page loads when enabled
document.addEventListener("DOMContentLoaded", () => {
  if (analytics.isEnabled()) {
    analytics.trackPageView(window.location.pathname);
  }
});

export default analytics;
