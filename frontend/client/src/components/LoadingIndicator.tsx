import React from 'react';
import { Box, CircularProgress, Typography, keyframes } from '@mui/material';

interface LoadingIndicatorProps {
  message?: string;
}

const pulseAnimation = keyframes`
  0% {
    transform: scale(0.95);
    opacity: 0.7;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0.95);
    opacity: 0.7;
  }
`;

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ message = 'Loading...' }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        p: 4,
        borderRadius: 4,
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(30, 30, 30, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        animation: `${pulseAnimation} 2s ease-in-out infinite`,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: 80,
          height: 80,
          mb: 3,
        }}
      >
        <CircularProgress 
          size={80} 
          thickness={3} 
          sx={{ 
            color: 'primary.main',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
        <CircularProgress 
          size={60} 
          thickness={4} 
          sx={{ 
            color: 'info.main',
            position: 'absolute',
            top: 10,
            left: 10,
          }} 
        />
      </Box>
      <Typography 
        variant="h6" 
        sx={{ 
          mt: 2, 
          fontWeight: 600,
          backgroundImage: 'linear-gradient(90deg, #64D2FF 0%, #0A84FF 100%)',
          backgroundClip: 'text',
          textFillColor: 'transparent',
          letterSpacing: '-0.025em',
        }}
      >
        {message}
      </Typography>
    </Box>
  );
};

export default LoadingIndicator; 