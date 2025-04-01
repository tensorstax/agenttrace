import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
  Avatar,
  alpha,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import TimelineIcon from '@mui/icons-material/Timeline';
import PeopleIcon from '@mui/icons-material/People';
import BarChartIcon from '@mui/icons-material/BarChart';
import SpeedIcon from '@mui/icons-material/Speed';
import TensorStaxLogo from '../assets/tensorstax-logo.svg';

const drawerWidth = 260;

const navItems = [
  { text: 'Dashboard', path: '/', icon: <HomeIcon /> },
  { text: 'Traces', path: '/traces', icon: <TimelineIcon /> },
  { text: 'Sessions', path: '/sessions', icon: <PeopleIcon /> },
  { text: 'Evaluations', path: '/evaluations', icon: <BarChartIcon /> },
  { text: 'Performance', path: '/performance', icon: <SpeedIcon /> },
];

const Layout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Handle scroll effect for AppBar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Update document title
  useEffect(() => {
    document.title = 'AgentTrace by TensorStax';
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ 
        px: 3, 
        py: 3.5, 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'flex-start'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
          <Box 
            component="img"
            src={TensorStaxLogo}
            alt="TensorStax Logo"
            sx={{ 
              height: 32,
              width: 'auto',
              display: 'block',
              flexShrink: 0,
              filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2))'
            }}
          />
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 600,
              letterSpacing: '-0.01em',
              fontSize: '1.25rem',
              color: 'white'
            }}
          >
            agenttrace
          </Typography>
        </Box>
        <Typography 
          variant="caption" 
          sx={{ 
            fontSize: '0.7rem', 
            color: 'rgba(255, 255, 255, 0.5)',
            ml: 'calc(32px + 16px)' // Logo width + gap
          }}
        >
          by TensorStax
        </Typography>
      </Box>
      <Divider sx={{ opacity: 0.07 }} />
      <List sx={{ flex: 1, px: 1.5, py: 1 }}>
        {navItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
              sx={{
                py: 1.2,
                px: 1.5,
                borderRadius: 2,
                transition: 'all 0.2s ease-in-out',
                '&.Mui-selected': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.15),
                  },
                  '& .MuiListItemIcon-root': {
                    color: theme.palette.primary.main,
                  },
                  '& .MuiTypography-root': {
                    fontWeight: 600,
                    color: alpha(theme.palette.text.primary, 0.95),
                  },
                },
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                },
                '& .MuiListItemIcon-root': {
                  minWidth: 38,
                  color: alpha(theme.palette.text.primary, 0.7),
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{ 
                  fontSize: '0.95rem',
                  fontWeight: location.pathname === item.path ? 600 : 500,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider sx={{ opacity: 0.07 }} />
      <Box 
        sx={{ 
          p: 3, 
          textAlign: 'center',
          opacity: 0.7
        }}
      >
        <Typography variant="caption" display="block" sx={{ fontSize: '0.75rem' }}>
          Version 1.0.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: scrolled 
            ? alpha(theme.palette.background.default, 0.8) 
            : 'transparent',
          backdropFilter: scrolled ? 'blur(10px)' : 'none',
          borderBottom: scrolled ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : 'none',
          boxShadow: scrolled ? `0 4px 20px ${alpha('#000', 0.08)}` : 'none',
          transition: 'all 0.3s ease',
        }}
      >
        <Toolbar sx={{ px: { xs: 2, sm: 3 } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box 
            component="img"
            src={TensorStaxLogo}
            alt="TensorStax Logo"
            sx={{ 
              height: 32,
              width: 'auto',
              display: { xs: 'block', md: 'none' },
              mr: 1
            }}
          />
          <Typography
            variant="subtitle1"
            sx={{ 
              display: { xs: 'block', md: 'none' },
              fontWeight: 600,
              fontSize: '1rem',
              color: 'white',
              letterSpacing: '-0.01em'
            }}
          >
            agenttrace
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Avatar
            sx={{
              width: 34,
              height: 34,
              bgcolor: alpha(theme.palette.primary.main, 0.8),
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            TS
          </Avatar>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better performance on mobile
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              backgroundColor: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(10px)',
              border: 'none',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              backgroundColor: alpha(theme.palette.background.paper, 0.5),
              backdropFilter: 'blur(10px)',
              border: 'none', 
              borderRight: `1px solid ${alpha(theme.palette.divider, 0.075)}`,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Toolbar />
        <Box sx={{ py: 2, flexGrow: 1 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout; 
