import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Card, 
  CardContent, 
  CardActions, 
  Button, 
  Divider, 
  alpha,
  TextField,
  Snackbar,
  Alert,
  IconButton
} from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';
import PeopleIcon from '@mui/icons-material/People';
import BarChartIcon from '@mui/icons-material/BarChart';
import FunctionsIcon from '@mui/icons-material/Functions';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import LoadingIndicator from '../components/LoadingIndicator';
import OverviewChart from '../components/OverviewChart';

import {
  getSessions,
  getTraceTypes,
  getTracedFunctions,
  getTags,
  getEvalNames,
  getDbPath,
  updateDbPath,
} from '../services/api';

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    sessions: 0,
    functions: 0,
    tags: 0,
    evalNames: 0,
  });
  
  const [dbPath, setDbPath] = useState('');
  const [isPathUpdating, setIsPathUpdating] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error'>('success');
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [sessionsResponse, functionsResponse, tagsResponse, evalNamesResponse, dbPathResponse] =
          await Promise.all([
            getSessions(),
            getTracedFunctions(),
            getTags(),
            getEvalNames(),
            getDbPath(),
          ]);

        setStats({
          sessions: sessionsResponse.count,
          functions: functionsResponse.count,
          tags: tagsResponse.count,
          evalNames: evalNamesResponse.count,
        });
        
        setDbPath(dbPathResponse.path);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setAlertMessage('Error loading dashboard data');
        setAlertSeverity('error');
        setShowAlert(true);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);
  
  const handleDbPathChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDbPath(event.target.value);
  };
  
  const handleDbPathSave = async () => {
    try {
      setIsPathUpdating(true);
      await updateDbPath(dbPath);
      setAlertMessage('Database path updated successfully');
      setAlertSeverity('success');
      setShowAlert(true);
    } catch (error) {
      console.error('Error updating database path:', error);
      setAlertMessage('Error updating database path');
      setAlertSeverity('error');
      setShowAlert(true);
    } finally {
      setIsPathUpdating(false);
    }
  };
  
  const handleAlertClose = () => {
    setShowAlert(false);
  };
  
  const refreshData = () => {
    setLoading(true);
    const fetchDashboardData = async () => {
      try {
        const [sessionsResponse, functionsResponse, tagsResponse, evalNamesResponse, dbPathResponse] =
          await Promise.all([
            getSessions(),
            getTracedFunctions(),
            getTags(),
            getEvalNames(),
            getDbPath(),
          ]);

        setStats({
          sessions: sessionsResponse.count,
          functions: functionsResponse.count,
          tags: tagsResponse.count,
          evalNames: evalNamesResponse.count,
        });
        
        setDbPath(dbPathResponse.path);
        setAlertMessage('Data refreshed successfully');
        setAlertSeverity('success');
        setShowAlert(true);
      } catch (error) {
        console.error('Error refreshing dashboard data:', error);
        setAlertMessage('Error refreshing data');
        setAlertSeverity('error');
        setShowAlert(true);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  };

  if (loading) {
    return <LoadingIndicator message="Loading dashboard data..." />;
  }

  return (
    <Box sx={{ maxWidth: '1200px', mx: 'auto', px: { xs: 2, sm: 3 } }}>
      <Typography 
        variant="h4" 
        gutterBottom 
        sx={{ 
          fontWeight: 600,
          fontSize: { xs: '1.75rem', md: '2.25rem' },
          letterSpacing: '-0.025em',
          mb: 2,
          mt: 1
        }}
      >
        Dashboard
      </Typography>
      
      {/* Database Path Section */}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          mb: 2,
          width: '100%'
        }}
      >
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 600,
            fontSize: { xs: '1.25rem', md: '1.5rem' },
            letterSpacing: '-0.01em',
            mr: 2.5,
            opacity: 0.9
          }}
        >
          Database Settings
        </Typography>
        <Divider 
          sx={{ 
            flexGrow: 1,
            opacity: 0.1
          }} 
        />
      </Box>
      
      <Box 
        sx={{ 
          mb: 4,
          p: 3,
          borderRadius: 3,
          border: '1px solid rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(25, 25, 25, 0.6)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <TextField
            label="Database Path"
            variant="outlined"
            fullWidth
            value={dbPath}
            onChange={handleDbPathChange}
            sx={{ 
              flexGrow: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleDbPathSave}
            disabled={isPathUpdating}
            sx={{ 
              height: 56,
              borderRadius: 2,
              px: 3
            }}
          >
            Save
          </Button>
          <IconButton
            color="primary"
            onClick={refreshData}
            disabled={loading}
            sx={{ 
              height: 56,
              width: 56,
              borderRadius: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
          Enter the absolute path to your SQLite database file
        </Typography>
      </Box>

      {/* Main chart section */}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          mb: 2,
          width: '100%'
        }}
      >
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 600,
            fontSize: { xs: '1.25rem', md: '1.5rem' },
            letterSpacing: '-0.01em',
            mr: 2.5,
            opacity: 0.9
          }}
        >
          Performance Overview
        </Typography>
        <Divider 
          sx={{ 
            flexGrow: 1,
            opacity: 0.1
          }} 
        />
      </Box>
      
      <Box sx={{ mb: 3, width: '100%' }}>
        <OverviewChart />
      </Box>

      {/* Key stats cards - subtitle with divider */}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          mb: 2,
          width: '100%'
        }}
      >
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 600,
            fontSize: { xs: '1.25rem', md: '1.5rem' },
            letterSpacing: '-0.01em',
            mr: 2.5,
            opacity: 0.9
          }}
        >
          Key Statistics
        </Typography>
        <Divider 
          sx={{ 
            flexGrow: 1,
            opacity: 0.1
          }} 
        />
      </Box>

      {/* Key stats cards - changed to match OverviewChart width */}
      <Box sx={{ mb: 3, width: '100%' }}>
        <Grid container spacing={2}>
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 3' } }}>
            <Card 
              elevation={0}
              sx={{ 
                height: '100%', 
                borderRadius: 3,
                border: '1px solid rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                backgroundColor: 'rgba(25, 25, 25, 0.6)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                  backgroundColor: 'rgba(30, 30, 30, 0.7)',
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <TimelineIcon color="primary" sx={{ fontSize: 34, mb: 1, opacity: 0.9 }} />
                <Typography 
                  variant="h3" 
                  component="div" 
                  sx={{ 
                    fontSize: '2.25rem',
                    fontWeight: 600,
                    letterSpacing: '-0.025em',
                    my: 0.75
                  }}
                >
                  {stats.sessions}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ 
                    fontSize: '0.925rem',
                    fontWeight: 500,
                    opacity: 0.8
                  }}
                >
                  Trace Sessions
                </Typography>
              </CardContent>
              <Divider sx={{ opacity: 0.06 }} />
              <CardActions sx={{ px: 3, pb: 2, pt: 1 }}>
                <Button 
                  component={Link} 
                  to="/sessions"
                  sx={{ 
                    fontWeight: 500,
                    textTransform: 'none',
                    fontSize: '0.875rem'
                  }}
                >
                  View Sessions
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 3' } }}>
            <Card 
              elevation={0}
              sx={{ 
                height: '100%', 
                borderRadius: 3,
                border: '1px solid rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                backgroundColor: 'rgba(25, 25, 25, 0.6)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                  backgroundColor: 'rgba(30, 30, 30, 0.7)',
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <FunctionsIcon color="secondary" sx={{ fontSize: 34, mb: 1, opacity: 0.9 }} />
                <Typography 
                  variant="h3" 
                  component="div" 
                  sx={{ 
                    fontSize: '2.25rem',
                    fontWeight: 600,
                    letterSpacing: '-0.025em',
                    my: 0.75
                  }}
                >
                  {stats.functions}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ 
                    fontSize: '0.925rem',
                    fontWeight: 500,
                    opacity: 0.8
                  }}
                >
                  Functions Traced
                </Typography>
              </CardContent>
              <Divider sx={{ opacity: 0.06 }} />
              <CardActions sx={{ px: 3, pb: 2, pt: 1 }}>
                <Button 
                  component={Link} 
                  to="/traces"
                  sx={{ 
                    fontWeight: 500,
                    textTransform: 'none',
                    fontSize: '0.875rem'
                  }}
                >
                  View Traces
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 3' } }}>
            <Card 
              elevation={0}
              sx={{ 
                height: '100%', 
                borderRadius: 3,
                border: '1px solid rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                backgroundColor: 'rgba(25, 25, 25, 0.6)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                  backgroundColor: 'rgba(30, 30, 30, 0.7)',
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <PeopleIcon color="success" sx={{ fontSize: 34, mb: 1, opacity: 0.9 }} />
                <Typography 
                  variant="h3" 
                  component="div" 
                  sx={{ 
                    fontSize: '2.25rem',
                    fontWeight: 600,
                    letterSpacing: '-0.025em',
                    my: 0.75
                  }}
                >
                  {stats.tags}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ 
                    fontSize: '0.925rem',
                    fontWeight: 500,
                    opacity: 0.8
                  }}
                >
                  Unique Tags
                </Typography>
              </CardContent>
              <Divider sx={{ opacity: 0.06 }} />
              <CardActions sx={{ px: 3, pb: 2, pt: 1 }}>
                <Button 
                  component={Link} 
                  to="/traces"
                  sx={{ 
                    fontWeight: 500,
                    textTransform: 'none',
                    fontSize: '0.875rem'
                  }}
                >
                  View Traces
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 3' } }}>
            <Card 
              elevation={0}
              sx={{ 
                height: '100%', 
                borderRadius: 3,
                border: '1px solid rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                backgroundColor: 'rgba(25, 25, 25, 0.6)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                  backgroundColor: 'rgba(30, 30, 30, 0.7)',
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <BarChartIcon color="info" sx={{ fontSize: 34, mb: 1, opacity: 0.9 }} />
                <Typography 
                  variant="h3" 
                  component="div" 
                  sx={{ 
                    fontSize: '2.25rem',
                    fontWeight: 600,
                    letterSpacing: '-0.025em',
                    my: 0.75
                  }}
                >
                  {stats.evalNames}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ 
                    fontSize: '0.925rem',
                    fontWeight: 500,
                    opacity: 0.8
                  }}
                >
                  Evaluation Types
                </Typography>
              </CardContent>
              <Divider sx={{ opacity: 0.06 }} />
              <CardActions sx={{ px: 3, pb: 2, pt: 1 }}>
                <Button 
                  component={Link} 
                  to="/evaluations"
                  sx={{ 
                    fontWeight: 500,
                    textTransform: 'none',
                    fontSize: '0.875rem'
                  }}
                >
                  View Evaluations
                </Button>
              </CardActions>
            </Card>
          </Grid>

          {/* Snackbar for alerts */}
          <Snackbar
            open={showAlert}
            autoHideDuration={6000}
            onClose={handleAlertClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert 
              onClose={handleAlertClose} 
              severity={alertSeverity}
              sx={{ 
                width: '100%',
                borderRadius: 2
              }}
            >
              {alertMessage}
            </Alert>
          </Snackbar>
        </Grid>
      </Box>

      {/* Quick access panels - subtitle with divider */}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          mb: 2,
          width: '100%'
        }}
      >
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 600,
            fontSize: { xs: '1.25rem', md: '1.5rem' },
            letterSpacing: '-0.01em',
            mr: 2.5,
            opacity: 0.9
          }}
        >
          Quick Access
        </Typography>
        <Divider 
          sx={{ 
            flexGrow: 1,
            opacity: 0.1
          }} 
        />
      </Box>

      {/* Quick access panels - changed to match OverviewChart width */}
      <Box sx={{ mb: 3, width: '100%' }}>
        <Grid container spacing={2}>
          <Grid sx={{ gridColumn: { xs: 'span 12' } }}>
            <Paper 
              elevation={0}
              sx={{ 
                p: { xs: 3, md: 3.5 }, 
                borderRadius: 3,
                border: '1px solid rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                backgroundColor: 'rgba(25, 25, 25, 0.5)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <Box>
                <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    mb: 1,
                    fontSize: '1.125rem'
                  }}
                >
                  Recent Traces
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ 
                    lineHeight: 1.6,
                    opacity: 0.85,
                    mb: 3
                  }}
                >
                  View all trace data with filtering by session, function, type, and tags.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                component={Link}
                to="/traces"
                sx={{ 
                  alignSelf: 'flex-start',
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                  pl: 3,
                  pr: 3
                }}
              >
                View Traces
              </Button>
            </Paper>
          </Grid>

          <Grid sx={{ gridColumn: { xs: 'span 12' } }}>
            <Paper 
              elevation={0}
              sx={{ 
                p: { xs: 3, md: 3.5 }, 
                borderRadius: 3,
                border: '1px solid rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                backgroundColor: 'rgba(25, 25, 25, 0.5)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <Box>
                <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    mb: 1,
                    fontSize: '1.125rem'
                  }}
                >
                  Evaluation Results
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ 
                    lineHeight: 1.6,
                    opacity: 0.85,
                    mb: 3
                  }}
                >
                  View all evaluation results, including performance metrics and detailed events.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                component={Link}
                to="/evaluations"
                sx={{ 
                  alignSelf: 'flex-start',
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                  pl: 3,
                  pr: 3
                }}
              >
                View Evaluations
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default Dashboard; 