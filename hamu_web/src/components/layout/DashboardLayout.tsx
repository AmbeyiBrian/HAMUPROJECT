import React, { useState } from 'react';
import { Box, Toolbar, CssBaseline } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { FilterProvider } from '../../context/FilterContext';
import { NotificationProvider } from '../../context/NotificationContext';

const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  return (
    <FilterProvider>
      <NotificationProvider>
        <Box sx={{ display: 'flex' }}>
          <CssBaseline />
          <Header onToggleSidebar={toggleSidebar} />
          <Sidebar open={sidebarOpen} />
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 3,
              width: { sm: `calc(100% - 240px)` },
              ml: { sm: sidebarOpen ? '240px' : 0 },
              transition: 'margin 0.2s ease-in-out',
            }}
          >
            <Toolbar />
            <Outlet />
          </Box>
        </Box>
      </NotificationProvider>
    </FilterProvider>
  );
};

export default DashboardLayout;