import { useState, useEffect } from "react";

interface GeoServerLayer {
  id: string;
  name: string;
  workspace: string;
  title: string;
  type: string;
  category: string;
  visible: boolean;
  wms_url: string;
  wfs_url: string;
}

interface GeoServerConfig {
  wms_url: string;
  wfs_url: string;
  admin_url: string;
  rest_url: string;
}

export class GeoServerService {
  private config: GeoServerConfig | null = null;

  async getConfig(): Promise<GeoServerConfig> {
    if (!this.config) {
      const response = await fetch("/api/v1/geoserver/config");
      if (!response.ok) {
        throw new Error("Failed to get GeoServer config");
      }
      this.config = await response.json();
    }
    return this.config;
  }

  async getAvailableLayers(): Promise<GeoServerLayer[]> {
    const response = await fetch("/api/v1/geoserver/layers");
    if (!response.ok) {
      throw new Error("Failed to fetch layers");
    }
    return response.json();
  }

  async checkHealth(): Promise<any> {
    const response = await fetch("/api/v1/geoserver/health");
    if (!response.ok) {
      throw new Error("Failed to check GeoServer health");
    }
    return response.json();
  }

  async getWorkspaces(): Promise<any[]> {
    const response = await fetch("/api/v1/geoserver/workspaces");
    if (!response.ok) {
      throw new Error("Failed to fetch workspaces");
    }
    return response.json();
  }

  async getLayerPreview(workspace: string, layerName: string): Promise<any> {
    const response = await fetch(
      `/api/v1/geoserver/layers/${workspace}/${layerName}/preview`
    );
    if (!response.ok) {
      throw new Error("Failed to get layer preview URLs");
    }
    return response.json();
  }

  // Create OpenLayers WMS Layer
  createWMSLayer(
    workspace: string,
    layerName: string,
    config: GeoServerConfig
  ) {
    // This would return an OpenLayers TileLayer configured for WMS
    // Implementation depends on your OpenLayers setup
    return {
      type: "WMS",
      url: config.wms_url,
      params: {
        LAYERS: `${workspace}:${layerName}`,
        TILED: true,
        FORMAT: "image/png",
        TRANSPARENT: true,
      },
    };
  }

  // Create OpenLayers WFS Layer (for vector data)
  createWFSLayer(
    workspace: string,
    layerName: string,
    config: GeoServerConfig
  ) {
    return {
      type: "WFS",
      url: `${config.wfs_url}?service=WFS&version=1.1.0&request=GetFeature&typename=${workspace}:${layerName}&outputFormat=application/json`,
    };
  }
}

// React hook for GeoServer integration
export function useGeoServer() {
  const [geoServerService] = useState(() => new GeoServerService());
  const [layers, setLayers] = useState<GeoServerLayer[]>([]);
  const [config, setConfig] = useState<GeoServerConfig | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const configData = await geoServerService.getConfig();
      setConfig(configData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load config");
    } finally {
      setLoading(false);
    }
  };

  const loadLayers = async () => {
    try {
      setLoading(true);
      const layersData = await geoServerService.getAvailableLayers();
      setLayers(layersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load layers");
    } finally {
      setLoading(false);
    }
  };

  const checkHealth = async () => {
    try {
      const healthData = await geoServerService.checkHealth();
      setHealth(healthData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check health");
    }
  };

  useEffect(() => {
    loadConfig();
    checkHealth();
  }, []);

  return {
    geoServerService,
    layers,
    config,
    health,
    loading,
    error,
    loadLayers,
    checkHealth,
    loadConfig,
  };
}
