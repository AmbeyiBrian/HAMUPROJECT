/* This is a module file */
import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { analyticsService, InventoryAdjustment } from '../../api/analyticsService';

interface StockItem {
  id: number;
  name: string;
  type: string;
  quantity: number;
  threshold: number;
  reorder_point: number;
}

interface InventoryAdjustmentModalProps {
  open: boolean;
  onClose: () => void;
  item: StockItem | null;
  shopId: string;
  onSuccess: () => void;
}

const InventoryAdjustmentModal: React.FC<InventoryAdjustmentModalProps> = ({
  open,
  onClose,
  item,
  shopId,
  onSuccess
}) => {
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [quantity, setQuantity] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleChangeAdjustmentType = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAdjustmentType(event.target.value as 'add' | 'subtract');
  };

  const handleChangeQuantity = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow positive numbers
    const value = event.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setQuantity(value);
    }
  };

  const handleSubmit = async () => {
    if (!item) return;
    if (!quantity || parseInt(quantity) <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const adjustmentData: InventoryAdjustment = {
        id: item.id,
        quantity: parseInt(quantity),
        reason: "Stock adjustment", // Default reason
        adjustment_type: adjustmentType
      };

      await analyticsService.updateInventoryItem(shopId, adjustmentData);
      setIsSubmitting(false);
      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Error updating inventory:', err);
      setError('Failed to update inventory. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setQuantity('');
    setAdjustmentType('add');
    setError(null);
    onClose();
  };

  // Calculate the new quantity based on the current adjustment type and quantity
  const calculateNewQuantity = () => {
    if (!item || quantity === '') return item?.quantity || 0;
    
    const quantityValue = parseInt(quantity);
    switch (adjustmentType) {
      case 'add':
        return item.quantity + quantityValue;
      case 'subtract':
        return Math.max(0, item.quantity - quantityValue);
      default:
        return item.quantity;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        Adjust Inventory - {item?.name} {item?.type ? `(${item.type})` : ''}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <DialogContentText gutterBottom>
          Current quantity: <strong>{item?.quantity || 0}</strong>
        </DialogContentText>
        
        <Box sx={{ mt: 2, mb: 2 }}>
          <FormControl component="fieldset">
            <Typography variant="subtitle2" gutterBottom>
              Adjustment Type
            </Typography>
            <RadioGroup
              row
              value={adjustmentType}
              onChange={handleChangeAdjustmentType}
            >
              <FormControlLabel value="add" control={<Radio />} label="Add" />
              <FormControlLabel value="subtract" control={<Radio />} label="Subtract" />
            </RadioGroup>
          </FormControl>
        </Box>
        
        <TextField
          margin="dense"
          label="Quantity"
          type="text"
          fullWidth
          variant="outlined"
          value={quantity}
          onChange={handleChangeQuantity}
          disabled={isSubmitting}
          InputProps={{
            inputProps: { min: 1 }
          }}
        />

        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            New quantity after adjustment:
          </Typography>
          <Typography variant="h6" color="primary.main">
            {calculateNewQuantity()}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={isSubmitting || !quantity || parseInt(quantity) <= 0}
        >
          {isSubmitting ? <CircularProgress size={24} /> : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InventoryAdjustmentModal;
