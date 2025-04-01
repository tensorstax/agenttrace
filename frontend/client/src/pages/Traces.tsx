import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Chip,
  Stack,
  SelectChangeEvent,
  Tabs,
  Tab,
  DialogActions,
  DialogContentText,
  IconButton,
  Tooltip,
} from '@mui/material';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { format, parseISO } from 'date-fns';
import ViewListIcon from '@mui/icons-material/ViewList';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import DeleteIcon from '@mui/icons-material/Delete';
import { Trace } from '../types';
import { getTraces, getSessions, getTraceTypes, getTracedFunctions, getTags, deleteTrace } from '../services/api';
import DataTable from '../components/DataTable';
import JsonViewer from '../components/JsonViewer';
import TraceVisualizer from '../components/TraceVisualizer';
import LoadingIndicator from '../components/LoadingIndicator';

// Enum for view modes
enum ViewMode {
  JSON = 'json',
  VISUALIZATION = 'visualization'
}

// TabPanel component to show content based on selected tab
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`trace-tabpanel-${index}`}
      aria-labelledby={`trace-tab-${index}`}
      style={{ height: '100%' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ height: '100%', bgcolor: '#1E1E1E' }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const Traces: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [tabValue, setTabValue] = useState(1);
  const [expandJsonContent, setExpandJsonContent] = useState(false);
  
  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [traceToDelete, setTraceToDelete] = useState<Trace | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Filter options
  const [sessions, setSessions] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [functions, setFunctions] = useState<string[]>([]);
  const [tagsList, setTagsList] = useState<string[]>([]);
  
  // Filter values
  const [sessionFilter, setSessionFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [functionFilter, setFunctionFilter] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [limit, setLimit] = useState<number>(100);

  // Read URL parameters on component mount
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    
    // Check for session parameter (from Sessions page link)
    const sessionParam = queryParams.get('session');
    if (sessionParam) {
      setSessionFilter(sessionParam);
    }
    
    // Check for other filter parameters
    const typeParam = queryParams.get('type');
    if (typeParam) {
      setTypeFilter(typeParam);
    }
    
    const functionParam = queryParams.get('function');
    if (functionParam) {
      setFunctionFilter(functionParam);
    }
    
    const tagParam = queryParams.get('tag');
    if (tagParam) {
      setTagFilter(tagParam);
    }
    
    const limitParam = queryParams.get('limit');
    if (limitParam && !isNaN(parseInt(limitParam))) {
      setLimit(parseInt(limitParam));
    }
  }, []);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [sessionsResponse, typesResponse, functionsResponse, tagsResponse] = await Promise.all([
          getSessions(),
          getTraceTypes(),
          getTracedFunctions(),
          getTags(),
        ]);

        setSessions(sessionsResponse.sessions);
        setTypes(typesResponse.types);
        setFunctions(functionsResponse.functions);
        setTagsList(tagsResponse.tags);
      } catch (error) {
        console.error('Error fetching filter options:', error);
      }
    };

    fetchFilterOptions();
  }, []);

  useEffect(() => {
    const fetchTraces = async () => {
      try {
        setLoading(true);
        const response = await getTraces(
          limit,
          typeFilter || undefined,
          tagFilter || undefined,
          functionFilter || undefined,
          sessionFilter || undefined
        );
        setTraces(response.traces);
      } catch (error) {
        console.error('Error fetching traces:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTraces();
  }, [sessionFilter, typeFilter, functionFilter, tagFilter, limit]);

  const handleSessionChange = (event: SelectChangeEvent) => {
    setSessionFilter(event.target.value);
  };

  const handleTypeChange = (event: SelectChangeEvent) => {
    setTypeFilter(event.target.value);
  };

  const handleFunctionChange = (event: SelectChangeEvent) => {
    setFunctionFilter(event.target.value);
  };

  const handleTagChange = (event: SelectChangeEvent) => {
    setTagFilter(event.target.value);
  };

  const handleLimitChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value > 0) {
      setLimit(value);
    }
  };

  const handleViewDetails = (trace: Trace) => {
    setSelectedTrace(trace);
    setOpenDialog(true);
    // Make sure the JSON tab is always shown by default
    setTabValue(1);
    // Trigger JSON expansion for visibility
    setExpandJsonContent(prev => !prev);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Handle delete confirmation dialog open
  const handleDeleteClick = (trace: Trace, event: React.MouseEvent) => {
    event.stopPropagation();
    setTraceToDelete(trace);
    setDeleteDialogOpen(true);
  };

  // Handle delete confirmation dialog close
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setTraceToDelete(null);
  };

  // Handle trace deletion
  const handleDeleteConfirm = async () => {
    if (!traceToDelete) return;
    
    try {
      setDeleteLoading(true);
      const response = await deleteTrace(traceToDelete.id);
      
      if (response.success) {
        // Remove deleted trace from state
        setTraces(prevTraces => prevTraces.filter(trace => trace.id !== traceToDelete.id));
        handleDeleteDialogClose();
      } else {
        console.error('Failed to delete trace:', response.error);
        // Could add error handling UI here
      }
    } catch (error) {
      console.error('Error deleting trace:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSessionFilter('');
    setTypeFilter('');
    setFunctionFilter('');
    setTagFilter('');
    setLimit(100);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    
    // Trigger JSON expansion when switching to JSON tab
    if (newValue === 1) {
      setExpandJsonContent(prev => !prev); // Toggle to trigger useEffect
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 250, flex: 0.5 },
    { 
      field: 'timestamp', 
      headerName: 'Timestamp', 
      width: 180, 
      flex: 0.5,
      renderCell: (params: GridRenderCellParams<Trace>) => {
        const date = parseISO(params.row.timestamp);
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="body2" fontWeight="medium">
              {format(date, 'MMM d, yyyy')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {format(date, 'h:mm:ss a')}
            </Typography>
          </Box>
        );
      }
    },
    { 
      field: 'session_id', 
      headerName: 'Session ID', 
      width: 180,
      flex: 0.5,
      renderCell: (params: GridRenderCellParams<Trace>) => {
        const sessionId = params.value as string;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography 
              variant="body2" 
              sx={{ 
                fontFamily: 'monospace',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.825rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '160px'
              }}
            >
              {sessionId}
            </Typography>
          </Box>
        );
      }
    },
    { field: 'function', headerName: 'Function', width: 200, flex: 0.5 },
    { 
      field: 'type', 
      headerName: 'Type', 
      width: 120,
      renderCell: (params: GridRenderCellParams<Trace>) => {
        const type = params.value as string;
        
        // Check if the type is "COMPLETE" to apply special styling
        if (type?.toUpperCase() === "COMPLETE") {
          return (
            <Box
              sx={{
                backgroundColor: '#1e1e1e',
                color: '#66ff66',
                borderRadius: '16px',
                px: 1.8,
                py: 0.6,
                fontSize: '0.8rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                border: '1px solid',
                borderColor: '#66ff66',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '100px',
                maxHeight: '28px',
                boxSizing: 'border-box'
              }}
            >
              <Box 
                component="span" 
                sx={{ 
                  width: 12, 
                  height: 12, 
                  borderRadius: '50%', 
                  bgcolor: '#66ff66',
                  mr: 0.8,
                  display: 'inline-block',
                  marginTop: '-1px'
                }} 
              />
              {type}
            </Box>
          );
        }
        
        // For other types, return with default styling
        return (
          <Typography variant="body2">
            {type}
          </Typography>
        );
      }
    },
    { 
      field: 'duration_ms', 
      headerName: 'Duration (ms)', 
      type: 'number', 
      width: 150,
      renderCell: (params: GridRenderCellParams<Trace>) => {
        const duration = params.value as number;
        
        // Format with thousands separator and improve presentation
        if (duration === undefined || duration === null) {
          return <Typography variant="body2">—</Typography>;
        }
        
        // Format the number with thousand separators
        const formattedDuration = duration.toLocaleString();
        
        // Determine styling based on duration
        let color = 'text.primary';
        let weight = 'normal';
        
        if (duration > 5000) {
          color = 'error.main';
          weight = 'medium';
        } else if (duration > 1000) {
          color = 'warning.main';
          weight = 'medium';
        }
        
        return (
          <Typography 
            variant="body2" 
            sx={{ 
              color, 
              fontWeight: weight,
              fontFamily: 'monospace',
              fontSize: '0.875rem'
            }}
          >
            {formattedDuration}
          </Typography>
        );
      }
    },
    { 
      field: 'tags', 
      headerName: 'Tags', 
      width: 200,
      flex: 0.5,
      renderCell: (params: GridRenderCellParams<Trace>) => {
        const tags = params.row.tags;
        return (
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            {tags && Array.isArray(tags) && tags.map((tag, index) => {
              // Determine chip color based on tag content
              let chipColor: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" = "default";
              let chipVariant: "filled" | "outlined" = "outlined";
              
              // Convert tag to lowercase for case-insensitive comparison
              const tagLower = tag.toLowerCase();
              
              if (tagLower === 'complete' || tagLower === 'completed') {
                chipColor = "success";
                chipVariant = "filled";
              } else if (tagLower === 'error' || tagLower === 'failed') {
                chipColor = "error";
                chipVariant = "filled";
              } else if (tagLower === 'warning') {
                chipColor = "warning";
                chipVariant = "filled";
              } else if (tagLower === 'info') {
                chipColor = "info";
                chipVariant = "filled";
              } else if (tagLower === 'pending' || tagLower === 'in progress') {
                chipColor = "primary";
                chipVariant = "filled";
              }
              
              return (
                <Chip 
                  key={index} 
                  label={tag} 
                  size="small"
                  color={chipColor}
                  variant={chipVariant}
                  sx={{
                    fontWeight: chipVariant === 'filled' ? 500 : 400,
                    height: '22px',
                    '& .MuiChip-label': {
                      px: 1,
                      fontSize: '0.75rem'
                    }
                  }}
                />
              );
            })}
          </Stack>
        );
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      renderCell: (params: GridRenderCellParams<Trace>) => {
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleViewDetails(params.row)}
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.23)',
                color: 'white',
                '&:hover': {
                  borderColor: '#FF6325',
                  backgroundColor: 'rgba(255, 99, 37, 0.08)'
                }
              }}
            >
              View
            </Button>
            <Tooltip title="Delete trace">
              <IconButton
                size="small"
                onClick={(event) => handleDeleteClick(params.row, event)}
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&:hover': {
                    color: '#f44336',
                    backgroundColor: 'rgba(244, 67, 54, 0.08)'
                  }
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Traces
      </Typography>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>
        <Grid container spacing={3} alignItems="center">
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4', lg: 'span 3' } }}>
            <FormControl fullWidth size="small">
              <InputLabel id="session-select-label">Session</InputLabel>
              <Select
                labelId="session-select-label"
                id="session-select"
                value={sessionFilter}
                label="Session"
                onChange={handleSessionChange}
                sx={{ minWidth: '220px' }}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {sessions.map((session) => (
                  <MenuItem key={session} value={session}>
                    {session}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4', lg: 'span 3' } }}>
            <FormControl fullWidth size="small">
              <InputLabel id="type-select-label">Type</InputLabel>
              <Select
                labelId="type-select-label"
                id="type-select"
                value={typeFilter}
                label="Type"
                onChange={handleTypeChange}
                sx={{ minWidth: '220px' }}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {types.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4', lg: 'span 3' } }}>
            <FormControl fullWidth size="small">
              <InputLabel id="function-select-label">Function</InputLabel>
              <Select
                labelId="function-select-label"
                id="function-select"
                value={functionFilter}
                label="Function"
                onChange={handleFunctionChange}
                sx={{ minWidth: '220px' }}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {functions.map((func) => (
                  <MenuItem key={func} value={func}>
                    {func}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4', lg: 'span 3' } }}>
            <FormControl fullWidth size="small">
              <InputLabel id="tag-select-label">Tag</InputLabel>
              <Select
                labelId="tag-select-label"
                id="tag-select"
                value={tagFilter}
                label="Tag"
                onChange={handleTagChange}
                sx={{ minWidth: '220px' }}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {tagsList.map((tag) => (
                  <MenuItem key={tag} value={tag}>
                    {tag}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4', lg: 'span 3' } }}>
            <TextField
              fullWidth
              label="Limit"
              type="number"
              size="small"
              value={limit}
              onChange={handleLimitChange}
              InputProps={{ inputProps: { min: 1 } }}
              sx={{ minWidth: '220px' }}
            />
          </Grid>
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4', lg: 'span 3' } }}>
            <Button
              variant="outlined"
              onClick={handleResetFilters}
              fullWidth
              sx={{ 
                height: '40px', 
                minWidth: '220px',
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

      {loading ? (
        <LoadingIndicator />
      ) : (
        <DataTable 
          rows={traces} 
          columns={columns} 
          height={600}
          initialState={{
            columns: {
              columnVisibilityModel: {
                id: false,
              },
            },
          }}
        />
      )}

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="xl"
        scroll="paper"
        PaperProps={{
          sx: {
            bgcolor: '#1E1E1E', // Changed from #0a0a0a to #1E1E1E
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            color: 'white',
            height: '90vh', // Set a fixed height for the dialog
          }
        }}
        BackdropProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
          }
        }}
        sx={{
          '& .MuiDialog-paper': {
            backdropFilter: 'blur(20px)',
          },
          '& .MuiBackdrop-root': {
            backdropFilter: 'none',
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          color: 'white',
          py: 2,
          bgcolor: '#1E1E1E', // Changed from #0a0a0a to #1E1E1E
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6">
              Trace Details
              {selectedTrace && (
                <Typography variant="subtitle2" color="rgba(255, 255, 255, 0.7)" sx={{ mt: 0.5 }}>
                  {selectedTrace.function} - {format(parseISO(selectedTrace.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                </Typography>
              )}
            </Typography>
          </Box>
          
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            aria-label="trace view tabs"
            sx={{ 
              minHeight: '42px',
              '& .MuiTabs-flexContainer': {
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              },
              '& .MuiTab-root': { 
                minHeight: '42px',
                color: 'rgba(255, 255, 255, 0.7)',
                '&.Mui-selected': {
                  color: 'white',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#FF6325',
                height: 3,
              }
            }}
          >
            <Tab 
              icon={<AccountTreeIcon fontSize="small" />} 
              iconPosition="start" 
              label="Visualization" 
              id="trace-tab-0"
              aria-controls="trace-tabpanel-0"
            />
            <Tab 
              icon={<ViewListIcon fontSize="small" />} 
              iconPosition="start" 
              label="JSON View" 
              id="trace-tab-1"
              aria-controls="trace-tabpanel-1"
            />
          </Tabs>
        </DialogTitle>
        
        <DialogContent
          sx={{ 
            p: 0, // Remove padding to allow tabs to fill content area
            bgcolor: '#1E1E1E', // Changed from #0a0a0a to #1E1E1E
            '& .MuiTypography-root': {
              color: 'rgba(255, 255, 255, 0.9)'
            },
            '& strong': {
              color: 'white'
            },
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100% - 124px)', // Adjust height to account for dialog title
          }}
        >
          {selectedTrace && (
            <>
              <TabPanel value={tabValue} index={0}>
                <Box sx={{ p: 3, height: '100%' }}>
                  <TraceVisualizer 
                    data={selectedTrace} 
                    title={`Trace Visualization: ${selectedTrace.function}`} 
                  />
                </Box>
              </TabPanel>
              
              <TabPanel value={tabValue} index={1}>
                <Box sx={{ p: 3, height: '100%', overflow: 'auto', bgcolor: '#1E1E1E' }}>
                  <Typography variant="h6" gutterBottom>
                    Basic Information
                  </Typography>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                      <Typography variant="body1">
                        <strong>Session ID:</strong> {selectedTrace.session_id}
                      </Typography>
                    </Grid>
                    <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                      <Typography variant="body1">
                        <strong>Type:</strong> {selectedTrace.type}
                      </Typography>
                    </Grid>
                    <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                      <Typography variant="body1">
                        <strong>Duration:</strong> {selectedTrace.duration_ms ? `${selectedTrace.duration_ms} ms` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                      <Typography variant="body1">
                        <strong>Tags:</strong>{' '}
                        {selectedTrace.tags && selectedTrace.tags.length > 0
                          ? selectedTrace.tags.join(', ')
                          : 'None'}
                      </Typography>
                    </Grid>
                  </Grid>

                  {selectedTrace.args && (
                    <JsonViewer 
                      data={selectedTrace.args} 
                      title="Arguments" 
                      defaultExpanded={true} 
                    />
                  )}

                  {selectedTrace.kwargs && (
                    <JsonViewer 
                      data={selectedTrace.kwargs} 
                      title="Keyword Arguments" 
                      defaultExpanded={true} 
                    />
                  )}

                  {selectedTrace.result && (
                    <JsonViewer 
                      data={selectedTrace.result} 
                      title="Result" 
                      defaultExpanded={true} 
                    />
                  )}

                  <JsonViewer 
                    data={selectedTrace} 
                    title="Full Trace Data" 
                    defaultExpanded={true} 
                  />
                </Box>
              </TabPanel>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this trace? This action cannot be undone.
          </DialogContentText>
          {traceToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0, 0, 0, 0.04)', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>ID:</strong> {traceToDelete.id}
              </Typography>
              <Typography variant="body2">
                <strong>Function:</strong> {traceToDelete.function}
              </Typography>
              <Typography variant="body2">
                <strong>Type:</strong> {traceToDelete.type}
              </Typography>
              <Typography variant="body2">
                <strong>Session:</strong> {traceToDelete.session_id}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleDeleteDialogClose} 
            color="primary"
            disabled={deleteLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={deleteLoading}
          >
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Traces; 