/* This is a module file */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Alert,
  Typography
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

interface QuickAdjustmentModalProps {
  open: boolean;
  onClose: () => void;
  stockItems: StockItem[];
  shopId: string;
  onSuccess: () => void;
}

const QuickAdjustmentModal: React.FC<QuickAdjustmentModalProps> = ({
  open,
  onClose,
  stockItems,
  shopId,
  onSuccess
}) => {
  const [selectedItemId, setSelectedItemId] = useState<number | ''>('');  const [quantity, setQuantity] = useState<string>('');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract' | 'set'>('add');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

  useEffect(() => {
    // Update selected item when item ID changes
    if (selectedItemId !== '') {
      const item = stockItems.find(item => item.id === selectedItemId);
      setSelectedItem(item || null);
    } else {
      setSelectedItem(null);
    }
  }, [selectedItemId, stockItems]);

  const handleSubmit = async () => {
    if (selectedItemId === '') {
      setError('Please select an item');
      return;
    }

    if (!quantity || parseInt(quantity) <= 0) {
      setError('Please enter a valid quantity');
      return;
    }    setIsSubmitting(true);
    setError(null);

    try {
      const adjustmentData: InventoryAdjustment = {
        id: selectedItemId as number,
        quantity: parseInt(quantity),
        reason: "Stock adjustment",
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
    setSelectedItemId('');    setQuantity('');
    setAdjustmentType('add');
    setError(null);
    setSelectedItem(null);
    onClose();
  };

  // Calculate the new quantity based on the current adjustment type and quantity
  const calculateNewQuantity = () => {
    if (!selectedItem || quantity === '') return selectedItem?.quantity || 0;
      const quantityValue = parseInt(quantity);
    switch (adjustmentType) {
      case 'add':
        return selectedItem.quantity + quantityValue;
      case 'subtract':
        return Math.max(0, selectedItem.quantity - quantityValue);
      case 'set':
        return quantityValue;
      default:
        return selectedItem.quantity;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Quick Inventory Adjustment</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Item selection dropdown */}
        <FormControl fullWidth margin="dense">
          <InputLabel id="stock-item-select-label">Select Item</InputLabel>
          <Select
            labelId="stock-item-select-label"
            id="stock-item-select"
            value={selectedItemId}
            label="Select Item"
            onChange={(e) => setSelectedItemId(e.target.value as number)}
            disabled={isSubmitting}
          >
            {stockItems.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {item.name} {item.type ? `(${item.type})` : ''} - Current: {item.quantity}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedItem && (
          <>
            <Box sx={{ mt: 2, mb: 1 }}>
              <Typography variant="subtitle2">
                Current quantity: <strong>{selectedItem.quantity}</strong>
              </Typography>
            </Box>

            {/* Adjustment Type */}
            <FormControl fullWidth margin="dense">
              <InputLabel id="adjustment-type-label">Adjustment Type</InputLabel>
              <Select
                labelId="adjustment-type-label"
                id="adjustment-type"
                value={adjustmentType}
                label="Adjustment Type"
                onChange={(e) => setAdjustmentType(e.target.value as 'add' | 'subtract' | 'set')}
                disabled={isSubmitting}
              >
                <MenuItem value="add">Add</MenuItem>
                <MenuItem value="subtract">Subtract</MenuItem>
                <MenuItem value="set">Set exact value</MenuItem>
              </Select>
            </FormControl>

            <TextField
              margin="dense"
              label="Quantity"
              type="text"
              fullWidth
              variant="outlined"
              value={quantity}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d+$/.test(value)) {
                  setQuantity(value);
                }
              }}
              disabled={isSubmitting}
              InputProps={{
                inputProps: { min: 1 }
              }}
            />
              {/* Reason field removed */}

            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                New quantity after adjustment:
              </Typography>
              <Typography variant="h6" color="primary.main">
                {calculateNewQuantity()}
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={isSubmitting || selectedItemId === '' || !quantity || parseInt(quantity) <= 0}
        >
          {isSubmitting ? <CircularProgress size={24} /> : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuickAdjustmentModal;
