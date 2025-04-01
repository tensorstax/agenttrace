import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Stack,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  IconButton,
  Tooltip,
} from '@mui/material';
import { GridColDef, GridRenderCellParams, GridRowModel } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { getSessions, getTraces, deleteSession } from '../services/api';
import { Trace } from '../types';
import LoadingIndicator from '../components/LoadingIndicator';
import DataTable from '../components/DataTable';

interface SessionData {
  id: string;
  firstTrace?: Trace;
  lastTrace?: Trace;
  traceCount: number;
  types: Set<string>;
  functions: Set<string>;
  tags: Set<string>;
  firstTimestamp?: string;
  lastTimestamp?: string;
  typesArray?: string[];
  functionsArray?: string[];
  tagsArray?: string[];
}

const Sessions: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [sessionsData, setSessionsData] = useState<SessionData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [functionFilter, setFunctionFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [allFunctions, setAllFunctions] = useState<string[]>([]);
  const [allTypes, setAllTypes] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  
  // State for deletion
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const response = await getSessions();

        // For each session, get the first few traces to display metadata
        const sessionDataPromises = response.sessions.map(async (sessionId) => {
          const tracesResponse = await getTraces(10, undefined, undefined, undefined, sessionId);
          const traces = tracesResponse.traces;

          const types = new Set<string>();
          const functions = new Set<string>();
          const tags = new Set<string>();

          traces.forEach((trace) => {
            types.add(trace.type);
            functions.add(trace.function);
            if (trace.tags) {
              trace.tags.forEach((tag) => tags.add(tag));
            }
          });

          return {
            id: sessionId,
            firstTrace: traces.length > 0 ? traces[traces.length - 1] : undefined, // Assuming ordered by timestamp desc
            lastTrace: traces.length > 0 ? traces[0] : undefined,
            traceCount: tracesResponse.count,
            types,
            functions,
            tags,
            firstTimestamp: traces.length > 0 ? traces[traces.length - 1].timestamp : undefined,
            lastTimestamp: traces.length > 0 ? traces[0].timestamp : undefined,
            typesArray: Array.from(types),
            functionsArray: Array.from(functions),
            tagsArray: Array.from(tags),
          };
        });

        const sessionsWithData = await Promise.all(sessionDataPromises);
        setSessionsData(sessionsWithData);
        
        // Extract all unique functions, types, and tags for filters
        const allFunctionsSet = new Set<string>();
        const allTypesSet = new Set<string>();
        const allTagsSet = new Set<string>();
        
        sessionsWithData.forEach(session => {
          session.functionsArray?.forEach(func => allFunctionsSet.add(func));
          session.typesArray?.forEach(type => allTypesSet.add(type));
          session.tagsArray?.forEach(tag => allTagsSet.add(tag));
        });
        
        setAllFunctions(Array.from(allFunctionsSet));
        setAllTypes(Array.from(allTypesSet));
        setAllTags(Array.from(allTagsSet));
      } catch (error) {
        console.error('Error fetching sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const filteredSessions = sessionsData.filter((session) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      session.id.toLowerCase().includes(searchLower) ||
      Array.from(session.functionsArray || []).some((func) => func.toLowerCase().includes(searchLower)) ||
      Array.from(session.tagsArray || []).some((tag) => tag.toLowerCase().includes(searchLower));
      
    const matchesFunction = !functionFilter || session.functionsArray?.includes(functionFilter);
    const matchesType = !typeFilter || session.typesArray?.includes(typeFilter);
    const matchesTag = !tagFilter || session.tagsArray?.includes(tagFilter);
    
    return matchesSearch && matchesFunction && matchesType && matchesTag;
  });

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleFunctionFilterChange = (event: SelectChangeEvent) => {
    setFunctionFilter(event.target.value);
  };

  const handleTypeFilterChange = (event: SelectChangeEvent) => {
    setTypeFilter(event.target.value);
  };

  const handleTagFilterChange = (event: SelectChangeEvent) => {
    setTagFilter(event.target.value);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFunctionFilter('');
    setTypeFilter('');
    setTagFilter('');
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      setDeleteLoading(true);
      setSnackbarOpen(false); // Close any existing snackbar
      
      if (!sessionId) {
        setSnackbarMessage('Session ID is missing');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }
      
      console.log(`Attempting to delete session: ${sessionId}`);
      const response = await deleteSession(sessionId);
      
      if (response.success) {
        // Always filter the session from UI even if it wasn't found in the database
        // This ensures the UI stays in sync with the database state
        setSessionsData(sessionsData.filter(s => s.id !== sessionId));
        
        // Show a success message based on whether the session existed
        setSnackbarMessage(response.message || `Session ${sessionId.substring(0, 8)}... and related data deleted successfully`);
        setSnackbarSeverity('success');
        
        // Log the details for debugging
        console.log('Deletion response:', {
          sessionId,
          ...response
        });
      } else {
        console.error('Error response from server:', response);
        setSnackbarMessage(response.error || 'Failed to delete session');
        setSnackbarSeverity('error');
      }
    } catch (error: any) {
      // More comprehensive error logging
      console.error('Exception during session deletion:', error);
      
      // Check for specific error types
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        
        const errorMessage = error.response.data?.error || 
                          error.response.data?.message || 
                          `Server error: ${error.response.status}`;
        setSnackbarMessage(errorMessage);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error request:', error.request);
        setSnackbarMessage('No response received from server. Check your network connection.');
      } else {
        // Something happened in setting up the request that triggered an Error
        const errorMessage = error.message || 
                          'An unexpected error occurred while deleting the session';
        setSnackbarMessage(errorMessage);
      }
      
      setSnackbarSeverity('error');
    } finally {
      setDeleteLoading(false);
      setDeleteConfirmOpen(false); // Always close the dialog when done
      setSnackbarOpen(true);
      setSessionToDelete(null);
    }
  };

  if (loading) {
    return <LoadingIndicator message="Loading sessions..." />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: 'white' }}>
        Sessions
      </Typography>

      <Paper sx={{ 
        p: 2.5, 
        mb: 3, 
        borderRadius: 2, 
        bgcolor: '#121212',
      }}>
        <Typography variant="h6" gutterBottom sx={{ color: 'white', fontWeight: 500, mb: 1.5 }}>
          Filters
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3} lg={2.4}>
            <TextField
              fullWidth
              placeholder="Search by ID, function, or tag..."
              value={searchTerm}
              onChange={handleSearchChange}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                  </InputAdornment>
                ),
                sx: { color: 'white' }
              }}
              variant="outlined"
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.25)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
                '& input::placeholder': {
                  color: 'rgba(255, 255, 255, 0.5)',
                  opacity: 1,
                },
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3} lg={2.4}>
            <FormControl fullWidth size="small">
              <InputLabel id="function-select-label">Function</InputLabel>
              <Select
                labelId="function-select-label"
                id="function-select"
                value={functionFilter}
                label="Function"
                onChange={handleFunctionFilterChange}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: 'rgba(30, 30, 30, 0.85)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
                      maxHeight: '300px'
                    }
                  }
                }}
              >
                <MenuItem value="">
                  <em>All Functions</em>
                </MenuItem>
                {allFunctions.map((func) => (
                  <MenuItem key={func} value={func}>
                    {func}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3} lg={2.4}>
            <FormControl fullWidth size="small">
              <InputLabel id="type-select-label">Type</InputLabel>
              <Select
                labelId="type-select-label"
                id="type-select"
                value={typeFilter}
                label="Type"
                onChange={handleTypeFilterChange}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: 'rgba(30, 30, 30, 0.85)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
                      maxHeight: '300px'
                    }
                  }
                }}
              >
                <MenuItem value="">
                  <em>All Types</em>
                </MenuItem>
                {allTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3} lg={2.4}>
            <FormControl fullWidth size="small">
              <InputLabel id="tag-select-label">Tag</InputLabel>
              <Select
                labelId="tag-select-label"
                id="tag-select"
                value={tagFilter}
                label="Tag"
                onChange={handleTagFilterChange}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: 'rgba(30, 30, 30, 0.85)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
                      maxHeight: '300px'
                    }
                  }
                }}
              >
                <MenuItem value="">
                  <em>All Tags</em>
                </MenuItem>
                {allTags.map((tag) => (
                  <MenuItem key={tag} value={tag}>
                    {tag}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3} lg={2.4}>
            <Button
              variant="outlined"
              onClick={handleResetFilters}
              fullWidth
              size="small"
              sx={{ 
                height: '40px',
                borderColor: 'rgba(255, 255, 255, 0.23)',
                color: 'white',
                '&:hover': {
                  borderColor: '#FF6325',
                  backgroundColor: 'rgba(255, 99, 37, 0.08)'
                }
              }}
            >
              Reset Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ height: 650, width: '100%' }}>
        <DataTable
          rows={filteredSessions}
          columns={[
            { field: 'id', headerName: 'Session ID', width: 220, flex: 1 },
            { 
              field: 'firstTimestamp', 
              headerName: 'Start Time', 
              width: 170,
              renderCell: (params) => {
                if (!params.value) return "—";
                const date = parseISO(params.value as string);
                return (
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.85rem' }}>
                      {format(date, 'MMM d, yyyy')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      {format(date, 'h:mm:ss a')}
                    </Typography>
                  </Box>
                );
              }
            },
            { 
              field: 'lastTimestamp', 
              headerName: 'Last Activity', 
              width: 170,
              renderCell: (params) => {
                if (!params.value) return "—";
                const date = parseISO(params.value as string);
                return (
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.85rem' }}>
                      {format(date, 'MMM d, yyyy')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      {format(date, 'h:mm:ss a')}
                    </Typography>
                  </Box>
                );
              }
            },
            { 
              field: 'traceCount', 
              headerName: 'Traces', 
              width: 80,
              type: 'number',
              renderCell: (params) => {
                return (
                  <Chip 
                    label={params.value}
                    size="small"
                    sx={{ 
                      height: 22, 
                      minWidth: 32,
                      fontWeight: 500,
                      fontSize: '0.75rem',
                      bgcolor: 'rgba(255,255,255,0.05)',
                      color: 'rgba(255, 255, 255, 0.9)',
                      borderRadius: '11px'
                    }}
                  />
                );
              }
            },
            {
              field: 'typesArray',
              headerName: 'Types',
              width: 175,
              renderCell: (params) => {
                const types = params.value as string[] || [];
                return (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {types.slice(0, 2).map((type) => (
                      <Chip
                        key={type}
                        label={type}
                        size="small"
                        sx={{ 
                          height: 20, 
                          fontSize: '0.65rem',
                          bgcolor: 'rgba(255,99,37,0.1)',
                          color: '#FF6325',
                          '& .MuiChip-label': { px: 1 }
                        }}
                      />
                    ))}
                    {types.length > 2 && (
                      <Chip
                        label={`+${types.length - 2}`}
                        size="small"
                        sx={{ 
                          height: 20, 
                          fontSize: '0.65rem',
                          bgcolor: 'rgba(255,255,255,0.05)',
                          color: 'rgba(255, 255, 255, 0.7)',
                          '& .MuiChip-label': { px: 1 }
                        }}
                      />
                    )}
                  </Box>
                );
              }
            },
            {
              field: 'functionsArray',
              headerName: 'Functions',
              width: 180,
              renderCell: (params) => {
                const functions = params.value as string[] || [];
                return (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {functions.slice(0, 2).map((func) => (
                      <Chip
                        key={func}
                        label={func}
                        size="small"
                        sx={{ 
                          height: 20, 
                          fontSize: '0.65rem',
                          bgcolor: 'rgba(25,118,210,0.1)',
                          color: '#42a5f5',
                          '& .MuiChip-label': { px: 1 }
                        }}
                      />
                    ))}
                    {functions.length > 2 && (
                      <Chip
                        label={`+${functions.length - 2}`}
                        size="small"
                        sx={{ 
                          height: 20, 
                          fontSize: '0.65rem',
                          bgcolor: 'rgba(255,255,255,0.05)',
                          color: 'rgba(255, 255, 255, 0.7)',
                          '& .MuiChip-label': { px: 1 }
                        }}
                      />
                    )}
                  </Box>
                );
              }
            },
            {
              field: 'tagsArray',
              headerName: 'Tags',
              width: 180,
              renderCell: (params) => {
                const tags = params.value as string[] || [];
                if (tags.length === 0) return "—";
                
                return (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {tags.slice(0, 2).map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        sx={{ 
                          height: 20, 
                          fontSize: '0.65rem',
                          bgcolor: 'rgba(156,39,176,0.1)',
                          color: '#ba68c8',
                          '& .MuiChip-label': { px: 1 }
                        }}
                      />
                    ))}
                    {tags.length > 2 && (
                      <Chip
                        label={`+${tags.length - 2}`}
                        size="small"
                        sx={{ 
                          height: 20, 
                          fontSize: '0.65rem',
                          bgcolor: 'rgba(255,255,255,0.05)',
                          color: 'rgba(255, 255, 255, 0.7)',
                          '& .MuiChip-label': { px: 1 }
                        }}
                      />
                    )}
                  </Box>
                );
              }
            },
            {
              field: 'actions',
              headerName: 'Actions',
              width: 170,
              sortable: false,
              renderCell: (params) => {
                return (
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      component={Link}
                      to={`/traces?session_id=${params.row.id}`}
                      sx={{
                        py: 0.3,
                        fontSize: '0.75rem',
                        borderColor: 'rgba(255, 255, 255, 0.23)',
                        color: 'white',
                        '&:hover': {
                          borderColor: '#FF6325',
                          backgroundColor: 'rgba(255, 99, 37, 0.08)'
                        }
                      }}
                    >
                      View Traces
                    </Button>
                    <IconButton 
                      aria-label="delete" 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSessionToDelete(params.row.id);
                        setDeleteConfirmOpen(true);
                      }}
                      sx={{ p: 0.5 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                );
              }
            },
          ]}
          height={600}
          initialState={{
            columns: {
              columnVisibilityModel: {},
            },
          }}
        />
      </Box>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => !deleteLoading && setDeleteConfirmOpen(false)}
        maxWidth="xs"
        PaperProps={{
          sx: {
            bgcolor: 'rgba(30, 30, 30, 0.85)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            color: 'white',
          }
        }}
        BackdropProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            backdropFilter: 'blur(4px)',
          }
        }}
      >
        <DialogTitle>
          Confirm Session Deletion
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Are you sure you want to delete this session? This will permanently remove:
            </Typography>
            
            <Box component="ul" sx={{ pl: 2 }}>
              <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                All traces related to this session
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                All evaluation results linked to this session
              </Typography>
              <Typography component="li" variant="body2">
                All evaluation events associated with this session
              </Typography>
            </Box>
            
            <Typography variant="body2" sx={{ mt: 2, color: 'error.light' }}>
              This action cannot be undone.
            </Typography>
          </Box>
          
          {deleteLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <Typography variant="body2" sx={{ mr: 2 }}>
                Deleting session data...
              </Typography>
              {/* Simple loading spinner */}
              <Box
                sx={{
                  display: 'inline-block',
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: 'currentColor',
                  borderRightColor: 'transparent',
                  animation: 'spin 1s linear infinite',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteConfirmOpen(false)} 
            disabled={deleteLoading}
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                color: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={() => {
              if (sessionToDelete) {
                handleDeleteSession(sessionToDelete);
                // Don't close the dialog here - close it after deletion completes
              }
            }}
            disabled={deleteLoading}
            sx={{
              backgroundColor: 'error.main',
              '&:hover': {
                backgroundColor: 'error.dark'
              },
              '&.Mui-disabled': {
                backgroundColor: 'rgba(211, 47, 47, 0.5)'
              }
            }}
          >
            {deleteLoading ? 'Deleting...' : 'Delete Session'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          '& .MuiPaper-root': {
            backdropFilter: 'blur(10px)',
            background: snackbarSeverity === 'success' 
              ? 'rgba(56, 142, 60, 0.85)' 
              : 'rgba(211, 47, 47, 0.85)',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)',
            border: '1px solid',
            borderColor: snackbarSeverity === 'success' 
              ? 'rgba(129, 199, 132, 0.5)' 
              : 'rgba(229, 115, 115, 0.5)',
            borderRadius: '8px',
          }
        }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Sessions; 