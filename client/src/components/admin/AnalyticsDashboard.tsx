import { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Box,
  Chip,
  CircularProgress,
} from "@mui/material";
import { TrendingUp, Visibility, Public, MouseIcon } from "@mui/icons-material";
import { analytics } from "../../utils/analytics";
import type { AnalyticsStats } from "../../utils/analytics";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

const StatCard = ({ title, value, icon, color }: StatCardProps) => (
  <Card sx={{ height: "100%" }}>
    <CardContent>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Box sx={{ color, mr: 1 }}>{icon}</Box>
        <Typography variant="h6" component="div">
          {title}
        </Typography>
      </Box>
      <Typography variant="h3" sx={{ color, fontWeight: "bold" }}>
        {value.toLocaleString()}
      </Typography>
    </CardContent>
  </Card>
);

export const AnalyticsDashboard = () => {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const period = 30; // Fixed to 30 days for now

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const data = await analytics.getPublicStats(period);
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [period]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!stats) {
    return (
      <Paper sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="h6" color="text.secondary">
          Analytiikkatiedot eivät ole käytettävissä
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        📊 Maapallo.info Analytics
      </Typography>

      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Viimeisten {period} päivän tilastot
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Sivuvierailut"
            value={stats.total_pageviews}
            icon={<Visibility />}
            color="#2196f3"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Uniikki vierailijat"
            value={stats.unique_visitors}
            icon={<TrendingUp />}
            color="#4caf50"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Karttatoiminnot"
            value={stats.popular_events.reduce(
              (sum, event) => sum + event.count,
              0
            )}
            icon={<MouseIcon />}
            color="#ff9800"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Maita"
            value={stats.countries.length}
            icon={<Public />}
            color="#9c27b0"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              🏆 Suosituimmat sivut
            </Typography>
            <List>
              {stats.top_pages.map((page, index) => (
                <ListItem
                  key={page.path}
                  divider={index < stats.top_pages.length - 1}
                >
                  <ListItemText
                    primary={page.path === "/" ? "Etusivu" : page.path}
                    secondary={`${page.views} vierailua`}
                  />
                  <Chip
                    label={`#${index + 1}`}
                    size="small"
                    color={index === 0 ? "primary" : "default"}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              🌍 Vierailijat maittain
            </Typography>
            <List>
              {stats.countries.map((country, index) => (
                <ListItem
                  key={country.country}
                  divider={index < stats.countries.length - 1}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <span style={{ marginRight: 8 }}>
                          {country.country === "FI"
                            ? "🇫🇮"
                            : country.country === "SE"
                              ? "🇸🇪"
                              : country.country === "NO"
                                ? "🇳🇴"
                                : country.country === "DK"
                                  ? "🇩🇰"
                                  : country.country === "DE"
                                    ? "🇩🇪"
                                    : country.country === "US"
                                      ? "🇺🇸"
                                      : country.country === "GB"
                                        ? "🇬🇧"
                                        : "🌍"}
                        </span>
                        {country.country}
                      </Box>
                    }
                    secondary={`${country.visitors} vierailijaa`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              🗺️ Kartan käyttöstatistiikka
            </Typography>
            <Grid container spacing={2}>
              {stats.popular_events.map((event) => (
                <Grid item xs={12} sm={6} md={4} key={event.event}>
                  <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                    <Typography variant="subtitle2">
                      {event.event === "map_mode_toggle"
                        ? "🔄 2D/3D vaihto"
                        : event.event === "feature_selected"
                          ? "📍 Kohteen valinta"
                          : event.event === "layer_toggle"
                            ? "👁️ Tason näkyvyys"
                            : event.event === "base_map_change"
                              ? "🗺️ Peruskartan vaihto"
                              : event.event === "measurement_tool"
                                ? "📏 Mittaustyökalu"
                                : event.event}
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: "bold", color: "#4caf50" }}
                    >
                      {event.count}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      käyttökertaa
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, textAlign: "center" }}>
        <Typography variant="caption" color="text.secondary">
          🔒 Kaikki tiedot ovat nimettömiä ja GDPR-yhteensopivia
        </Typography>
      </Box>
    </Box>
  );
};
