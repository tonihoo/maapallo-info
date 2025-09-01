const API_BASE_URL = "/api/v1";

const getAuthHeader = (): HeadersInit => {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const adminService = {
  uploadGeoJSON: async (file: File, layerName: string, srid = 4326) => {
    const form = new FormData();
    form.append("file", file);
    form.append("layer_name", layerName);
    form.append("srid", String(srid));

    const res = await fetch(`${API_BASE_URL}/admin/import-geojson`, {
      method: "POST",
      headers: {
        ...getAuthHeader(),
      },
      body: form,
    });
    if (!res.ok) {
      let msg = "Upload failed";
      try {
        const err = await res.json();
        msg = err.detail || msg;
      } catch {
        // ignore parse error
      }
      throw new Error(msg);
    }
    return res.json(); // { job_id, status }
  },

  listLayers: async () => {
    const res = await fetch(`${API_BASE_URL}/admin/layers`, {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
    });
    if (!res.ok) throw new Error("Failed to fetch layers");
    return res.json();
  },
  getImportStatus: async (jobId: string) => {
    const res = await fetch(`${API_BASE_URL}/admin/import-jobs/${jobId}`, {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
    });
    if (!res.ok) throw new Error("Failed to fetch job status");
    return res.json();
  },
};
