// client/src/context/DialogContext.js
import React, { createContext, useContext, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button, // Import Button from Material UI
} from '@mui/material';

const DialogContext = createContext(null);

export const DialogProvider = ({ children }) => {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert', // 'alert' or 'confirm'
    onConfirm: null,
    onCancel: null,
    onOkCallback: null, // For alert dialog only
  });

  const showAlertDialog = (title, message, onOkCallback = null) => {
    setDialogState({
      isOpen: true,
      title,
      message,
      type: 'alert',
      onConfirm: null,
      onCancel: null,
      onOkCallback,
    });
  };

  const showConfirmDialog = (title, message, onConfirm, onCancel) => {
    setDialogState({
      isOpen: true,
      title,
      message,
      type: 'confirm',
      onConfirm,
      onCancel,
      onOkCallback: null,
    });
  };

  const handleClose = () => {
    setDialogState((prevState) => ({ ...prevState, isOpen: false }));
  };

  const handleOk = () => {
    handleClose();
    if (dialogState.onOkCallback) {
      dialogState.onOkCallback();
    }
  };

  const handleConfirm = () => {
    handleClose();
    if (dialogState.onConfirm) {
      dialogState.onConfirm();
    }
  };

  const handleCancel = () => {
    handleClose();
    if (dialogState.onCancel) {
      dialogState.onCancel();
    }
  };

  const value = {
    showAlertDialog,
    showConfirmDialog,
  };

  return (
    <DialogContext.Provider value={value}>
      {children}
      <Dialog
        open={dialogState.isOpen}
        onClose={dialogState.type === 'alert' ? handleOk : handleCancel} // Allow closing alerts with backdrop click
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        <DialogTitle id="dialog-title">{dialogState.title}</DialogTitle>
        <DialogContent>
          <DialogContentText id="dialog-description">
            {dialogState.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          {dialogState.type === 'confirm' && (
            <Button onClick={handleCancel} color="secondary"> {/* Themed secondary button */}
              Cancel
            </Button>
          )}
          <Button
            onClick={dialogState.type === 'alert' ? handleOk : handleConfirm}
            color="primary"
            variant="contained" // Use contained variant for primary
            autoFocus
          >
            {dialogState.type === 'alert' ? 'OK' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};