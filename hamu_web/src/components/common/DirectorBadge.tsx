import React from 'react';
import { Chip, Box, alpha, styled } from '@mui/material';
import { AdminPanelSettings as AdminIcon } from '@mui/icons-material';
import { useUser } from '../../context/UserContext';

// This ensures the file is treated as a module
export {};

// Styled animated admin badge
const AnimatedAdminBadge = styled(Chip)(({ theme }) => ({
  backgroundColor: alpha('#4CAF50', 0.9),
  color: '#fff',
  fontWeight: 600,
  animation: 'pulse 2s infinite',
  boxShadow: '0 0 10px rgba(76, 175, 80, 0.5)',
  marginLeft: theme.spacing(2),
  '& .MuiChip-icon': {
    color: '#fff'
  },
  '@keyframes pulse': {
    '0%': {
      boxShadow: '0 0 0 0px rgba(76, 175, 80, 0.4)'
    },
    '70%': {
      boxShadow: '0 0 0 10px rgba(76, 175, 80, 0)'
    },
    '100%': {
      boxShadow: '0 0 0 0px rgba(76, 175, 80, 0)'
    }
  }
}));

const DirectorBadge = () => {
  const { user } = useUser();

  // Only show the badge for directors
  if (!user || user.user_class !== 'Director') {
    return null;
  }

  return (
    <Box sx={{ display: { xs: 'none', md: 'block' } }}>
      <AnimatedAdminBadge
        icon={<AdminIcon />}
        label="Director"
        size="small"
      />
    </Box>
  );
};

export default DirectorBadge;
