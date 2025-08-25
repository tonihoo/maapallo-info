import { useState } from "react";
import {
  IconButton,
  Drawer,
  Box,
  List,
  ListItemButton,
  ListItemText,
  Collapse,
  MenuItem,
  Divider,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import FeatureList from "./FeatureList";
import { CookiePreferences } from "./CookiePreferences";
import InfoIcon from "@mui/icons-material/Info";
import ArticleIcon from "@mui/icons-material/Article";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import {
  Settings as SettingsIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";
import SiteInfo from "./SiteInfo";
import { LoginDialog } from "../auth/LoginDialog";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { logout } from "../../store/slices/authSlice";

interface Props {
  onSelectFeature: (id: number) => void;
  selectedFeatureId?: number | null;
  refreshTrigger?: number;
  is3DMode?: boolean;
}

export function HeaderMenu({
  onSelectFeature,
  selectedFeatureId,
  refreshTrigger,
  is3DMode,
}: Props) {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  const [isOpen, setIsOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [articlesOpen, setArticlesOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleFeatureSelect = (id: number) => {
    onSelectFeature(id);
    setIsOpen(false); // Close menu after selection
  };

  const handleLoginClick = () => {
    setLoginDialogOpen(true);
    setIsOpen(false);
  };

  const handleLogout = () => {
    dispatch(logout());
    setIsOpen(false);
  };

  return (
    <>
      {/* Hamburger Menu Button */}
      <IconButton
        onClick={handleToggle}
        sx={{
          position: "fixed",
          top: "2px", // On top of header to match 2D/3D toggle
          left: "16px",
          zIndex: 1200,
          backgroundColor: is3DMode
            ? "rgba(126, 199, 129, 0.9)" // Same green as header in 3D mode
            : "rgba(255, 179, 76, 0.9)", // Same orange as header in 2D mode
          color: "black",
          width: "38px", // Same size as 2D/3D toggle on mobile
          height: "38px", // Same size as 2D/3D toggle on mobile
          "&:hover": {
            backgroundColor: is3DMode
              ? "rgba(126, 199, 129, 1)" // Solid green on hover in 3D mode
              : "rgba(255, 179, 76, 1)", // Solid orange on hover in 2D mode
          },
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        <MenuIcon />
      </IconButton>

      {/* Drawer with Feature List and new menu items */}
      <Drawer
        anchor="left"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        sx={{
          "& .MuiDrawer-paper": {
            width: "300px",
            maxWidth: "80vw",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(8px)",
          },
        }}
        // Add inert attribute when Drawer is closed
        {...(!isOpen ? { inert: "true" } : {})}
      >
        <Box sx={{ height: "100%", paddingTop: "16px" }}>
          <List>
            {/* Tietoja */}
            <MenuItem
              onClick={() => {
                setInfoOpen(true);
                setIsOpen(false);
              }}
              sx={{ gap: 1 }}
            >
              <InfoIcon sx={{ fontSize: "1.2rem" }} />
              <ListItemText primary="Tietoja" />
            </MenuItem>
            {/* Maapallo-lehden artikkeleita */}
            <ListItemButton onClick={() => setArticlesOpen(!articlesOpen)}>
              <ArticleIcon sx={{ mr: 1 }} />
              <ListItemText primary="Maapallo-lehden artikkeleita" />
              {articlesOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={articlesOpen} timeout="auto" unmountOnExit>
              <Box sx={{ bgcolor: "#d2eac7", py: 1, px: 2 }}>
                <FeatureList
                  onSelectFeature={handleFeatureSelect}
                  selectedFeatureId={selectedFeatureId}
                  refreshTrigger={refreshTrigger}
                  is3DMode={is3DMode}
                />
              </Box>
            </Collapse>
            {/* Preferences Menu Item - shown even when no features */}
            <MenuItem
              onClick={() => {
                setPreferencesOpen(true);
                setIsOpen(false);
              }}
              sx={{ gap: 1 }}
            >
              <SettingsIcon sx={{ fontSize: "1.2rem" }} />
              <ListItemText primary="Evästeasetukset" />
            </MenuItem>

            {/* Admin Login/Logout */}
            <Divider sx={{ my: 1 }} />
            {isAuthenticated ? (
              <MenuItem onClick={handleLogout} sx={{ gap: 1 }}>
                <LogoutIcon sx={{ fontSize: "1.2rem" }} />
                <ListItemText
                  primary="Kirjaudu ulos"
                  secondary={
                    user?.username && `Kirjautuneena: ${user.username}`
                  }
                />
              </MenuItem>
            ) : (
              <MenuItem onClick={handleLoginClick} sx={{ gap: 1 }}>
                <LoginIcon sx={{ fontSize: "1.2rem" }} />
                <ListItemText primary="Ylläpito" />
              </MenuItem>
            )}
          </List>
        </Box>
      </Drawer>
      <SiteInfo open={infoOpen} onClose={() => setInfoOpen(false)} />
      {/* CookiePreferences dialog */}
      <CookiePreferences
        open={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
      />
      {/* Login dialog */}
      <LoginDialog
        open={loginDialogOpen}
        onClose={() => setLoginDialogOpen(false)}
      />
    </>
  );
}
