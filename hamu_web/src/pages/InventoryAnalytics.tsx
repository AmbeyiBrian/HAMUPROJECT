import React, { useState } from 'react';
import { 
  Grid, 
  Box, 
  Typography, 
  Paper, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  LinearProgress,
  CircularProgress,
  styled,
  Button,
  Tooltip,
  IconButton,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  LocalDrink as WaterIcon,
  TrendingUp as TrendingUpIcon,
  Edit as EditIcon,
  Add as AddIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import StatCard from '../components/dashboard/StatCard';
import BarChartComponent from '../components/charts/BarChartComponent';
import LineChartComponent from '../components/charts/LineChartComponent';
import PieChartComponent from '../components/charts/PieChartComponent';
import { analyticsService } from '../api/analyticsService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useShops, Shop } from '../hooks/useShops';
import { useFilters } from '../context/FilterContext';
import InventoryAdjustmentModal from '../components/inventory/InventoryAdjustmentModal';
import QuickAdjustmentModal from '../components/inventory/QuickAdjustmentModal';
import BulkAdjustmentModal from '../components/inventory/BulkAdjustmentModal';
import InventoryHistoryModal from '../components/inventory/InventoryHistoryModal';

// Define interfaces for our data
interface StockItem {
  id: number;
  name: string;
  type: string;
  quantity: number;
  threshold: number;
  reorder_point: number;
}

interface ConsumptionData {
  date: string;
  consumption: number;
}

interface StockMovement {
  item: string;
  added: number;
  removed: number;
  net: number;
}

// Create a custom Grid component to handle breakpoints in MUI v7
const ResponsiveGrid = ({ 
  xs, 
  sm, 
  md, 
  lg,
  children, 
  ...props 
}: { 
  xs?: number,
  sm?: number,
  md?: number,
  lg?: number,
  children: React.ReactNode
} & Omit<React.ComponentProps<typeof Grid>, 'xs' | 'sm' | 'md' | 'lg'>) => {
  
  // Convert the old breakpoint props to the new sx format
  const breakpointStyles = {
    gridColumn: {
      xs: xs ? `span ${xs}` : undefined,
      sm: sm ? `span ${sm}` : undefined,
      md: md ? `span ${md}` : undefined,
      lg: lg ? `span ${lg}` : undefined,
    }
  };
  
  return (
    <Grid sx={breakpointStyles} {...props}>
      {children}
    </Grid>
  );
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`inventory-tabpanel-${index}`}
      aria-labelledby={`inventory-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const InventoryAnalytics: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const { shopId } = useFilters();
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isQuickAdjustModalOpen, setIsQuickAdjustModalOpen] = useState(false);  const [isBulkAdjustModalOpen, setIsBulkAdjustModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyItemId, setHistoryItemId] = useState<number | undefined>(undefined);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const queryClient = useQueryClient();
  
  // Fetch inventory analytics data from the backend
  const { 
    data: inventoryData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['inventoryAnalytics', shopId],
    queryFn: () => analyticsService.getInventoryAnalytics(shopId),
    staleTime: 60 * 1000 // 1 minute
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleAdjustInventory = (item: StockItem) => {
    setSelectedItem(item);
    setIsAdjustmentModalOpen(true);
  };
  const handleCloseAdjustmentModal = () => {
    setIsAdjustmentModalOpen(false);
    setSelectedItem(null);
  };

  const handleOpenQuickAdjustModal = () => {
    setIsQuickAdjustModalOpen(true);
  };
  const handleCloseQuickAdjustModal = () => {
    setIsQuickAdjustModalOpen(false);
  };
  
  const handleOpenBulkAdjustModal = () => {
    setIsBulkAdjustModalOpen(true);
  };
  const handleCloseBulkAdjustModal = () => {
    setIsBulkAdjustModalOpen(false);
  };
  
  const handleOpenHistoryModal = (itemId?: number) => {
    setHistoryItemId(itemId);
    setIsHistoryModalOpen(true);
  };

  const handleCloseHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setHistoryItemId(undefined);
  };

  const handleSuccessfulAdjustment = () => {
    // Show success message
    setSnackbarMessage('Inventory adjusted successfully');
    setSnackbarOpen(true);
    
    // Refresh inventory data
    refetch();
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading inventory data...</Typography>
      </Box>
    );
  }

  if (error || !inventoryData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography variant="h6" color="error">
          Error loading inventory data. Please try again later.
        </Typography>
      </Box>
    );
  }

  // Low stock items data
  const lowStockItems = inventoryData.stock_items?.filter(
    (item: StockItem) => item.quantity <= item.threshold
  ) || [];

  // Format stock items for bar chart
  const stockLevelsData = inventoryData.stock_items
    ?.filter((item: StockItem) => item.name === 'Bottle')
    .map((item: StockItem) => ({
      item: item.type,
      quantity: item.quantity
    })) || [];

  // Add console log to see what data we're working with
  console.log('All stock items:', inventoryData.stock_items);
  console.log('Filtered bottle items:', stockLevelsData);

  // Water consumption trend data
  const waterConsumptionData = inventoryData.water_consumption_trends || [];

  // Stock movement data for trends
  const stockMovementData = inventoryData.stock_movements || [];

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Inventory Analytics
        </Typography>        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenQuickAdjustModal}
        >
          Quick Adjust
        </Button>
      </Box>

      {/* Key metrics row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <ResponsiveGrid xs={12} sm={6} md={3}>
          <StatCard
            title="Total Stock Items"
            value={inventoryData.total_stock_items || 0}
            icon={<InventoryIcon />}
            percentChange={inventoryData.total_stock_items_change_percentage}
            iconColor="#4661d1"
          />
        </ResponsiveGrid>
        <ResponsiveGrid xs={12} sm={6} md={3}>
          <StatCard
            title="Low Stock Items"
            value={inventoryData.low_stock_items || 0}
            icon={<WarningIcon />}
            percentChange={inventoryData.low_stock_items_change_percentage}
            iconColor="#ff9800"
          />
        </ResponsiveGrid>
        <ResponsiveGrid xs={12} sm={6} md={3}>
          <StatCard
            title="Water Consumption"
            value={inventoryData.water_consumption || 0}
            icon={<WaterIcon />}
            percentChange={inventoryData.water_consumption_change_percentage}
            iconColor="#43a047"
            valueSuffix=" L"
          />
        </ResponsiveGrid>
        <ResponsiveGrid xs={12} sm={6} md={3}>
          <StatCard
            title="Water Wastage"
            value={inventoryData.water_wastage || 0}
            icon={<WaterIcon />}
            percentChange={inventoryData.water_wastage_change_percentage}
            iconColor="#e53935"
            valueSuffix=" L"
          />
        </ResponsiveGrid>
      </Grid>

      {/* Tabs for different inventory views */}
      <Box sx={{ width: '100%', mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="inventory analytics tabs">
            <Tab label="Stock Levels" />
            <Tab label="Water Consumption" />
            <Tab label="Stock Movement" />
          </Tabs>
        </Box>
        
        {/* Stock Levels Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <ResponsiveGrid xs={12} md={6}>
              <BarChartComponent
                title="Bottle Stock Levels"
                data={stockLevelsData}
                dataKey="quantity"
                xAxisDataKey="item"
                barColor="#43a047"
              />
            </ResponsiveGrid>
            <ResponsiveGrid xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{ 
                  p: 2, 
                  height: '100%', 
                  borderRadius: 2,
                  border: '1px solid rgba(0, 0, 0, 0.12)'
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Low Stock Items
                </Typography>
                {lowStockItems.length > 0 ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Item</TableCell>
                          <TableCell align="right">Quantity</TableCell>
                          <TableCell align="right">Threshold</TableCell>
                          <TableCell align="right">Status</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {lowStockItems.map((item: StockItem) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell align="right">{item.quantity}</TableCell>
                            <TableCell align="right">{item.threshold}</TableCell>
                            <TableCell align="right">
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Box sx={{ width: '100%', mr: 1 }}>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={(item.quantity / item.threshold) * 100}
                                    color={item.quantity < item.threshold / 2 ? "error" : "warning"}
                                  />
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                  {Math.round((item.quantity / item.threshold) * 100)}%
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Adjust Inventory">
                                <IconButton 
                                  size="small"
                                  onClick={() => handleAdjustInventory(item)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body1">No low stock items to display</Typography>
                )}
              </Paper>
            </ResponsiveGrid>
            <ResponsiveGrid xs={12}>              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Stock Items</Typography>
                <Button 
                  variant="outlined" 
                  color="primary"
                  size="small"
                  onClick={handleOpenBulkAdjustModal}
                >
                  Bulk Adjust
                </Button>
              </Box>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.12)' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Reorder Point</TableCell>
                      <TableCell align="right">Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {inventoryData.stock_items?.map((item: StockItem) => {
                      const stockStatus = item.quantity <= item.threshold 
                        ? 'Low' 
                        : item.quantity <= item.reorder_point 
                        ? 'Warning' 
                        : 'Adequate';
                      
                      const statusColor = stockStatus === 'Low' 
                        ? '#f44336' 
                        : stockStatus === 'Warning' 
                        ? '#ff9800' 
                        : '#4caf50';
                        
                      return (
                        <TableRow
                          key={item.id}
                          sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                          <TableCell component="th" scope="row">
                            {item.name}
                          </TableCell>
                          <TableCell>{item.type}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">{item.reorder_point}</TableCell>
                          <TableCell 
                            align="right"
                            sx={{ 
                              color: statusColor,
                              fontWeight: stockStatus === 'Low' ? 'bold' : 'normal'
                            }}
                          >
                            {stockStatus}
                          </TableCell>
                          <TableCell align="right">                            <Box>
                              <Tooltip title="Adjust Inventory">
                                <IconButton
                                  size="small"
                                  onClick={() => handleAdjustInventory(item)}
                                  color="primary"
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="View Item History">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenHistoryModal(item.id)}
                                  color="default"
                                >
                                  <HistoryIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </ResponsiveGrid>
          </Grid>
        </TabPanel>
        
        {/* Water Consumption Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <ResponsiveGrid xs={12}>
              <LineChartComponent
                title="Daily Water Consumption"
                data={waterConsumptionData}
                lines={[{ dataKey: 'consumption', color: '#2196f3', name: 'Consumption (L)' }]}
                xAxisDataKey="date"
                valueSuffix=" L"
              />
            </ResponsiveGrid>
            <ResponsiveGrid xs={12}>
              <Paper
                elevation={0}
                sx={{ 
                  p: 2, 
                  height: '100%', 
                  borderRadius: 2,
                  border: '1px solid rgba(0, 0, 0, 0.12)'
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Water Consumption Analysis
                </Typography>
                <Box sx={{ p: 1 }}>
                  <Typography variant="body1" paragraph>
                    Total water consumption this week: <strong>{inventoryData.water_consumption || 0} liters</strong>
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Water wastage rate: <strong>{Math.round(((inventoryData.water_wastage || 0) / (inventoryData.water_consumption || 1)) * 100)}%</strong>
                  </Typography>
                  <Typography variant="body1">
                    Average daily consumption: <strong>{Math.round((inventoryData.water_consumption || 0) / 7)} liters</strong>
                  </Typography>
                </Box>
              </Paper>
            </ResponsiveGrid>
          </Grid>
        </TabPanel>
        
        {/* Stock Movement Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <ResponsiveGrid xs={12}>
              <BarChartComponent
                title="Stock Movement This Week"
                data={stockMovementData}
                dataKey="net"
                xAxisDataKey="item"
                barColor="#4661d1"
              />
            </ResponsiveGrid>
            <ResponsiveGrid xs={12}>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.12)' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell align="right">Added</TableCell>
                      <TableCell align="right">Removed</TableCell>
                      <TableCell align="right">Net Change</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stockMovementData.map((item: StockMovement) => (
                      <TableRow
                        key={item.item}
                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                      >
                        <TableCell component="th" scope="row">
                          {item.item}
                        </TableCell>
                        <TableCell align="right">{item.added}</TableCell>
                        <TableCell align="right">{item.removed}</TableCell>
                        <TableCell 
                          align="right"
                          sx={{ 
                            color: item.net > 0 ? '#4caf50' : item.net < 0 ? '#f44336' : 'inherit',
                            fontWeight: 'medium'
                          }}
                        >
                          {item.net > 0 ? '+' : ''}{item.net}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </ResponsiveGrid>
          </Grid>
        </TabPanel>
      </Box>      {/* Inventory Adjustment Modal */}
      <InventoryAdjustmentModal
        open={isAdjustmentModalOpen}
        onClose={handleCloseAdjustmentModal}
        item={selectedItem}
        shopId={shopId}
        onSuccess={handleSuccessfulAdjustment}
      />
        {/* Quick Adjustment Modal */}
      <QuickAdjustmentModal
        open={isQuickAdjustModalOpen}
        onClose={handleCloseQuickAdjustModal}
        stockItems={inventoryData.stock_items || []}
        shopId={shopId}
        onSuccess={handleSuccessfulAdjustment}
      />
        {/* Bulk Adjustment Modal */}
      <BulkAdjustmentModal
        open={isBulkAdjustModalOpen}
        onClose={handleCloseBulkAdjustModal}
        stockItems={inventoryData.stock_items || []}
        shopId={shopId}
        onSuccess={handleSuccessfulAdjustment}
      />
      
      {/* Inventory History Modal */}
      <InventoryHistoryModal
        open={isHistoryModalOpen}
        onClose={handleCloseHistoryModal}
        itemId={historyItemId}
        shopId={shopId}
      />

      {/* Success notification */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" variant="filled">
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default InventoryAnalytics;