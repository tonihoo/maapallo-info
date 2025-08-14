import React from "react";
import { useGeoServer } from "../services/geoServerService";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Grid,
} from "@mui/material";

export function GeoServerDashboard() {
  const { layers, config, health, loading, error, loadLayers, checkHealth } =
    useGeoServer();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        GeoServer Dashboard
      </Typography>

      {/* Health Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Health Status
          </Typography>
          {health ? (
            <Box>
              <Chip
                label={health.status}
                color={health.status === "healthy" ? "success" : "error"}
                sx={{ mb: 2 }}
              />
              <Typography variant="body2">
                Admin URL:{" "}
                <a
                  href={health.geoserver_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {health.geoserver_url}
                </a>
              </Typography>
              {health.version && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Version: {health.version.about?.resource?.[0]?.["@name"]}
                  {health.version.about?.resource?.[0]?.Version}
                </Typography>
              )}
            </Box>
          ) : (
            <Button onClick={checkHealth} variant="outlined">
              Check Health
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Configuration */}
      {config && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Configuration
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>WMS URL:</strong> {config.wms_url}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>WFS URL:</strong> {config.wfs_url}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Layers */}
      <Card>
        <CardContent>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6">
              Available Layers ({layers.length})
            </Typography>
            <Button onClick={loadLayers} variant="outlined">
              Refresh Layers
            </Button>
          </Box>

          {layers.length > 0 ? (
            <List>
              {layers.map((layer) => (
                <ListItem key={layer.id} divider>
                  <ListItemText
                    primary={layer.title}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Workspace: {layer.workspace} | Type: {layer.type}
                        </Typography>
                        <Chip
                          label={layer.category}
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Alert severity="info">
              No layers found. Add data to GeoServer to see layers here.
              <br />
              Access GeoServer admin:{" "}
              <a
                href="http://localhost:8081/geoserver"
                target="_blank"
                rel="noopener noreferrer"
              >
                http://localhost:8081/geoserver
              </a>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Quick Setup Guide */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Setup Guide
          </Typography>
          <Typography variant="body2" paragraph>
            To add your first layer:
          </Typography>
          <ol>
            <li>
              <Typography variant="body2">
                Access GeoServer admin interface:{" "}
                <a
                  href="http://localhost:8081/geoserver"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  http://localhost:8081/geoserver
                </a>
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Login with username: <code>admin</code>, password:{" "}
                <code>geoserver</code>
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Go to "Data" → "Workspaces" → "Add new workspace"
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Go to "Data" → "Stores" → "Add new Store" → Choose your data
                format
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Publish layers and they will appear here automatically
              </Typography>
            </li>
          </ol>
        </CardContent>
      </Card>
    </Box>
  );
}
