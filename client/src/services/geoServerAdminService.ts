/**
 * GeoServer Administration Service
 * Handles file uploads and import operations via GeoServer
 */

const getGeoServerBaseUrl = (): string => {
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:8081/geoserver";
  }
  return "/geoserver";
};

const getAuthHeader = (): HeadersInit => {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface GeoServerImportStatus {
  status: "uploading" | "processing" | "completed" | "failed";
  message?: string;
  layerName?: string;
  featuresCount?: number;
  error?: string;
}

export interface GeoServerLayer {
  name: string;
  title: string;
  workspace: string;
  featureCount?: number;
  bounds?: {
    minx: number;
    miny: number;
    maxx: number;
    maxy: number;
  };
}

export class GeoServerAdminService {
  private static baseUrl = getGeoServerBaseUrl();
  private static workspace = "maapallo";

  /**
   * Upload a GeoJSON file to GeoServer uploads directory
   */
  static async uploadFile(
    file: File,
    layerName: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("layerName", layerName);

      // Upload via our FastAPI backend which will place the file in GeoServer uploads
      const response = await fetch("/api/v1/admin/geoserver-upload", {
        method: "POST",
        headers: {
          ...getAuthHeader(),
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upload failed: ${error}`);
      }

      const result = await response.json();
      return {
        success: true,
        message: result.message || "File uploaded successfully",
      };
    } catch (error) {
      console.error("GeoServer upload error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Upload failed",
      };
    }
  }

  /**
   * Trigger GeoServer import script for uploaded file
   */
  static async triggerImport(
    fileName: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch("/api/v1/admin/geoserver-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({ fileName }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Import trigger failed: ${error}`);
      }

      const result = await response.json();
      return {
        success: true,
        message: result.message || "Import started successfully",
      };
    } catch (error) {
      console.error("GeoServer import trigger error:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Import trigger failed",
      };
    }
  }

  /**
   * Check if a layer exists in GeoServer
   */
  static async checkLayerExists(layerName: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.workspace}/wfs?service=WFS&version=1.1.0&request=GetCapabilities`
      );

      if (!response.ok) return false;

      const text = await response.text();
      return text.includes(`<Name>${this.workspace}:${layerName}</Name>`);
    } catch (error) {
      console.error("Layer existence check error:", error);
      return false;
    }
  }

  /**
   * Get layer information from GeoServer
   */
  static async getLayerInfo(layerName: string): Promise<GeoServerLayer | null> {
    try {
      // First check if layer exists
      const exists = await this.checkLayerExists(layerName);
      if (!exists) return null;

      // Get feature count via WFS
      const response = await fetch(
        `${this.baseUrl}/${this.workspace}/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=${this.workspace}:${layerName}&resultType=hits`
      );

      if (!response.ok) {
        throw new Error(`Failed to get layer info: ${response.status}`);
      }

      const text = await response.text();
      const featureCountMatch = text.match(/numberOfFeatures="(\d+)"/);
      const featureCount = featureCountMatch
        ? parseInt(featureCountMatch[1], 10)
        : 0;

      return {
        name: layerName,
        title: layerName
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        workspace: this.workspace,
        featureCount,
      };
    } catch (error) {
      console.error("Get layer info error:", error);
      return null;
    }
  }

  /**
   * Poll for import completion by checking if layer exists and has features
   */
  static async pollImportStatus(
    layerName: string,
    onProgress?: (status: GeoServerImportStatus) => void
  ): Promise<GeoServerImportStatus> {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    return new Promise((resolve) => {
      const poll = async () => {
        attempts++;

        try {
          const layerInfo = await this.getLayerInfo(layerName);

          if (
            layerInfo &&
            layerInfo.featureCount &&
            layerInfo.featureCount > 0
          ) {
            // Import completed successfully
            const finalStatus: GeoServerImportStatus = {
              status: "completed",
              message: `Import completed successfully. ${layerInfo.featureCount} features imported.`,
              layerName: layerInfo.name,
              featuresCount: layerInfo.featureCount,
            };

            onProgress?.(finalStatus);
            resolve(finalStatus);
            return;
          }

          if (attempts >= maxAttempts) {
            // Timeout
            const timeoutStatus: GeoServerImportStatus = {
              status: "failed",
              error: "Import timeout - layer not found after 5 minutes",
            };

            onProgress?.(timeoutStatus);
            resolve(timeoutStatus);
            return;
          }

          // Still processing
          const progressStatus: GeoServerImportStatus = {
            status: "processing",
            message: `Processing... (${attempts}/${maxAttempts})`,
          };

          onProgress?.(progressStatus);

          // Continue polling
          setTimeout(poll, 5000); // 5 second intervals
        } catch (error) {
          const errorStatus: GeoServerImportStatus = {
            status: "failed",
            error:
              error instanceof Error
                ? error.message
                : "Unknown error during import",
          };

          onProgress?.(errorStatus);
          resolve(errorStatus);
        }
      };

      // Start polling
      poll();
    });
  }

  /**
   * Complete import workflow: upload file, trigger import, and poll for completion
   */
  static async importFile(
    file: File,
    layerName: string,
    onProgress?: (status: GeoServerImportStatus) => void
  ): Promise<GeoServerImportStatus> {
    try {
      // Step 1: Upload file
      onProgress?.({ status: "uploading", message: "Uploading file..." });

      const uploadResult = await this.uploadFile(file, layerName);
      if (!uploadResult.success) {
        return {
          status: "failed",
          error: uploadResult.message,
        };
      }

      // Step 2: Trigger import
      onProgress?.({
        status: "processing",
        message: "Starting import process...",
      });

      const importResult = await this.triggerImport(file.name);
      if (!importResult.success) {
        return {
          status: "failed",
          error: importResult.message,
        };
      }

      // Step 3: Poll for completion
      onProgress?.({ status: "processing", message: "Processing import..." });

      return await this.pollImportStatus(layerName, onProgress);
    } catch (error) {
      console.error("Complete import workflow error:", error);
      return {
        status: "failed",
        error:
          error instanceof Error ? error.message : "Import workflow failed",
      };
    }
  }

  /**
   * List all layers in the GeoServer workspace
   */
  static async listLayers(): Promise<GeoServerLayer[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.workspace}/wfs?service=WFS&version=1.1.0&request=GetCapabilities`
      );

      if (!response.ok) {
        throw new Error(`Failed to get capabilities: ${response.status}`);
      }

      const text = await response.text();
      const layerMatches = text.match(/<Name>maapallo:([^<]+)<\/Name>/g);

      if (!layerMatches) return [];

      const layers: GeoServerLayer[] = [];

      for (const match of layerMatches) {
        const layerName = match.replace(/<Name>maapallo:([^<]+)<\/Name>/, "$1");
        const layerInfo = await this.getLayerInfo(layerName);
        if (layerInfo) {
          layers.push(layerInfo);
        }
      }

      return layers;
    } catch (error) {
      console.error("List layers error:", error);
      return [];
    }
  }
}

export default GeoServerAdminService;
