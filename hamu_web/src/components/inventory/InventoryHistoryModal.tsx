/* This is a module file */
import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  CircularProgress,
  Chip
} from '@mui/material';
import { analyticsService } from '../../api/analyticsService';
import { useQuery } from '@tanstack/react-query';

interface AdjustmentHistoryEntry {
  id: number;
  item_name: string;
  item_type: string;
  user: string;
  timestamp: string;
  previous_quantity: number;
  new_quantity: number;
  adjustment_type: 'add' | 'subtract' | 'set';
  quantity: number;
  reason: string;
  shop_name: string;
}

interface InventoryHistoryModalProps {
  open: boolean;
  onClose: () => void;
  itemId?: number;
  shopId: string;
}

const InventoryHistoryModal: React.FC<InventoryHistoryModalProps> = ({
  open,
  onClose,
  itemId,
  shopId
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const {
    data: historyData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['inventoryHistory', shopId, itemId],
    queryFn: () => analyticsService.getInventoryHistory(shopId, itemId),
    enabled: open, // Only fetch when modal is open
    staleTime: 60 * 1000 // 1 minute
  });

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleClose = () => {
    setPage(0);
    onClose();
  };

  // Format date for better readability
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get adjustment type label and color
  const getAdjustmentTypeInfo = (type: 'add' | 'subtract' | 'set') => {
    switch (type) {
      case 'add':
        return { label: 'Added', color: 'success' };
      case 'subtract':
        return { label: 'Removed', color: 'error' };
      case 'set':
        return { label: 'Set', color: 'info' };
      default:
        return { label: 'Unknown', color: 'default' };
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="lg"
    >
      <DialogTitle>
        Inventory Adjustment History
        {itemId ? ' - Item #' + itemId : ' - All Items'}
      </DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">
            Error loading inventory history. Please try again.
          </Typography>
        ) : (
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <TableContainer sx={{ maxHeight: 440 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date & Time</TableCell>
                    <TableCell>Item</TableCell>
                    <TableCell>Shop</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell align="right">Previous Qty</TableCell>
                    <TableCell align="right">Change</TableCell>
                    <TableCell align="right">New Qty</TableCell>
                    <TableCell>Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(historyData?.entries || [])
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((entry: AdjustmentHistoryEntry) => {
                      const typeInfo = getAdjustmentTypeInfo(entry.adjustment_type);
                      return (
                        <TableRow
                          key={entry.id}
                          hover
                          sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                          <TableCell>{formatDate(entry.timestamp)}</TableCell>
                          <TableCell>
                            {entry.item_name} 
                            {entry.item_type && ` (${entry.item_type})`}
                          </TableCell>
                          <TableCell>{entry.shop_name}</TableCell>
                          <TableCell>{entry.user}</TableCell>
                          <TableCell>
                            <Chip 
                              label={typeInfo.label} 
                              color={typeInfo.color as any}
                              size="small" 
                            />
                          </TableCell>
                          <TableCell align="right">{entry.previous_quantity}</TableCell>
                          <TableCell 
                            align="right"
                            sx={{ 
                              color: entry.adjustment_type === 'add' 
                                ? 'success.main' 
                                : entry.adjustment_type === 'subtract' 
                                  ? 'error.main' 
                                  : 'info.main'
                            }}
                          >
                            {entry.adjustment_type === 'add' && '+'}
                            {entry.adjustment_type === 'subtract' && '-'}
                            {entry.quantity}
                          </TableCell>
                          <TableCell align="right">{entry.new_quantity}</TableCell>
                          <TableCell>{entry.reason}</TableCell>
                        </TableRow>
                      );
                    })}

                  {(historyData?.entries?.length === 0 || !historyData?.entries) && (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        <Typography variant="body2" sx={{ py: 2 }}>
                          No adjustment history found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={historyData?.entries?.length || 0}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InventoryHistoryModal;
