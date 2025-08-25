import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";

interface TietojaDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function TietojaDialog({ open, onClose }: TietojaDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="info-dialog-title"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle
        id="info-dialog-title"
        sx={{ bgcolor: "#e8f5e9", color: "#2e7d32", fontWeight: 600 }}
      >
        Tietoja
      </DialogTitle>
      <DialogContent
        sx={{ bgcolor: "#fafafa", fontSize: "16px", color: "#333" }}
      >
        Sivuston suunnittelusta, kehityksestä ja ylläpidosta vastaa
        Kehitysmaantieteen yhdistys.
      </DialogContent>
      <DialogActions sx={{ bgcolor: "#e8f5e9" }}>
        <Button onClick={onClose} variant="contained" color="success">
          Sulje
        </Button>
      </DialogActions>
    </Dialog>
  );
}
