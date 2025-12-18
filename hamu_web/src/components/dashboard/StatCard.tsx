import React from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  SvgIconProps,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import { 
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon
} from '@mui/icons-material';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactElement<SvgIconProps>;
  percentChange?: number;
  changeLabel?: string;
  bgcolor?: string;
  iconColor?: string;
  valuePrefix?: string;
  valueSuffix?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  percentChange,
  changeLabel = 'vs last period',
  bgcolor,
  iconColor,
  valuePrefix = '',
  valueSuffix = ''
}) => {
  const isPositiveChange = percentChange && percentChange > 0;
  const isNegativeChange = percentChange && percentChange < 0;
  const theme = useTheme();
  
  // Use theme colors if no custom colors are provided
  const effectiveIconColor = iconColor || theme.palette.primary.main;
  const effectiveBgColor = bgcolor || theme.palette.background.paper;
  
  return (
    <Paper
      elevation={0}
      sx={{ 
        p: 3, 
        backgroundColor: effectiveBgColor,
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        height: '100%',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 8px 25px rgba(0,0,0,0.09)'
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Box>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              color: theme.palette.text.secondary,
              fontWeight: 500,
              fontSize: '0.875rem',
              mb: 1
            }}
          >
            {title}
          </Typography>
          <Typography 
            variant="h4" 
            component="div" 
            sx={{ 
              fontWeight: 700,
              color: theme.palette.text.primary,
              mb: 1
            }}
            className="stat-card-value"
          >
            {valuePrefix}{typeof value === 'number' ? value.toLocaleString() : value}{valueSuffix}
          </Typography>
          
          {percentChange !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Tooltip title={changeLabel}>
                <Box
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: isPositiveChange 
                      ? alpha(theme.palette.success.main, 0.12)
                      : isNegativeChange 
                      ? alpha(theme.palette.error.main, 0.12)
                      : alpha(theme.palette.grey[500], 0.12),
                    color: isPositiveChange 
                      ? theme.palette.success.main
                      : isNegativeChange 
                      ? theme.palette.error.main
                      : theme.palette.grey[600],
                    borderRadius: 10,
                    px: 1,
                    py: 0.25
                  }}
                >
                  <Typography variant="body2" component="span" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                    {isPositiveChange && <ArrowUpwardIcon sx={{ fontSize: 16, mr: 0.5 }} />}
                    {isNegativeChange && <ArrowDownwardIcon sx={{ fontSize: 16, mr: 0.5 }} />}
                    {Math.abs(percentChange)}%
                  </Typography>
                </Box>
              </Tooltip>
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ ml: 1, fontSize: '0.75rem' }}
              >
                {changeLabel}
              </Typography>
            </Box>
          )}
        </Box>
        
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${alpha(effectiveIconColor, 0.15)} 0%, ${alpha(effectiveIconColor, 0.25)} 100%)`,
            color: effectiveIconColor,
            borderRadius: '12px',
            width: 56,
            height: 56,
            p: 1.5,
            boxShadow: `0 4px 10px ${alpha(effectiveIconColor, 0.15)}`
          }}
        >
          {React.cloneElement(icon, { fontSize: 'large' })}
        </Box>
      </Box>
    </Paper>
  );
};

export default StatCard;