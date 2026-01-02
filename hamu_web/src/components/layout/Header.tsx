import React, { useEffect, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  CircularProgress,
  Badge,
  Tooltip,
  alpha,
  useTheme,
  keyframes,
  styled,
  Chip
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Logout,
  Settings,
  Water as WaterIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import { useFilters } from '../../context/FilterContext';
import NotificationButton from '../notifications/NotificationButton';
import SettingsMenu from '../settings/SettingsMenu';
import { useUser } from '../../context/UserContext';
// Make sure we're importing the default export correctly
import DirectorBadge from '../common/DirectorBadge';

// Define animations
const gradientShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const subtlePulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.03); }
  100% { transform: scale(1); }
`;

const fadeIn = keyframes`
  from { opacity: 0.8; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
`;

// More elegant shimmer effect
const shimmer = keyframes`
  0% { box-shadow: 0 0 0px rgba(255, 255, 255, 0); }
  50% { box-shadow: 0 0 15px rgba(255, 255, 255, 0.5); }
  100% { box-shadow: 0 0 0px rgba(255, 255, 255, 0); }
`;

// Wave animation for the water icon
const wave = keyframes`
  0% { transform: translateY(0) scale(1); }
  25% { transform: translateY(-3px) scale(1.05); }
  50% { transform: translateY(0) scale(1); }
  75% { transform: translateY(2px) scale(0.98); }
  100% { transform: translateY(0) scale(1); }
`;

// Subtle color shift for the icon
const colorFade = keyframes`
  0% { color: rgba(255, 255, 255, 0.8); }
  50% { color: rgba(157, 220, 255, 1); }
  100% { color: rgba(255, 255, 255, 0.8); }
`;

const StyledLogoImg = styled('img')(({ theme }) => ({
  width: 42,
  height: 42,
  marginRight: 14,
  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  filter: 'brightness(1.05) drop-shadow(0 2px 3px rgba(0, 0, 0, 0.2))',
  '&:hover': {
    transform: 'scale(1.08) translateY(-2px)',
    filter: 'brightness(1.2) drop-shadow(0 4px 6px rgba(0, 0, 0, 0.25))',
  }
}));

const AnimatedAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
}));

interface HeaderProps {
  onToggleSidebar?: () => void;
}

// Static water icon (animations removed)
const AnimatedWaterIcon = styled(WaterIcon)(({ theme }) => ({
  color: alpha('#fff', 0.9),
  marginRight: theme.spacing(1.5),
  fontSize: '1.5rem',
  filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.3))',
}));

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [settingsAnchorEl, setSettingsAnchorEl] = React.useState<null | HTMLElement>(null); const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const { shopId, setShopId, shops, isLoading } = useFilters();
  const theme = useTheme();
  const { user } = useUser();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleShopChange = (event: SelectChangeEvent) => {
    setShopId(event.target.value);
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
    setAnchorEl(null);
  };

  const handleSettingsMenu = (event: React.MouseEvent<HTMLElement>) => {
    setSettingsAnchorEl(event.currentTarget);
  };

  const handleCloseSettingsMenu = () => {
    setSettingsAnchorEl(null);
  };
  return (
    <AnimatedAppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        color: 'white',
      }}
    >
      <Toolbar sx={{ opacity: mounted ? 1 : 0, animation: mounted ? `${fadeIn} 0.5s ease-out` : 'none' }}>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onToggleSidebar}
          sx={{
            mr: 2,
            display: { sm: 'none' },
            transition: 'transform 0.3s ease',
            '&:hover': {
              transform: 'rotate(180deg)'
            }
          }}
        >
          <MenuIcon />
        </IconButton>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          flexGrow: 1,
          '&:hover .header-title': {
            transform: 'translateX(3px)',
            color: alpha('#ffffff', 0.95),
          },
          transition: 'opacity 0.3s ease',
          position: 'relative',
          zIndex: 2
        }}>          <StyledLogoImg
            src={require('../../assets/icons/icon.png')}
            alt="Business Logo"
          />
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography
              variant="h6"
              component="div"
              className="header-title"
              sx={{
                fontWeight: 600,
                letterSpacing: '0.8px',
                color: 'white',
                textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                display: 'flex',
                alignItems: 'center',
                '&:hover': {
                  letterSpacing: '1px',
                  textShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }
              }}
            >
              Hamu Water Analytics
            </Typography>
            <DirectorBadge />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl
            sx={{
              minWidth: 180,
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: 2,
                opacity: 0,
                transition: 'opacity 0.5s ease',
                boxShadow: '0 0 15px rgba(255, 255, 255, 0.2)',
                top: 0,
                left: 0,
                pointerEvents: 'none'
              },
              '&:hover::after': {
                opacity: 1
              },
              '& .MuiInputBase-root': {
                backgroundColor: alpha('#fff', 0.1),
                borderRadius: 2,
                color: 'white',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: alpha('#fff', 0.15),
                  transform: 'translateY(-1px)'
                }
              },
              '& .MuiInputLabel-root': {
                color: alpha('#fff', 0.8),
                transition: 'transform 0.3s ease'
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: alpha('#fff', 0.25),
                transition: 'border-color 0.3s ease'
              },
              '& .MuiSvgIcon-root': {
                color: alpha('#fff', 0.8),
                transition: 'transform 0.3s ease',
                '&:hover': {
                  transform: 'rotate(180deg)'
                }
              }
            }}
            size="small"
          >            <InputLabel id="shop-select-label">Shop</InputLabel>
            <Select
              labelId="shop-select-label"
              id="shop-select"
              value={shopId}
              label="Shop"
              onChange={handleShopChange}
              disabled={isLoading}
              sx={{
                transition: 'box-shadow 0.3s ease',
                '&:hover': {
                  boxShadow: '0 0 8px rgba(255, 255, 255, 0.3)'
                }
              }}
            >
              <MenuItem value="all">All Shops</MenuItem>
              {isLoading ? (
                <MenuItem disabled>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Loading...
                </MenuItem>
              ) : (
                shops.map((shop) => (
                  <MenuItem key={shop.id} value={shop.id.toString()}>
                    {shop.shopName}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {/* <NotificationButton /> */}

          <Box>
            <Tooltip title="Account settings">
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleSettingsMenu}
                color="inherit"
                sx={{
                  backgroundColor: alpha('#fff', 0.1),
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: alpha('#fff', 0.2),
                    transform: 'scale(1.1)',
                    boxShadow: '0 0 10px rgba(255, 255, 255, 0.4)'
                  }
                }}
              >
                <AccountCircle />
              </IconButton>
            </Tooltip>
            <SettingsMenu
              anchorEl={settingsAnchorEl}
              open={Boolean(settingsAnchorEl)}
              onClose={handleCloseSettingsMenu}
              onLogout={handleLogout}
            />
          </Box>
        </Box>
      </Toolbar>
    </AnimatedAppBar>
  );
};

export default Header;