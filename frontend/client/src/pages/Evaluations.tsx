import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Tab,
  Tabs,
  CircularProgress,
  SelectChangeEvent,
  Chip,
  Tooltip,
  IconButton,
  DialogActions,
  Alert,
  Snackbar,
} from '@mui/material';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { format, parseISO } from 'date-fns';
import { 
  EvalResult, 
  EvalEvent 
} from '../types';
import { 
  getEvalResults, 
  getEvalEvents, 
  getEvalIds, 
  getEvalNames,
  deleteEval
} from '../services/api';
import DataTable from '../components/DataTable';
import JsonViewer from '../components/JsonViewer';
import LoadingIndicator from '../components/LoadingIndicator';
import ToolUsagePanel from '../components/ToolUsagePanel';
import CodeViewer from '../components/CodeViewer';
import DeleteIcon from '@mui/icons-material/Delete';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`eval-tabpanel-${index}`}
      aria-labelledby={`eval-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3, bgcolor: '#1E1E1E' }}>{children}</Box>}
    </div>
  );
}

const Evaluations: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [evalResults, setEvalResults] = useState<EvalResult[]>([]);
  const [evalEvents, setEvalEvents] = useState<EvalEvent[]>([]);
  const [selectedEval, setSelectedEval] = useState<EvalResult | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [loadingEvents, setLoadingEvents] = useState(false);
  
  // Filter options
  const [evalIds, setEvalIds] = useState<string[]>([]);
  const [evalNames, setEvalNames] = useState<string[]>([]);
  
  // Filter values
  const [evalIdFilter, setEvalIdFilter] = useState<string>('');
  const [nameFilter, setNameFilter] = useState<string>('');
  const [toolTrackingFilter, setToolTrackingFilter] = useState<string>('all');
  // Add new filter states
  const [scoreRangeFilter, setScoreRangeFilter] = useState<string>('all');
  const [toolStatusFilter, setToolStatusFilter] = useState<string>('all');

  // New state for dynamic data sections
  const [dataSections, setDataSections] = useState<{ key: string; title: string }[]>([]);

  // Add new states for delete confirmation dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [evalToDelete, setEvalToDelete] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [evalIdsResponse, evalNamesResponse] = await Promise.all([
          getEvalIds(),
          getEvalNames(),
        ]);

        setEvalIds(evalIdsResponse.eval_ids);
        setEvalNames(evalNamesResponse.names);
      } catch (error) {
        console.error('Error fetching filter options:', error);
      }
    };

    fetchFilterOptions();
  }, []);

  useEffect(() => {
    const fetchEvaluations = async () => {
      try {
        setLoading(true);
        const response = await getEvalResults(
          evalIdFilter || undefined,
          nameFilter || undefined
        );
        
        // Filter results based on various criteria
        let filteredResults = response.results;
        
        // Filter based on tool tracking status
        if (toolTrackingFilter !== 'all') {
          const isToolTrackingEnabled = toolTrackingFilter === 'enabled';
          filteredResults = filteredResults.filter(result => {
            const hasToolTracking = result.metadata?.track_tools === true;
            return hasToolTracking === isToolTrackingEnabled;
          });
        }
        
        // Filter based on score range
        if (scoreRangeFilter !== 'all') {
          filteredResults = filteredResults.filter(result => {
            // Get score from tool_summary if available
            if (result.tool_summary && result.tool_summary.score !== null && result.tool_summary.score !== undefined) {
              const score = result.tool_summary.score;
              
              switch (scoreRangeFilter) {
                case 'perfect':
                  return score === 1;
                case 'high':
                  return score >= 0.8 && score < 1;
                case 'medium':
                  return score >= 0.5 && score < 0.8;
                case 'low':
                  return score < 0.5;
                default:
                  return true;
              }
            }
            
            // If no tool_summary score, try to calculate from eval_results
            if (result.eval_results && Array.isArray(result.eval_results) && result.eval_results.length > 0) {
              // Check if we have scoring data
              const firstResult = result.eval_results[0];
              if (!firstResult.scores) return scoreRangeFilter === 'unknown';
              
              // Calculate average score
              const scoringFunctions = Object.keys(firstResult.scores);
              if (scoringFunctions.length === 0) return scoreRangeFilter === 'unknown';
              
              let totalScore = 0;
              let scoreCount = 0;
              
              result.eval_results.forEach(evalResult => {
                scoringFunctions.forEach(funcName => {
                  if (!evalResult.scores || !evalResult.scores[funcName]) return;
                  
                  const score = evalResult.scores[funcName];
                  if (typeof score === 'number') {
                    totalScore += score;
                    scoreCount++;
                  } else if (typeof score === 'object' && score !== null) {
                    if ('score' in score && typeof score.score === 'number') {
                      totalScore += score.score;
                      scoreCount++;
                    } else if ('success' in score && typeof score.success === 'boolean') {
                      totalScore += score.success ? 1 : 0;
                      scoreCount++;
                    }
                  }
                });
              });
              
              if (scoreCount > 0) {
                const avgScore = totalScore / scoreCount;
                
                switch (scoreRangeFilter) {
                  case 'perfect':
                    return avgScore === 1;
                  case 'high':
                    return avgScore >= 0.8 && avgScore < 1;
                  case 'medium':
                    return avgScore >= 0.5 && avgScore < 0.8;
                  case 'low':
                    return avgScore < 0.5;
                  default:
                    return true;
                }
              }
              
              return scoreRangeFilter === 'unknown';
            }
            
            // No score found
            return scoreRangeFilter === 'unknown';
          });
        }
        
        // Filter based on tool status
        if (toolStatusFilter !== 'all') {
          filteredResults = filteredResults.filter(result => {
            // Determine if there are any successful tool calls
            const hasSuccess = result.tool_summary && result.tool_summary.successful_tool_calls > 0;
            const hasFailed = result.tool_summary && 
                              result.tool_summary.total_tool_calls > 0 && 
                              result.tool_summary.successful_tool_calls < result.tool_summary.total_tool_calls;
            
            // Alternative check for newer format
            let newFormatHasSuccess = false;
            let newFormatHasFailed = false;
            
            if (result.eval_results && Array.isArray(result.eval_results)) {
              for (const evalResult of result.eval_results) {
                if (evalResult.tool_info) {
                  const toolSuccess = evalResult.tool_info.tool_evals && 
                                    evalResult.tool_info.tool_evals.some((toolEval: { success: boolean }) => toolEval.success);
                  
                  if (toolSuccess) newFormatHasSuccess = true;
                  else newFormatHasFailed = true;
                }
              }
            }
            
            switch (toolStatusFilter) {
              case 'all_success':
                return (hasSuccess && !hasFailed) || (newFormatHasSuccess && !newFormatHasFailed);
              case 'partial_success':
                return (hasSuccess && hasFailed) || (newFormatHasSuccess && newFormatHasFailed);
              case 'all_failed':
                return (!hasSuccess && hasFailed) || (!newFormatHasSuccess && newFormatHasFailed);
              case 'no_tools':
                return (!result.tool_summary || result.tool_summary.total_tool_calls === 0) && 
                       (!result.eval_results || !result.eval_results.some(r => r.tool_info));
              default:
                return true;
            }
          });
        }
        
        setEvalResults(filteredResults);
      } catch (error) {
        console.error('Error fetching evaluations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluations();
  }, [evalIdFilter, nameFilter, toolTrackingFilter, scoreRangeFilter, toolStatusFilter]);

  const handleEvalIdChange = (event: SelectChangeEvent) => {
    setEvalIdFilter(event.target.value);
  };

  const handleNameChange = (event: SelectChangeEvent) => {
    setNameFilter(event.target.value);
  };
  
  const handleToolTrackingFilterChange = (event: SelectChangeEvent) => {
    setToolTrackingFilter(event.target.value);
  };

  const handleScoreRangeFilterChange = (event: SelectChangeEvent) => {
    setScoreRangeFilter(event.target.value);
  };

  const handleToolStatusFilterChange = (event: SelectChangeEvent) => {
    setToolStatusFilter(event.target.value);
  };

  const handleResetFilters = () => {
    setEvalIdFilter('');
    setNameFilter('');
    setToolTrackingFilter('all');
    setScoreRangeFilter('all');
    setToolStatusFilter('all');
  };

  // Function to parse evaluation data and identify its key sections
  const parseEvaluationData = (evalData: EvalResult) => {
    const sections: { key: string; title: string }[] = [];
    
    // Go through all properties of the evaluation result
    // and create a section for each object property (excluding certain metadata)
    Object.keys(evalData).forEach(key => {
      // Skip primitive fields or reserved fields used elsewhere in the UI
      if (
        typeof evalData[key] === 'object' && 
        evalData[key] !== null &&
        !Array.isArray(evalData[key]) &&
        !['id', 'timestamp', 'name', 'trial_count', 'session_id', 'score_functions_code'].includes(key)
      ) {
        // Create a formatted title from the key
        const title = key
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        sections.push({ key, title });
      }
    });
    
    setDataSections(sections);
  };

  const handleViewDetails = async (evalResult: EvalResult) => {
    console.log('Opening evaluation details:', evalResult);
    console.log('Has tool_summary:', !!evalResult.tool_summary);
    console.log('Has eval_results:', !!evalResult.eval_results);
    
    setSelectedEval(evalResult);
    setOpenDialog(true);
    setTabValue(0);
    
    // Parse the evaluation data to identify sections
    parseEvaluationData(evalResult);

    try {
      setLoadingEvents(true);
      const eventsResponse = await getEvalEvents(evalResult.id);
      setEvalEvents(eventsResponse.events);
    } catch (error) {
      console.error('Error fetching evaluation events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedEval(null);
    setEvalEvents([]);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const resultColumns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 250, flex: 0.5 },
    { 
      field: 'timestamp', 
      headerName: 'Timestamp', 
      width: 180, 
      flex: 0.5,
      renderCell: (params: GridRenderCellParams<EvalResult>) => {
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
    { field: 'name', headerName: 'Name', width: 180, flex: 0.5 },
    { field: 'trial_count', headerName: 'Trials', type: 'number', width: 80 },
    {
      field: 'score',
      headerName: 'Score',
      width: 120,
      flex: 0.3,
      renderCell: (params: GridRenderCellParams<EvalResult>) => {
        const evalData = params.row;
        
        // Try to get score from tool_summary for tool-based evaluations
        if (evalData.tool_summary && evalData.tool_summary.score !== null && evalData.tool_summary.score !== undefined) {
          const score = evalData.tool_summary.score;
          
          // Determine color based on score value (assuming scores are between 0 and 1)
          let scoreColor = 'success.main';
          if (score < 0.5) {
            scoreColor = 'error.main';
          } else if (score < 0.8) {
            scoreColor = 'warning.main';
          }
          
          return (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              bgcolor: `${scoreColor}20`,
              borderRadius: 1.5,
              px: 1.2,
              py: 0.3,
              border: '1px solid',
              borderColor: scoreColor
            }}>
              <Typography 
                variant="body2" 
                fontWeight="medium"
                color={scoreColor}
                fontSize="0.8rem"
              >
                {typeof score === 'number' ? score.toFixed(2).replace(/\.00$/, '') : score}
              </Typography>
            </Box>
          );
        }
        
        // Try to get the average score across all results if available
        if (evalData.eval_results && Array.isArray(evalData.eval_results) && evalData.eval_results.length > 0) {
          // Look for score fields in the first result to find scoring functions
          const firstResult = evalData.eval_results[0];
          if (!firstResult.scores) return "N/A";
          
          // Calculate average scores for each scoring function
          const scoringFunctions = Object.keys(firstResult.scores || {});
          if (scoringFunctions.length === 0) return "N/A";
          
          const averageScores = {};
          let totalScore = 0;
          let scoreCount = 0;
          
          // Find all numeric scores and average them
          scoringFunctions.forEach(funcName => {
            let sum = 0;
            let count = 0;
            
            evalData.eval_results?.forEach(result => {
              if (!result.scores || !result.scores[funcName]) return;
              
              const score = result.scores[funcName];
              // Only include numeric scores or success objects
              if (typeof score === 'number') {
                sum += score;
                count++;
              } else if (typeof score === 'object' && score !== null) {
                // For objects with a success property (like tool evaluations)
                if ('score' in score && typeof score.score === 'number') {
                  sum += score.score;
                  count++;
                } else if ('success' in score && typeof score.success === 'boolean') {
                  sum += score.success ? 1 : 0;
                  count++;
                }
              }
            });
            
            if (count > 0) {
              const avg = sum / count;
              averageScores[funcName] = avg;
              totalScore += avg;
              scoreCount++;
            }
          });
          
          // If we have any scores, calculate the final average
          if (scoreCount > 0) {
            const finalScore = totalScore / scoreCount;
            
            // Determine color based on score value (assuming scores are between 0 and 1)
            let scoreColor = 'success.main';
            if (finalScore < 0.5) {
              scoreColor = 'error.main';
            } else if (finalScore < 0.8) {
              scoreColor = 'warning.main';
            }
            
            return (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                bgcolor: `${scoreColor}20`,
                borderRadius: 1.5,
                px: 1.2,
                py: 0.3,
                border: '1px solid',
                borderColor: scoreColor
              }}>
                <Typography 
                  variant="body2" 
                  fontWeight="medium"
                  color={scoreColor}
                  fontSize="0.8rem"
                >
                  {typeof finalScore === 'number' ? finalScore.toFixed(2).replace(/\.00$/, '') : finalScore}
                </Typography>
              </Box>
            );
          }
        }
        
        return "N/A";
      }
    },
    {
      field: 'tools_passed',
      headerName: 'Tools Passed',
      width: 200,
      flex: 0.5,
      sortable: false,
      renderCell: (params: GridRenderCellParams<EvalResult>) => {
        const evalData = params.row;
        
        // Check if tool tracking is enabled in metadata
        const hasToolTracking = evalData.metadata?.track_tools === true;
        
        // Check if we have data in the new format with tool_info
        const hasNewToolData = evalData.eval_results && evalData.eval_results.some((result: any) => result.tool_info);
        
        if (!hasToolTracking) {
          return (
            <Typography variant="body2" color="text.secondary">
              Not tracked
            </Typography>
          );
        }
        
        if (!hasNewToolData || !evalData.eval_results) {
          return (
            <Typography variant="body2" color="text.secondary">
              No tool data available
            </Typography>
          );
        }
        
        // Get all unique tools passed across all trials
        const toolsInfo = new Map<string, {
          name: string,
          wasCalledCount: number,
          totalAppearances: number,
          successCount: number
        }>();
        
        // Track which tool was most often called
        let mostCalledTool = { name: '', count: 0 };
        
        evalData.eval_results.forEach((result: any) => {
          if (!result.tool_info) return;
          
          const calledTool = result.tool_info.tool_called;
          const wasSuccessful = result.tool_info.tool_evals && 
                              result.tool_info.tool_evals.some((toolEval: { success: boolean }) => toolEval.success);
          
          // Process each tool that was passed
          (result.tool_info.tools_passed || []).forEach((tool: string) => {
            if (!toolsInfo.has(tool)) {
              toolsInfo.set(tool, {
                name: tool,
                wasCalledCount: 0,
                totalAppearances: 0,
                successCount: 0
              });
            }
            
            const info = toolsInfo.get(tool)!;
            info.totalAppearances++;
            
            if (tool === calledTool) {
              info.wasCalledCount++;
              if (wasSuccessful) {
                info.successCount++;
              }
              
              // Update most called tool
              if (info.wasCalledCount > mostCalledTool.count) {
                mostCalledTool = { name: tool, count: info.wasCalledCount };
              }
            }
          });
        });
        
        if (toolsInfo.size === 0) {
          return (
            <Typography variant="body2" color="text.secondary">
              No tools passed
            </Typography>
          );
        }
        
        // Get all tools for the tooltip
        const toolsArray = Array.from(toolsInfo.values())
          .sort((a, b) => {
            // First sort by whether the tool was called
            if (a.wasCalledCount > 0 && b.wasCalledCount === 0) return -1;
            if (a.wasCalledCount === 0 && b.wasCalledCount > 0) return 1;
            
            // Then by number of times called
            if (a.wasCalledCount !== b.wasCalledCount) {
              return b.wasCalledCount - a.wasCalledCount;
            }
            
            // Then alphabetically
            return a.name.localeCompare(b.name);
          });
        
        // Create formatted chips for all tools (for tooltip content)
        const allToolsDisplay = (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1, maxWidth: 300 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              All Available Tools:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {toolsArray.map(tool => {
                const wasCalled = tool.wasCalledCount > 0;
                return (
                  <Chip
                    key={tool.name}
                    label={tool.name}
                    size="small"
                    variant={wasCalled ? "filled" : "outlined"}
                    color={wasCalled ? "primary" : "default"}
                    sx={{ 
                      height: 22, 
                      '& .MuiChip-label': { 
                        px: 0.8,
                        fontSize: '0.75rem'
                      },
                      fontWeight: wasCalled ? 500 : 400,
                      opacity: wasCalled ? 1 : 0.7
                    }}
                  />
                );
              })}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              {/* Filled chips indicate tools that were called. */}
            </Typography>
          </Box>
        );
        
        // If we have a most called tool, display it prominently
        if (mostCalledTool.name) {
          const mainTool = toolsInfo.get(mostCalledTool.name)!;
          const successRate = mainTool.wasCalledCount > 0 ? mainTool.successCount / mainTool.wasCalledCount : 0;
          let chipColor: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" = "primary";
          
          // Set color based on success rate
          if (successRate >= 0.8) chipColor = "success";
          else if (successRate < 0.5 && successRate > 0) chipColor = "warning";
          else if (successRate === 0) chipColor = "error";
          
          return (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip 
                title={allToolsDisplay}
                arrow
                placement="right"
                componentsProps={{
                  tooltip: {
                    sx: {
                      bgcolor: 'background.paper',
                      boxShadow: '0 3px 14px rgba(0,0,0,0.2)',
                      color: 'text.primary',
                      borderRadius: 1,
                      p: 0
                    }
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip
                    label={mainTool.name}
                    size="small"
                    variant="filled"
                    color={chipColor}
                    sx={{ 
                      height: 24,
                      '& .MuiChip-label': { 
                        px: 1,
                        fontSize: '0.8rem',
                        fontWeight: 500
                      }
                    }}
                  />
                  {toolsInfo.size > 1 && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      +{toolsInfo.size - 1} more
                    </Typography>
                  )}
                </Box>
              </Tooltip>
            </Box>
          );
        }
        
        // If no tool was called (unlikely), show the total count
        return (
          <Tooltip 
            title={allToolsDisplay}
            arrow
            placement="right"
            componentsProps={{
              tooltip: {
                sx: {
                  bgcolor: 'background.paper',
                  boxShadow: '0 3px 14px rgba(0,0,0,0.2)',
                  color: 'text.primary',
                  borderRadius: 1,
                  p: 0
                }
              }
            }}
          >
            <Typography variant="body2">
              {toolsInfo.size} tools available
            </Typography>
          </Tooltip>
        );
      }
    },
    {
      field: 'tool_status',
      headerName: 'Tool Status',
      width: 220,
      flex: 0.6,
      sortable: false,
      renderCell: (params: GridRenderCellParams<EvalResult>) => {
        const evalData = params.row;
        
        // Check if tool tracking is enabled in metadata
        const hasToolTracking = evalData.metadata?.track_tools === true;
        
        // Check if we have tool data in either format
        const hasOldToolData = evalData.tool_summary && evalData.tool_summary.tools_used && evalData.tool_summary.tools_used.length > 0;
        const hasNewToolData = evalData.eval_results && evalData.eval_results.some((result: any) => result.tool_info);
        
        if (!hasToolTracking) {
          return (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box component="span" sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                bgcolor: 'grey.400',
                mr: 1 
              }} />
              <Typography variant="body2" color="text.secondary">Not tracked</Typography>
            </Box>
          );
        }
        
        if (!hasOldToolData && !hasNewToolData) {
          return (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box component="span" sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                bgcolor: 'info.light',
                mr: 1 
              }} />
              <Typography variant="body2" color="text.secondary">No tools used</Typography>
            </Box>
          );
        }
        
        // NEW FORMAT: Process the new tool info structure
        if (hasNewToolData && evalData.eval_results) {
          // Collect all unique tools across all eval results
          const allTools = new Map<string, {
            name: string,
            success_count: number,
            failure_count: number,
            schema_success_count: number,
            schema_failure_count: number,
            total_count: number
          }>();
          
          let totalCalls = 0;
          let successfulCalls = 0;
          
          // Process each evaluation result
          evalData.eval_results.forEach((result: any) => {
            if (!result.tool_info) return;
            
            // Count this as a tool call
            totalCalls++;
            
            // If any tool was successfully called, count as success
            const anySuccess = result.tool_info.tool_evals && 
                            result.tool_info.tool_evals.some((toolEval: { success: boolean }) => toolEval.success);
            if (anySuccess) {
              successfulCalls++;
            }
            
            // The tool that was actually called
            const calledTool = result.tool_info.tool_called;
            
            // Process each tool that was passed
            (result.tool_info.tools_passed || []).forEach((toolName: string) => {
              if (!allTools.has(toolName)) {
                allTools.set(toolName, {
                  name: toolName,
                  success_count: 0,
                  failure_count: 0,
                  schema_success_count: 0,
                  schema_failure_count: 0,
                  total_count: 0
                });
              }
              
              const toolData = allTools.get(toolName)!;
              toolData.total_count++;
              
              // If this is the tool that was called
              if (toolName === calledTool) {
                if (anySuccess) {
                  toolData.success_count++;
                } else {
                  toolData.failure_count++;
                }
                
                // Check schema validation for this tool
                if (result.tool_info.schema_valid) {
                  toolData.schema_success_count++;
                } else {
                  toolData.schema_failure_count++;
                }
              }
            });
          });
          
          // Calculate overall success rate
          const overallSuccessRate = totalCalls > 0 ? successfulCalls / totalCalls : 0;
          
          // Determine color based on success rate
          let statusColor = 'success.main';
          if (overallSuccessRate < 0.5) {
            statusColor = 'error.main';
          } else if (overallSuccessRate < 0.8) {
            statusColor = 'warning.main';
          }
          
          // Get the top tools (limit by space)
          const topTools = Array.from(allTools.values())
            .sort((a, b) => b.total_count - a.total_count)
            .slice(0, 3);
          
          return (
            <Box sx={{ width: '100%' }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 1,
                borderLeft: '3px solid',
                borderColor: statusColor,
                pl: 1,
                py: 0.5,
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '0 4px 4px 0'
              }}>
                <Typography variant="body2" fontWeight="500">
                  {(overallSuccessRate * 100).toFixed(0)}% success
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: 'center',
                  ml: 'auto',
                  bgcolor: overallSuccessRate >= 0.8 ? 'success.main' : 
                           overallSuccessRate >= 0.5 ? 'warning.main' : 'error.main',
                  color: 'white',
                  borderRadius: '12px',
                  px: 1,
                  py: 0.25,
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  minWidth: '28px'
                }}>
                  {totalCalls}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {topTools.map(tool => {
                  // Create tooltip content
                  const successRate = tool.total_count > 0 ? 
                    (tool.success_count / tool.total_count) : 0;
                  
                  const hasSchemaSuccess = tool.schema_success_count > 0;
                  const hasSchemaFailure = tool.schema_failure_count > 0;
                  const schemaStatus = hasSchemaSuccess && !hasSchemaFailure 
                    ? '✓ Valid schema' 
                    : hasSchemaFailure 
                      ? '✗ Invalid schema' 
                      : 'Schema not evaluated';
                  
                  const tooltipContent = `
                    ${tool.name}
                    
                    Success rate: ${(successRate * 100).toFixed(0)}%
                    Called: ${tool.total_count} times
                    ${schemaStatus}
                  `;
                  
                  // Determine chip color based on which tool was called
                  const wasCalledTool = tool.success_count > 0 || tool.failure_count > 0;
                  
                  return (
                    <Tooltip 
                      key={tool.name} 
                      title={tooltipContent}
                      arrow
                    >
                      <Chip
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {wasCalledTool && (
                              <Box 
                                component="span" 
                                sx={{ 
                                  mr: 0.5,
                                  width: 6, 
                                  height: 6, 
                                  borderRadius: '50%', 
                                  bgcolor: tool.schema_success_count > 0 ? 'success.main' : 'inherit',
                                  display: 'inline-block'
                                }} 
                              />
                            )}
                            {tool.name}
                          </Box>
                        }
                        size="small"
                        variant={wasCalledTool ? "filled" : "outlined"}
                        sx={{ 
                          height: 22, 
                          '& .MuiChip-label': { 
                            px: 0.8,
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            fontWeight: wasCalledTool ? 500 : 400
                          },
                          opacity: wasCalledTool ? 1 : 0.8
                        }}
                        color={
                          !wasCalledTool ? "default" :
                          successRate >= 0.8 ? "success" : 
                          successRate >= 0.5 ? "warning" : 
                          "error"
                        }
                      />
                    </Tooltip>
                  );
                })}
                {allTools.size > 3 && (
                  <Tooltip
                    title={`${allTools.size - 3} more tools passed`}
                    arrow
                  >
                    <Typography variant="caption" 
                      sx={{ 
                        alignSelf: 'center',
                        px: 0.5,
                        py: 0.25,
                        bgcolor: 'background.paper',
                        borderRadius: 1,
                        border: '1px dashed',
                        borderColor: 'divider',
                        fontSize: '0.7rem'
                      }}
                    >
                      +{allTools.size - 3} more
                    </Typography>
                  </Tooltip>
                )}
              </Box>
            </Box>
          );
        }
        
        // OLD FORMAT (keep this for backward compatibility)
        const toolSummary = evalData.tool_summary;
        
        // Calculate overall success rate across all tools
        const overallSuccessRate = toolSummary.successful_tool_calls / toolSummary.total_tool_calls;
        
        // Determine color based on success rate
        let statusColor = 'success.main';
        if (overallSuccessRate < 0.5) {
          statusColor = 'error.main';
        } else if (overallSuccessRate < 0.8) {
          statusColor = 'warning.main';
        }
        
        return (
          <Box sx={{ width: '100%' }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 1,
              borderLeft: '3px solid',
              borderColor: statusColor,
              pl: 1,
              py: 0.5,
              bgcolor: 'rgba(255, 255, 255, 0.05)', 
              borderRadius: '0 4px 4px 0'
            }}>
              <Typography variant="body2" fontWeight="500">
                {(overallSuccessRate * 100).toFixed(0)}% success
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'center',
                ml: 'auto',
                bgcolor: overallSuccessRate >= 0.8 ? 'success.main' : 
                         overallSuccessRate >= 0.5 ? 'warning.main' : 'error.main',
                color: 'white',
                borderRadius: '12px',
                px: 1,
                py: 0.25,
                fontSize: '0.7rem',
                fontWeight: 'bold',
                minWidth: '28px'
              }}>
                {toolSummary.total_tool_calls}
              </Box>
            </Box>
            <Typography variant="caption" color="rgba(255, 255, 255, 0.6)" sx={{ display: 'block', mb: 0.5 }}>
              Tool details not available in this format
            </Typography>
          </Box>
        );
      }
    },
    { field: 'session_id', headerName: 'Session ID', width: 200, flex: 0.5 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 160,
      sortable: false,
      renderCell: (params: GridRenderCellParams<EvalResult>) => {
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
            <IconButton 
              aria-label="delete" 
              size="small"
              onClick={(e) => openDeleteConfirm(params.row.id, e)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        );
      }
    },
  ];

  const eventColumns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 250, flex: 0.5 },
    { 
      field: 'timestamp', 
      headerName: 'Timestamp', 
      width: 180, 
      flex: 0.5,
      renderCell: (params: GridRenderCellParams<EvalEvent>) => {
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
    { field: 'event_type', headerName: 'Event Type', width: 150 },
    { field: 'name', headerName: 'Name', width: 200, flex: 0.5 },
    { field: 'duration_ms', headerName: 'Duration (ms)', type: 'number', width: 150 },
    { field: 'trial', headerName: 'Trial', type: 'number', width: 100 },
  ];

  // Add a new function to handle evaluation deletion
  const handleDeleteEval = async () => {
    if (!evalToDelete) return;
    
    try {
      setDeleteLoading(true);
      const response = await deleteEval(evalToDelete);
      
      if (response.success) {
        // Remove the deleted evaluation from the list
        setEvalResults(prevResults => prevResults.filter(evaluation => evaluation.id !== evalToDelete));
        setSnackbarMessage('Evaluation deleted successfully');
        setSnackbarSeverity('success');
        
        // If the deleted evaluation is currently open, close the dialog
        if (selectedEval && selectedEval.id === evalToDelete) {
          setOpenDialog(false);
          setSelectedEval(null);
        }
      } else {
        setSnackbarMessage(response.error || 'Failed to delete evaluation');
        setSnackbarSeverity('error');
      }
    } catch (error) {
      console.error('Error deleting evaluation:', error);
      setSnackbarMessage('An error occurred while deleting the evaluation');
      setSnackbarSeverity('error');
    } finally {
      setDeleteLoading(false);
      setDeleteConfirmOpen(false);
      setEvalToDelete(null);
      setSnackbarOpen(true);
    }
  };

  // Add function to open delete confirmation dialog
  const openDeleteConfirm = (evalId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setEvalToDelete(evalId);
    setDeleteConfirmOpen(true);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Evaluations
      </Typography>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>
        <Grid container spacing={3} alignItems="center">
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
            <FormControl fullWidth size="small">
              <InputLabel id="eval-id-select-label">Evaluation ID</InputLabel>
              <Select
                labelId="eval-id-select-label"
                id="eval-id-select"
                value={evalIdFilter}
                label="Evaluation ID"
                onChange={handleEvalIdChange}
                sx={{ minWidth: '250px' }}
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
                  <em>None</em>
                </MenuItem>
                {evalIds.map((id: string) => (
                  <MenuItem key={id} value={id}>
                    {id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
            <FormControl fullWidth size="small">
              <InputLabel id="name-select-label">Evaluation Name</InputLabel>
              <Select
                labelId="name-select-label"
                id="name-select"
                value={nameFilter}
                label="Evaluation Name"
                onChange={handleNameChange}
                sx={{ minWidth: '250px' }}
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
                  <em>None</em>
                </MenuItem>
                {evalNames.map((name: string) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
            <FormControl fullWidth size="small">
              <InputLabel id="tool-tracking-select-label">Tool Tracking</InputLabel>
              <Select
                labelId="tool-tracking-select-label"
                id="tool-tracking-select"
                value={toolTrackingFilter}
                label="Tool Tracking"
                onChange={handleToolTrackingFilterChange}
                sx={{ minWidth: '250px' }}
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
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="enabled">Enabled</MenuItem>
                <MenuItem value="disabled">Disabled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
            <FormControl fullWidth size="small">
              <InputLabel id="score-range-select-label">Score Range</InputLabel>
              <Select
                labelId="score-range-select-label"
                id="score-range-select"
                value={scoreRangeFilter}
                label="Score Range"
                onChange={handleScoreRangeFilterChange}
                sx={{ minWidth: '250px' }}
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
                <MenuItem value="all">All Scores</MenuItem>
                <MenuItem value="perfect">Perfect (1.0)</MenuItem>
                <MenuItem value="high">High (0.8-0.99)</MenuItem>
                <MenuItem value="medium">Medium (0.5-0.79)</MenuItem>
                <MenuItem value="low">Low (&lt; 0.5)</MenuItem>
                <MenuItem value="unknown">Unknown/No Score</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
            <FormControl fullWidth size="small">
              <InputLabel id="tool-status-select-label">Tool Status</InputLabel>
              <Select
                labelId="tool-status-select-label"
                id="tool-status-select"
                value={toolStatusFilter}
                label="Tool Status"
                onChange={handleToolStatusFilterChange}
                sx={{ minWidth: '250px' }}
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
                <MenuItem value="all">All Tool Status</MenuItem>
                <MenuItem value="all_success">All Successful</MenuItem>
                <MenuItem value="partial_success">Partial Success</MenuItem>
                <MenuItem value="all_failed">All Failed</MenuItem>
                <MenuItem value="no_tools">No Tools Used</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
            <Button
              variant="outlined"
              onClick={handleResetFilters}
              fullWidth
              sx={{ 
                height: '40px', 
                minWidth: '250px',
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
          rows={evalResults} 
          columns={resultColumns} 
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

      {/* Details dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'rgba(30, 30, 30, 0.85)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
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
        <DialogTitle sx={{ 
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          color: 'white',
          py: 2,
          bgcolor: '#1E1E1E',
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6">Evaluation Details</Typography>
              {selectedEval && (
                <Typography variant="subtitle2" color="rgba(255, 255, 255, 0.7)">
                  {selectedEval.name} - {format(parseISO(selectedEval.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteIcon />}
                onClick={() => {
                  if (selectedEval) {
                    openDeleteConfirm(selectedEval.id, new MouseEvent('click') as any);
                  }
                }}
              >
                Delete
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleCloseDialog}
              >
                Close
              </Button>
            </Box>
          </Box>
        </DialogTitle>
        <Box sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', bgcolor: '#1E1E1E' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            aria-label="evaluation tabs"
            sx={{ 
              '& .MuiTabs-indicator': { 
                backgroundColor: '#FF6325'
              },
              '& .Mui-selected': {
                color: '#FF6325 !important'
              },
              '& .MuiTab-root': {
                color: 'rgba(255, 255, 255, 0.7)'
              }
            }}
          >
            <Tab label="Overview" id="eval-tab-0" aria-controls="eval-tabpanel-0" />
            <Tab label="Events" id="eval-tab-1" aria-controls="eval-tabpanel-1" />
            <Tab label="Raw Data" id="eval-tab-2" aria-controls="eval-tabpanel-2" />
          </Tabs>
        </Box>
        <DialogContent 
          dividers
          sx={{ 
            p: 3,
            bgcolor: '#1E1E1E',
            borderTop: 'none',
            borderBottom: 'none',
            '& .MuiTypography-root': {
              color: 'rgba(255, 255, 255, 0.9)'
            },
            '& strong': {
              color: 'white'
            }
          }}
        >
          {selectedEval && (
            <>
              <TabPanel value={tabValue} index={0}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Evaluation Summary
                  </Typography>
                  
                  {/* Metadata section */}
                  <Paper sx={{ p: 2, mb: 3, bgcolor: 'rgba(255, 255, 255, 0.03)' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="body2" color="text.secondary">
                          ID
                        </Typography>
                        <Typography variant="body1">
                          {selectedEval.id}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="body2" color="text.secondary">
                          Name
                        </Typography>
                        <Typography variant="body1">
                          {selectedEval.name}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="body2" color="text.secondary">
                          Timestamp
                        </Typography>
                        <Typography variant="body1">
                          {format(parseISO(selectedEval.timestamp), 'MMM d, yyyy h:mm a')}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="body2" color="text.secondary">
                          Trial Count
                        </Typography>
                        <Typography variant="body1">
                          {selectedEval.trial_count}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                  
                  {/* Dynamic data sections from parseEvaluationData */}
                  {dataSections.map(section => (
                    <Box key={section.key} sx={{ mb: 4 }}>
                      <Typography variant="h6" gutterBottom>
                        {section.title}
                      </Typography>
                      
                      {/* For tool summary, show a special visualization */}
                      {section.key === 'tool_summary' && selectedEval.tool_summary && (
                        <ToolUsagePanel toolSummary={selectedEval.tool_summary} />
                      )}
                      
                      {/* For eval_results, show in a table */}
                      {section.key === 'eval_results' && selectedEval.eval_results && (
                        <DataTable
                          rows={selectedEval.eval_results.map((r, i) => ({ ...r, id: i }))}
                          columns={resultColumns}
                          getRowId={(row) => row.id}
                          height={400}
                        />
                      )}
                      
                      {/* Score functions code gets syntax highlighting */}
                      {section.key === 'score_functions_code' && selectedEval.score_functions_code && (
                        <CodeViewer 
                          code={Object.entries(selectedEval.score_functions_code)
                            .map(([name, code]) => `# ${name}\n${code}`)
                            .join('\n\n')} 
                          language="python" 
                        />
                      )}
                      
                      {/* Default view for other sections */}
                      {!['tool_summary', 'eval_results', 'score_functions_code'].includes(section.key) && (
                        <JsonViewer data={selectedEval?.[section.key]} title={section.title} />
                      )}
                    </Box>
                  ))}
                </Box>
              </TabPanel>
              
              <TabPanel value={tabValue} index={1}>
                {loadingEvents ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <>
                    <Typography variant="h6" gutterBottom>
                      Evaluation Events
                    </Typography>
                    <DataTable
                      rows={evalEvents}
                      columns={eventColumns}
                      height={400}
                      initialState={{
                        columns: {
                          columnVisibilityModel: {
                            id: false,
                          },
                        },
                      }}
                    />

                    {evalEvents.length > 0 && (
                      <Box sx={{ mt: 3 }}>
                        <Typography variant="h6" gutterBottom>
                          Event Details
                        </Typography>
                        <JsonViewer data={evalEvents[0]} title="First Event Data" defaultExpanded />
                      </Box>
                    )}
                  </>
                )}
              </TabPanel>
              
              <TabPanel value={tabValue} index={2}>
                <JsonViewer data={selectedEval} title="Full Evaluation Data" defaultExpanded />
              </TabPanel>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
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
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this evaluation? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteConfirmOpen(false)} 
            disabled={deleteLoading}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDeleteEval}
            disabled={deleteLoading}
          >
            {deleteLoading ? 'Deleting...' : 'Delete'}
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

export default Evaluations; 