/* This is a module file */
import React, { useState } from 'react';
import {Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { analyticsService, InventoryAdjustment } from '../../api/analyticsService';

interface StockItem {
  id: number;
  name: string;
  type: string;
  quantity: number;
  threshold: number;
  reorder_point: number;
}

interface BulkAdjustmentItem {
  stockItem: StockItem;
  selected: boolean;
  quantity: string;
  newQuantity: number;
}

interface BulkAdjustmentModalProps {
  open: boolean;
  onClose: () => void;
  stockItems: StockItem[];
  shopId: string;
  onSuccess: () => void;
}

const BulkAdjustmentModal: React.FC<BulkAdjustmentModalProps> = ({
  open,
  onClose,
  stockItems,
  shopId,
  onSuccess
}) => {  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [items, setItems] = useState<BulkAdjustmentItem[]>(() => 
    stockItems.map(item => ({
      stockItem: item,
      selected: false,
      quantity: '',
      newQuantity: item.quantity
    }))
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');

  // Update items when stockItems prop changes
  React.useEffect(() => {
    setItems(stockItems.map(item => ({
      stockItem: item,
      selected: false,
      quantity: '',
      newQuantity: item.quantity
    })));
  }, [stockItems]);  const handleChangeAdjustmentType = (event: React.ChangeEvent<HTMLInputElement> | { target: { value: unknown } }) => {
    const newType = event.target.value as 'add' | 'subtract';
    setAdjustmentType(newType);
    
    // Recalculate new quantities based on the new adjustment type
    setItems(prevItems => prevItems.map(item => ({
      ...item,
      newQuantity: calculateNewQuantity(
        item.stockItem.quantity, 
        item.quantity === '' ? 0 : parseInt(item.quantity), 
        newType
      )
    })));
  };
  const calculateNewQuantity = (currentQty: number, adjustmentQty: number, type: 'add' | 'subtract') => {
    if (adjustmentQty === 0) return currentQty;
    
    switch (type) {
      case 'add':
        return currentQty + adjustmentQty;
      case 'subtract':
        return Math.max(0, currentQty - adjustmentQty);
      default:
        return currentQty;
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    setItems(prevItems => 
      prevItems.map(item => ({
        ...item,
        selected: event.target.checked
      }))
    );
  };

  const handleSelectItem = (id: number, checked: boolean) => {
    setItems(prevItems => 
      prevItems.map(item => 
        item.stockItem.id === id ? { ...item, selected: checked } : item
      )
    );
  };

  const handleQuantityChange = (id: number, value: string) => {
    // Only allow positive numbers or empty string
    if (value === '' || /^\d+$/.test(value)) {
      setItems(prevItems => 
        prevItems.map(item => {
          if (item.stockItem.id === id) {
            const newQty = value === '' ? 0 : parseInt(value);
            return {
              ...item,
              quantity: value,
              newQuantity: calculateNewQuantity(item.stockItem.quantity, newQty, adjustmentType)
            };
          }
          return item;
        })
      );
    }
  };

  const handleSubmit = async () => {
    const selectedItems = items.filter(item => item.selected && item.quantity !== '');
    
    if (selectedItems.length === 0) {
      setError('Please select at least one item and specify quantities');
      return;
    }    // Reason check removed

    setIsSubmitting(true);
    setError(null);

    try {
      // Process all selected items in sequence
      for (const item of selectedItems) {
        const          adjustmentData: InventoryAdjustment = {
          id: item.stockItem.id,
          quantity: parseInt(item.quantity),
          adjustment_type: adjustmentType
        };

        await analyticsService.updateInventoryItem(shopId, adjustmentData);
      }
      
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
    setItems(stockItems.map(item => ({
      stockItem: item,
      selected: false,
      quantity: '',
      newQuantity: item.quantity
    })));
    setAdjustmentType('add');
    setError(null);
    setFilter('');
    onClose();
  };

  // Filter items based on the search filter
  const filteredItems = items.filter(item => 
    item.stockItem.name.toLowerCase().includes(filter.toLowerCase()) ||
    (item.stockItem.type && item.stockItem.type.toLowerCase().includes(filter.toLowerCase()))
  );

  const anyItemSelected = items.some(item => item.selected);
  const allItemsSelected = items.length > 0 && items.every(item => item.selected);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>Bulk Inventory Adjustment</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
          <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
            <FormControl fullWidth margin="dense">
              <InputLabel id="adjustment-type-label">Adjustment Type</InputLabel>
              <Select
                labelId="adjustment-type-label"
                id="adjustment-type"
                value={adjustmentType}
                label="Adjustment Type"                onChange={handleChangeAdjustmentType}
                disabled={isSubmitting}
              >              <MenuItem value="add">Add</MenuItem>
                <MenuItem value="subtract">Subtract</MenuItem>
              </Select>
            </FormControl>
          </Grid>          {/* Reason field removed */}
        </Grid>

        <TextField
          margin="dense"
          label="Filter items"
          type="text"
          fullWidth
          variant="outlined"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          disabled={isSubmitting}
          placeholder="Type to filter items by name or type"
          sx={{ mb: 2 }}
        />

        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={anyItemSelected && !allItemsSelected}
                      checked={allItemsSelected}
                      onChange={handleSelectAll}
                      disabled={isSubmitting}
                    />
                  </TableCell>
                  <TableCell>Item</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Current Qty</TableCell>
                  <TableCell align="right">Adjustment</TableCell>
                  <TableCell align="right">New Qty</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow 
                    key={item.stockItem.id}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={item.selected}
                        onChange={(e) => handleSelectItem(item.stockItem.id, e.target.checked)}
                        disabled={isSubmitting}
                      />
                    </TableCell>
                    <TableCell component="th" scope="row">
                      {item.stockItem.name}
                    </TableCell>
                    <TableCell>{item.stockItem.type || '-'}</TableCell>
                    <TableCell align="right">{item.stockItem.quantity}</TableCell>
                    <TableCell align="right">
                      <TextField
                        type="text"
                        size="small"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(item.stockItem.id, e.target.value)}
                        disabled={isSubmitting || !item.selected}
                        InputProps={{
                          inputProps: { min: 0, style: { textAlign: 'right' } }
                        }}
                        sx={{ width: 80 }}
                      />
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{
                        color: item.newQuantity < item.stockItem.threshold ? 'error.main' : 
                               item.newQuantity < item.stockItem.reorder_point ? 'warning.main' : 'success.main',
                        fontWeight: 'medium'
                      }}
                    >
                      {item.quantity ? item.newQuantity : item.stockItem.quantity}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" sx={{ py: 2 }}>
                        No items match your filter
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            * Select items and enter quantities to adjust. The "New Qty" column shows the resulting quantities after adjustment.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={isSubmitting || !anyItemSelected || !items.some(item => item.selected && item.quantity !== '')}
        >
          {isSubmitting ? <CircularProgress size={24} /> : 'Save All Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkAdjustmentModal;
