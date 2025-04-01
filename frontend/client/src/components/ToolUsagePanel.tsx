import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

interface Tool {
  name: string;
  success_count: number;
  failure_count: number;
  success_rate: number;
  schema_validation_success_count?: number;
  schema_validation_failure_count?: number;
}

interface ToolSummary {
  tools_used: Tool[];
  total_tool_calls: number;
  successful_tool_calls: number;
  failed_tool_calls: number;
  track_tools: boolean;
}

interface ToolUsagePanelProps {
  toolSummary: ToolSummary | null;
  metadata?: any;
  evalData?: any;
}

const ToolUsagePanel: React.FC<ToolUsagePanelProps> = ({ toolSummary, metadata, evalData }) => {
  console.log('ToolUsagePanel received:', { toolSummary, metadata, evalData });
  
  // Check if we have the new format tool data
  const hasNewToolData = evalData?.eval_results && evalData.eval_results.some((result: any) => result.tool_info);
  console.log('Has new tool data format:', hasNewToolData);
  
  // If we have the new format data, convert it to a format compatible with this component
  if (hasNewToolData && !toolSummary) {
    console.log('Processing new tool data format...');
    // Process the new tool data format
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
      
      // Process each tool evaluated in this result
      if (result.tool_info.tool_evals) {
        result.tool_info.tool_evals.forEach((toolEval: any) => {
          if (!toolEval.name) return;
          
          // Get or create the tool record
          if (!allTools.has(toolEval.name)) {
            allTools.set(toolEval.name, {
              name: toolEval.name,
              success_count: 0,
              failure_count: 0,
              schema_success_count: 0,
              schema_failure_count: 0,
              total_count: 0
            });
          }
          
          const toolRecord = allTools.get(toolEval.name)!;
          
          // Update counts based on success
          if (toolEval.success) {
            toolRecord.success_count++;
          } else {
            toolRecord.failure_count++;
          }
          
          // Update schema validation counts if available
          if (toolEval.schema_validation !== undefined) {
            if (toolEval.schema_validation) {
              toolRecord.schema_success_count++;
            } else {
              toolRecord.schema_failure_count++;
            }
          }
          
          toolRecord.total_count++;
        });
      }
    });
    
    // Convert the map to an array of tools for display
    const tools_used = Array.from(allTools.values()).map(tool => ({
      name: tool.name,
      success_count: tool.success_count,
      failure_count: tool.failure_count,
      success_rate: tool.total_count > 0 ? tool.success_count / tool.total_count : 0,
      schema_validation_success_count: tool.schema_success_count,
      schema_validation_failure_count: tool.schema_failure_count
    }));
    
    // Create a compatible toolSummary object
    if (tools_used.length > 0) {
      toolSummary = {
        tools_used,
        total_tool_calls: totalCalls,
        successful_tool_calls: successfulCalls,
        failed_tool_calls: totalCalls - successfulCalls,
        track_tools: true
      };
    }
  }

  if (!toolSummary && (!metadata || !metadata.track_tools)) {
    return (
      <Paper sx={{ 
        p: 2, 
        mt: 3, 
        borderRadius: 2, 
        bgcolor: '#1E1E1E',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}>
        <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
          Tool Usage
        </Typography>
        <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
          Tool tracking was not enabled for this evaluation.
        </Typography>
      </Paper>
    );
  }

  // Handle the case where we have a toolSummary object but no tools_used array
  // This could happen in some formats of the data
  if (toolSummary && (!toolSummary.tools_used || toolSummary.tools_used.length === 0)) {
    // Check if we have the raw tool_summary data available
    if (toolSummary && Object.keys(toolSummary).length > 0) {
      // Safe to use toolSummary now since we've checked it's not null
      const summary = toolSummary; // Create a non-null reference
      
      return (
        <Paper sx={{ 
          p: 2, 
          mt: 3, 
          borderRadius: 2, 
          bgcolor: '#1E1E1E',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}>
          <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
            Tool Usage Summary
          </Typography>
          
          {/* Show the raw data in a more readable format */}
          <Box sx={{ mb: 2 }}>
            {/* Overall Statistics if available */}
            {summary.total_tool_calls !== undefined && (
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
                  <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
                    <Typography variant="subtitle2" color="rgba(255, 255, 255, 0.7)">
                      Total Tool Calls
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'white' }}>
                      {summary.total_tool_calls}
                    </Typography>
                  </Box>
                </Grid>
                <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
                  <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
                    <Typography variant="subtitle2" color="rgba(255, 255, 255, 0.7)" sx={{ display: 'flex', alignItems: 'center' }}>
                      <CheckCircleIcon color="success" sx={{ mr: 0.5, fontSize: 16 }} />
                      Successful Calls
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'white' }}>
                      {summary.successful_tool_calls} ({(summary.successful_tool_calls / summary.total_tool_calls * 100).toFixed(1)}%)
                    </Typography>
                  </Box>
                </Grid>
                <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
                  <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
                    <Typography variant="subtitle2" color="rgba(255, 255, 255, 0.7)" sx={{ display: 'flex', alignItems: 'center' }}>
                      <ErrorIcon color="error" sx={{ mr: 0.5, fontSize: 16 }} />
                      Failed Calls
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'white' }}>
                      {summary.failed_tool_calls} ({(summary.failed_tool_calls / summary.total_tool_calls * 100).toFixed(1)}%)
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            )}
            
            {/* Show available tool data */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" color="rgba(255, 255, 255, 0.8)" gutterBottom>
                Available Tool Data:
              </Typography>
              <Box 
                component="pre" 
                sx={{ 
                  p: 2, 
                  borderRadius: 1, 
                  bgcolor: 'rgba(0, 0, 0, 0.3)', 
                  color: 'rgba(255, 255, 255, 0.8)',
                  overflowX: 'auto',
                  fontSize: '0.85rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                {JSON.stringify(summary, null, 2)}
              </Box>
            </Box>
            
            {/* Show eval_results data if it exists */}
            {evalData && evalData.eval_results && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" color="rgba(255, 255, 255, 0.8)" gutterBottom>
                  Eval Results Data:
                </Typography>
                <Box 
                  component="pre" 
                  sx={{ 
                    p: 2, 
                    borderRadius: 1, 
                    bgcolor: 'rgba(0, 0, 0, 0.3)', 
                    color: 'rgba(255, 255, 255, 0.8)',
                    overflowX: 'auto',
                    fontSize: '0.85rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    maxHeight: '200px'
                  }}
                >
                  {JSON.stringify(evalData.eval_results, null, 2)}
                </Box>
              </Box>
            )}
          </Box>
          
          <Typography variant="body2" color="rgba(255, 255, 255, 0.6)" sx={{ mt: 2 }}>
            Tool tracking was enabled, but detailed tool data is in a non-standard format.
          </Typography>
        </Paper>
      );
    }
    
    return (
      <Paper sx={{ 
        p: 2, 
        mt: 3, 
        borderRadius: 2, 
        bgcolor: '#1E1E1E',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}>
        <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
          Tool Usage
        </Typography>
        <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
          No tool usage data available for this evaluation.
        </Typography>
      </Paper>
    );
  }

  if (!toolSummary || !toolSummary.tools_used || toolSummary.tools_used.length === 0) {
    return (
      <Paper sx={{ 
        p: 2, 
        mt: 3, 
        borderRadius: 2, 
        bgcolor: '#1E1E1E',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}>
        <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
          Tool Usage
        </Typography>
        <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
          No tool usage data available for this evaluation.
        </Typography>
      </Paper>
    );
  }

  // At this point we know toolSummary is not null and has tools_used
  const summary = toolSummary;

  return (
    <Paper sx={{ 
      p: 2, 
      mt: 3, 
      borderRadius: 2, 
      bgcolor: '#1E1E1E',
      border: '1px solid rgba(255, 255, 255, 0.05)',
    }}>
      <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
        Tool Usage Summary
      </Typography>

      {/* Overall Statistics */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
          <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
            <Typography variant="subtitle2" color="rgba(255, 255, 255, 0.7)">
              Total Tool Calls
            </Typography>
            <Typography variant="h6" sx={{ color: 'white' }}>
              {summary.total_tool_calls}
            </Typography>
          </Box>
        </Grid>
        <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
          <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
            <Typography variant="subtitle2" color="rgba(255, 255, 255, 0.7)" sx={{ display: 'flex', alignItems: 'center' }}>
              <CheckCircleIcon color="success" sx={{ mr: 0.5, fontSize: 16 }} />
              Successful Calls
            </Typography>
            <Typography variant="h6" sx={{ color: 'white' }}>
              {summary.successful_tool_calls} ({(summary.successful_tool_calls / summary.total_tool_calls * 100).toFixed(1)}%)
            </Typography>
          </Box>
        </Grid>
        <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
          <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
            <Typography variant="subtitle2" color="rgba(255, 255, 255, 0.7)" sx={{ display: 'flex', alignItems: 'center' }}>
              <ErrorIcon color="error" sx={{ mr: 0.5, fontSize: 16 }} />
              Failed Calls
            </Typography>
            <Typography variant="h6" sx={{ color: 'white' }}>
              {summary.failed_tool_calls} ({(summary.failed_tool_calls / summary.total_tool_calls * 100).toFixed(1)}%)
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Tool Details Table */}
      <TableContainer 
        component={Paper} 
        variant="outlined" 
        sx={{ 
          mb: 2, 
          maxHeight: 300, 
          overflow: 'auto',
          bgcolor: 'rgba(0, 0, 0, 0.3)',
          borderColor: 'rgba(255, 255, 255, 0.1)'
        }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: 'rgba(0, 0, 0, 0.6)', color: 'rgba(255, 255, 255, 0.85)', fontWeight: 600 }}>Tool Name</TableCell>
              <TableCell align="center" sx={{ bgcolor: 'rgba(0, 0, 0, 0.6)', color: 'rgba(255, 255, 255, 0.85)', fontWeight: 600 }}>Success Rate</TableCell>
              <TableCell align="center" sx={{ bgcolor: 'rgba(0, 0, 0, 0.6)', color: 'rgba(255, 255, 255, 0.85)', fontWeight: 600 }}>Calls</TableCell>
              <TableCell align="center" sx={{ bgcolor: 'rgba(0, 0, 0, 0.6)', color: 'rgba(255, 255, 255, 0.85)', fontWeight: 600 }}>Schema Validation</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {summary.tools_used.map((tool) => (
              <TableRow key={tool.name} hover sx={{ '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.03) !important' } }}>
                <TableCell component="th" scope="row" sx={{ borderColor: 'rgba(255, 255, 255, 0.05)', color: 'white' }}>
                  <Tooltip title={`Tool: ${tool.name}`}>
                    <Chip 
                      label={tool.name} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                      sx={{
                        borderColor: 'rgba(255, 99, 37, 0.5)',
                        '&:hover': {
                          borderColor: '#FF6325',
                          backgroundColor: 'rgba(255, 99, 37, 0.08)'
                        }
                      }}
                    />
                  </Tooltip>
                </TableCell>
                <TableCell align="center" sx={{ borderColor: 'rgba(255, 255, 255, 0.05)', color: 'white' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {tool.success_rate >= 0.8 && <CheckCircleIcon color="success" sx={{ mr: 0.5, fontSize: 16 }} />}
                    {tool.success_rate < 0.5 && <ErrorIcon color="error" sx={{ mr: 0.5, fontSize: 16 }} />}
                    {tool.success_rate >= 0.5 && tool.success_rate < 0.8 && <ErrorIcon color="warning" sx={{ mr: 0.5, fontSize: 16 }} />}
                    {(tool.success_rate * 100).toFixed(1)}%
                  </Box>
                </TableCell>
                <TableCell align="center" sx={{ borderColor: 'rgba(255, 255, 255, 0.05)', color: 'white' }}>
                  {tool.success_count + tool.failure_count}
                  <Typography variant="caption" color="rgba(255, 255, 255, 0.6)" display="block">
                    ({tool.success_count} / {tool.failure_count})
                  </Typography>
                </TableCell>
                <TableCell align="center" sx={{ borderColor: 'rgba(255, 255, 255, 0.05)', color: 'white' }}>
                  {(tool.schema_validation_success_count !== undefined && 
                   tool.schema_validation_failure_count !== undefined) ? (
                    <Box>
                      <Typography variant="body2">
                        {tool.schema_validation_success_count} / {tool.schema_validation_failure_count}
                      </Typography>
                      <Typography variant="caption" color="rgba(255, 255, 255, 0.6)">
                        {tool.schema_validation_success_count + tool.schema_validation_failure_count > 0 ? 
                          `${((tool.schema_validation_success_count / (tool.schema_validation_success_count + tool.schema_validation_failure_count)) * 100).toFixed(1)}%` : 
                          'N/A'
                        }
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="rgba(255, 255, 255, 0.6)">
                      Not tracked
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Track tools status */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="rgba(255, 255, 255, 0.6)">
          Tool tracking was {summary.track_tools ? 'enabled' : 'disabled'} for this evaluation.
        </Typography>
        
        {/* Show metadata if available */}
        {metadata && metadata.track_tools !== undefined && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="rgba(255, 255, 255, 0.6)">
              Metadata configuration: <strong style={{ color: 'white' }}>{metadata.track_tools ? 'Enabled' : 'Disabled'}</strong>
            </Typography>
            {metadata.test_case_count !== undefined && (
              <Typography variant="body2" color="rgba(255, 255, 255, 0.6)">
                Test cases: <strong style={{ color: 'white' }}>{metadata.test_case_count}</strong>
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default ToolUsagePanel; 