import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Box,
  CircularProgress,
  Typography,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { login, clearError } from "../../store/slices/authSlice";

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
}

export const LoginDialog: React.FC<LoginDialogProps> = ({ open, onClose }) => {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      return;
    }

    try {
      const result = await dispatch(login(formData));
      if (login.fulfilled.match(result)) {
        onClose();
        setFormData({ username: "", password: "" });
      }
    } catch (error) {
      // Error is handled by the slice
    }
  };

  const handleClose = () => {
    onClose();
    setFormData({ username: "", password: "" });
    dispatch(clearError());
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6">Admin Login</Typography>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              name="username"
              label="Username"
              type="text"
              value={formData.username}
              onChange={handleInputChange}
              fullWidth
              required
              disabled={isLoading}
              autoFocus
            />

            <TextField
              name="password"
              label="Password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              fullWidth
              required
              disabled={isLoading}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading || !formData.username || !formData.password}
            startIcon={isLoading && <CircularProgress size={20} />}
          >
            {isLoading ? "Logging in..." : "Login"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
