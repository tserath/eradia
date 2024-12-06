// /frontend/src/components/shared/ConfirmationDialog.jsx
import React from 'react';
import Modal from './Modal';

const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger'
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    width="confirm-dialog"
    actions={<>
      <Modal.Action onClick={onClose}>
        {cancelLabel}
      </Modal.Action>
      <Modal.Action onClick={onConfirm} variant={variant}>
        {confirmLabel}
      </Modal.Action>
    </>}
  >
    <p className="confirm-message">{message}</p>
  </Modal>
);

export default ConfirmationDialog;