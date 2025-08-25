import React, { useState } from "react";
import {
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { AccountCircle, Login, Logout, Analytics } from "@mui/icons-material";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { logout } from "../../store/slices/authSlice";
import { LoginDialog } from "./LoginDialog";

export const UserMenu: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLoginClick = () => {
    setLoginDialogOpen(true);
    handleMenuClose();
  };

  const handleLogout = () => {
    dispatch(logout());
    handleMenuClose();
  };

  const handleAnalyticsClick = () => {
    // TODO: Open analytics dialog/page
    console.log("Analytics clicked");
    handleMenuClose();
  };

  return (
    <>
      <IconButton
        size="large"
        edge="end"
        aria-label="account menu"
        aria-controls="user-menu"
        aria-haspopup="true"
        onClick={handleMenuOpen}
        color="inherit"
      >
        <AccountCircle />
      </IconButton>

      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {isAuthenticated ? (
          [
            <Box key="user-info" sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Logged in as
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {user?.username}
              </Typography>
            </Box>,
            <Divider key="divider1" />,
            <MenuItem key="analytics" onClick={handleAnalyticsClick}>
              <ListItemIcon>
                <Analytics fontSize="small" />
              </ListItemIcon>
              <ListItemText>Analytics</ListItemText>
            </MenuItem>,
            <Divider key="divider2" />,
            <MenuItem key="logout" onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              <ListItemText>Logout</ListItemText>
            </MenuItem>,
          ]
        ) : (
          <MenuItem onClick={handleLoginClick}>
            <ListItemIcon>
              <Login fontSize="small" />
            </ListItemIcon>
            <ListItemText>Admin Login</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <LoginDialog
        open={loginDialogOpen}
        onClose={() => setLoginDialogOpen(false)}
      />
    </>
  );
};
