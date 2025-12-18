import React, { useState } from 'react';
import { 
  Box, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  ListItemButton,
  Divider,
  IconButton,
  useMediaQuery,
  useTheme,
  Typography,
  alpha
} from '@mui/material';
import { 
  Dashboard as DashboardIcon,
  BarChart as SalesIcon,
  People as CustomersIcon,
  Inventory as InventoryIcon,
  AttachMoney as FinancialIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  width?: number;
  open?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  width = 240, 
  open = false, 
  onClose = () => {} 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  
  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Sales Analytics', icon: <SalesIcon />, path: '/sales' },
    { text: 'Customer Insights', icon: <CustomersIcon />, path: '/customers' },
    { text: 'Inventory Analytics', icon: <InventoryIcon />, path: '/inventory' },
    { text: 'Financial Analytics', icon: <FinancialIcon />, path: '/financial' },
  ];
  
  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) {
      onClose();
    }
  };
  
  const drawerContent = (
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          bgcolor: alpha(theme.palette.background.paper, 0.95)
        }}
      >
        {/* Add proper padding at the top to match toolbar height */}
        <Box 
          sx={{ 
            pt: '64px', // Height of the app bar
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            py: 2,
            borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`
          }}
        >
          <Typography variant="subtitle1" sx={{ color: theme.palette.primary.main, fontWeight: 600 }}>
            Navigation
          </Typography>
        </Box>

        <List sx={{ flexGrow: 1, pt: 1 }}>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigate(item.path)}
                sx={{
                  py: 1.5,
                  mx: 1,
                  borderRadius: 2,
                  mb: 0.5,
                  '&.Mui-selected': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.12),
                    color: theme.palette.primary.main,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.18),
                    }
                  },
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  }
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: location.pathname === item.path 
                      ? theme.palette.primary.main 
                      : theme.palette.text.secondary
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{
                    fontWeight: location.pathname === item.path ? 600 : 500,
                    fontSize: '0.95rem'
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider />
        <Box 
          sx={{ 
            p: 2, 
            display: 'flex', 
            justifyContent: 'center',
            bgcolor: alpha(theme.palette.primary.main, 0.03) 
          }}
        >
          <Box sx={{ fontSize: 12, color: 'text.secondary', textAlign: 'center' }}>
            <Typography variant="caption" color="textSecondary" fontWeight={500}>
              Hamu Water Analytics
            </Typography>
            <Box component="div" sx={{ mt: 0.5 }}>
              <Typography variant="caption" color={theme.palette.primary.main} fontWeight={600}>
                v1.0.0
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
  
  return (
    <>
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={open}
          onClose={onClose}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width,
              borderRight: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
              boxShadow: '0 0 20px rgba(0,0,0,0.04)'
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      )}
    </>
  );
};

export default Sidebar;