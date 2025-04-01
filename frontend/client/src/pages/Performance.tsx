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
  Card,
  CardContent,
  SelectChangeEvent,
  IconButton,
  Modal,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CloseIcon from '@mui/icons-material/Close';
import { getTraces, getTracedFunctions } from '../services/api';
import { Trace } from '../types';
import LoadingIndicator from '../components/LoadingIndicator';

interface FunctionPerformance {
  name: string;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  totalCalls: number;
}

interface TypeDistribution {
  name: string;
  value: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#A4DE6C'];

const Performance: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [functions, setFunctions] = useState<string[]>([]);
  const [selectedFunction, setSelectedFunction] = useState<string>('');
  const [functionPerformance, setFunctionPerformance] = useState<FunctionPerformance[]>([]);
  const [typeDistribution, setTypeDistribution] = useState<TypeDistribution[]>([]);
  
  // Full screen chart state
  const [fullScreenChart, setFullScreenChart] = useState<string | null>(null);
  
  // Handle opening a chart in full screen
  const handleOpenFullScreen = (chartId: string) => {
    setFullScreenChart(chartId);
  };
  
  // Handle closing the full screen view
  const handleCloseFullScreen = () => {
    setFullScreenChart(null);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [tracesResponse, functionsResponse] = await Promise.all([
          getTraces(500), // Get a larger sample for meaningful metrics
          getTracedFunctions(),
        ]);

        setTraces(tracesResponse.traces);
        setFunctions(functionsResponse.functions);

        // Process performance data
        processPerformanceData(tracesResponse.traces);
      } catch (error) {
        console.error('Error fetching performance data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (selectedFunction) {
      fetchFunctionTraces(selectedFunction);
    }
  }, [selectedFunction]);

  const fetchFunctionTraces = async (functionName: string) => {
    try {
      setLoading(true);
      const response = await getTraces(200, undefined, undefined, functionName);
      processPerformanceData(response.traces);
    } catch (error) {
      console.error(`Error fetching traces for ${functionName}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const processPerformanceData = (tracesData: Trace[]) => {
    // Function performance
    const functionMap = new Map<string, { durations: number[]; count: number }>();

    tracesData.forEach((trace) => {
      if (trace.duration_ms) {
        const funcName = trace.function;
        if (!functionMap.has(funcName)) {
          functionMap.set(funcName, { durations: [], count: 0 });
        }
        const funcData = functionMap.get(funcName)!;
        funcData.durations.push(trace.duration_ms);
        funcData.count++;
      }
    });

    const performanceData: FunctionPerformance[] = [];
    functionMap.forEach((data, name) => {
      if (data.durations.length > 0) {
        const avgDuration =
          data.durations.reduce((sum, duration) => sum + duration, 0) / data.durations.length;
        const minDuration = Math.min(...data.durations);
        const maxDuration = Math.max(...data.durations);

        performanceData.push({
          name,
          avgDuration,
          minDuration,
          maxDuration,
          totalCalls: data.count,
        });
      }
    });

    // Sort by average duration descending
    performanceData.sort((a, b) => b.avgDuration - a.avgDuration);
    setFunctionPerformance(performanceData.slice(0, 10)); // Top 10 by avg duration

    // Trace type distribution
    const typeMap = new Map<string, number>();
    tracesData.forEach((trace) => {
      const type = trace.type;
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });

    const typeData: TypeDistribution[] = [];
    typeMap.forEach((count, name) => {
      typeData.push({ name, value: count });
    });

    setTypeDistribution(typeData);
  };

  const handleFunctionChange = (event: SelectChangeEvent) => {
    setSelectedFunction(event.target.value);
  };

  // Add a custom label formatter for function names
  const formatFunctionName = (name: string) => {
    // First, try to extract a meaningful part from the function name
    const parts = name.split('_');
    if (parts.length > 1) {
      // Take the first 2 parts of the function name for display
      return parts.slice(0, 2).join('_');
    }
    
    // If no underscore, just return a reasonable portion
    return name.length > 15 ? `${name.substring(0, 12)}...` : name;
  };

  // Enhance the tooltip to better display function names and data
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            backgroundColor: 'rgba(25, 25, 25, 0.95)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 1.5,
            p: 1.5,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            maxWidth: '300px'
          }}
        >
          <Typography 
            sx={{ 
              fontSize: '0.875rem', 
              fontWeight: 600, 
              mb: 1, 
              color: 'rgba(255, 255, 255, 0.9)',
              wordBreak: 'break-word'
            }}
          >
            {/* Show full function name in tooltip */}
            Function: {label}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Box key={`tooltip-${index}`} sx={{ display: 'flex', alignItems: 'center', mb: 0.75 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  backgroundColor: entry.color,
                  mr: 1,
                  borderRadius: '50%',
                  flexShrink: 0
                }}
              />
              <Typography sx={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                {entry.name}: {entry.value.toFixed(2)} {entry.name.includes('Duration') || entry.name.includes('Average') || entry.name.includes('Min') || entry.name.includes('Max') ? 'ms' : ''}
              </Typography>
            </Box>
          ))}
        </Box>
      );
    }
    return null;
  };

  if (loading && traces.length === 0) {
    return <LoadingIndicator message="Loading performance data..." />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Performance Metrics
      </Typography>

      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 3, 
          borderRadius: 3,
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(25, 25, 25, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            backgroundColor: 'rgba(30, 30, 30, 0.7)',
          }
        }}
      >
        <Typography 
          variant="h6" 
          gutterBottom
          sx={{
            fontWeight: 600,
            letterSpacing: '-0.01em',
            mb: 1
          }}
        >
          Filter by Function
        </Typography>
        <FormControl sx={{ minWidth: 300 }} size="small">
          <InputLabel id="function-select-label">Function</InputLabel>
          <Select
            labelId="function-select-label"
            id="function-select"
            value={selectedFunction}
            label="Function"
            onChange={handleFunctionChange}
          >
            <MenuItem value="">
              <em>All Functions</em>
            </MenuItem>
            {functions.map((func) => (
              <MenuItem key={func} value={func}>
                {func}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      <Grid container spacing={3}>
        <Grid sx={{ gridColumn: { xs: 'span 12', lg: 'span 8' } }}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              borderRadius: 3, 
              height: '100%',
              backdropFilter: 'blur(10px)',
              backgroundColor: 'rgba(25, 25, 25, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                backgroundColor: 'rgba(30, 30, 30, 0.7)',
              }
            }}
          >
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{
                fontWeight: 600,
                letterSpacing: '-0.01em',
                mb: 1,
                background: 'linear-gradient(90deg, #FFFFFF 30%, rgba(255, 255, 255, 0.7) 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Function Execution Times (ms)
              <IconButton 
                size="small" 
                sx={{ 
                  ml: 1, 
                  color: 'rgba(255, 255, 255, 0.6)',
                  '&:hover': {
                    color: 'rgba(255, 255, 255, 0.9)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
                onClick={() => handleOpenFullScreen('executionTimes')}
                aria-label="view fullscreen"
              >
                <FullscreenIcon fontSize="small" />
              </IconButton>
            </Typography>
            <Box sx={{ height: 400 }}>
              {loading ? (
                <LoadingIndicator />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={functionPerformance}
                    margin={{ top: 30, right: 30, left: 20, bottom: 70 }}
                    style={{ background: 'rgba(10, 10, 10, 0.2)', borderRadius: '8px', padding: '10px' }}
                    barGap={4}
                    barCategoryGap={16}
                  >
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                    <XAxis
                      dataKey="name"
                      tick={{ 
                        fill: 'rgba(255, 255, 255, 0.85)', 
                        fontSize: 11 
                      }}
                      tickLine={false}
                      height={70}
                      interval={0}
                      tickFormatter={formatFunctionName}
                      textAnchor="end"
                      angle={-30}
                    />
                    <YAxis 
                      tick={{ fill: 'rgba(255, 255, 255, 0.85)' }}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(2)} ms`, 'Duration']}
                      content={<CustomTooltip />}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={50}
                      wrapperStyle={{ 
                        color: 'rgba(255, 255, 255, 0.85)',
                        paddingTop: '10px',
                        fontSize: '13px',
                        fontWeight: 500
                      }}
                      formatter={(value) => {
                        // Clean up the legend labels
                        const valueMap: Record<string, string> = {
                          'Average': 'Average (ms)',
                          'Min': 'Min (ms)',
                          'Max': 'Max (ms)',
                          'Total Calls': 'Total Calls'
                        };
                        return valueMap[value] || value;
                      }}
                    />
                    <Bar dataKey="avgDuration" name="Average" fill="#8884d8" radius={[3, 3, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="minDuration" name="Min" fill="#82ca9d" radius={[3, 3, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="maxDuration" name="Max" fill="#ffc658" radius={[3, 3, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid sx={{ gridColumn: { xs: 'span 12', lg: 'span 4' } }}>
          <Card 
            elevation={0}
            sx={{ 
              height: '100%',
              borderRadius: 3,
              p: 3,
              backdropFilter: 'blur(10px)',
              backgroundColor: 'rgba(25, 25, 25, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                backgroundColor: 'rgba(30, 30, 30, 0.7)',
              }
            }}
          >
            <CardContent sx={{ p: 0 }}>
              <Typography 
                variant="h6" 
                gutterBottom
                sx={{
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  mb: 1,
                  background: 'linear-gradient(90deg, #FFFFFF 30%, rgba(255, 255, 255, 0.7) 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Trace Type Distribution
                <IconButton 
                  size="small" 
                  sx={{ 
                    ml: 1, 
                    color: 'rgba(255, 255, 255, 0.6)',
                    '&:hover': {
                      color: 'rgba(255, 255, 255, 0.9)',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                  onClick={() => handleOpenFullScreen('typeDistribution')}
                  aria-label="view fullscreen"
                >
                  <FullscreenIcon fontSize="small" />
                </IconButton>
              </Typography>
              <Box sx={{ height: 300, display: 'flex', justifyContent: 'center' }}>
                {loading ? (
                  <LoadingIndicator />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart style={{ background: 'rgba(10, 10, 10, 0.2)', borderRadius: '8px' }}>
                      <Pie
                        data={typeDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({
                          name,
                          percent,
                          x,
                          y
                        }) => {
                          return (
                            <text
                              x={x}
                              y={y}
                              fill="rgba(255, 255, 255, 0.95)"
                              fontSize={12}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontWeight="500"
                            >
                              {(percent * 100).toFixed(0)}%
                            </text>
                          );
                        }}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {typeDistribution.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={<CustomTooltip />}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                  {typeDistribution.map((type, index) => (
                    <Box 
                      key={type.name} 
                      sx={{
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 0.5, 
                        py: 0.5,
                        px: 1,
                        borderRadius: 1,
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.05)'
                        }
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          width: 12,
                          height: 12,
                          backgroundColor: COLORS[index % COLORS.length],
                          marginRight: 8,
                          borderRadius: '2px',
                        }}
                      />
                      <span style={{ flex: 1 }}>{type.name}</span>
                      <span style={{ fontWeight: 500 }}>{type.value} traces</span>
                    </Box>
                  ))}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid sx={{ gridColumn: { xs: 'span 12' } }}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              borderRadius: 3,
              height: '100%',
              backdropFilter: 'blur(10px)',
              backgroundColor: 'rgba(25, 25, 25, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                backgroundColor: 'rgba(30, 30, 30, 0.7)',
              }
            }}
          >
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{
                fontWeight: 600,
                letterSpacing: '-0.01em',
                mb: 1,
                background: 'linear-gradient(90deg, #FFFFFF 30%, rgba(255, 255, 255, 0.7) 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Function Call Counts
              <IconButton 
                size="small" 
                sx={{ 
                  ml: 1, 
                  color: 'rgba(255, 255, 255, 0.6)',
                  '&:hover': {
                    color: 'rgba(255, 255, 255, 0.9)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
                onClick={() => handleOpenFullScreen('callCounts')}
                aria-label="view fullscreen"
              >
                <FullscreenIcon fontSize="small" />
              </IconButton>
            </Typography>
            <Box sx={{ height: 400 }}>
              {loading ? (
                <LoadingIndicator />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={functionPerformance}
                    margin={{ top: 30, right: 30, left: 20, bottom: 70 }}
                    style={{ background: 'rgba(10, 10, 10, 0.2)', borderRadius: '8px', padding: '10px' }}
                    barGap={4}
                    barCategoryGap={16}
                  >
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                    <XAxis
                      dataKey="name"
                      tick={{ 
                        fill: 'rgba(255, 255, 255, 0.85)', 
                        fontSize: 11 
                      }}
                      tickLine={false}
                      height={70}
                      interval={0}
                      tickFormatter={formatFunctionName}
                      textAnchor="end"
                      angle={-30}
                    />
                    <YAxis 
                      tick={{ fill: 'rgba(255, 255, 255, 0.85)' }}
                    />
                    <Tooltip 
                      content={<CustomTooltip />}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={50}
                      wrapperStyle={{ 
                        color: 'rgba(255, 255, 255, 0.85)',
                        paddingTop: '10px',
                        fontSize: '13px',
                        fontWeight: 500
                      }}
                    />
                    <Bar dataKey="totalCalls" name="Total Calls" fill="#82ca9d" radius={[3, 3, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Full screen modal */}
      <Modal
        open={fullScreenChart !== null}
        onClose={handleCloseFullScreen}
        aria-labelledby="full-screen-chart"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ 
          width: '90vw', 
          height: '85vh', 
          bgcolor: 'rgba(25, 25, 25, 0.95)',
          borderRadius: 3,
          p: 3,
          position: 'relative',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}>
          <IconButton
            sx={{ position: 'absolute', top: 8, right: 8, color: 'rgba(255, 255, 255, 0.8)' }}
            onClick={handleCloseFullScreen}
          >
            <CloseIcon />
          </IconButton>
          
          {fullScreenChart === 'executionTimes' && (
            <Box sx={{ height: '100%' }}>
              <Typography 
                variant="h5" 
                sx={{
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  mb: 2,
                  background: 'linear-gradient(90deg, #FFFFFF 30%, rgba(255, 255, 255, 0.7) 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Function Execution Times (ms)
              </Typography>
              <Box sx={{ height: 'calc(100% - 50px)' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={functionPerformance}
                    margin={{ top: 30, right: 30, left: 20, bottom: 70 }}
                    style={{ background: 'rgba(10, 10, 10, 0.2)', borderRadius: '8px', padding: '10px' }}
                    barGap={4}
                    barCategoryGap={16}
                  >
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                    <XAxis
                      dataKey="name"
                      tick={{ 
                        fill: 'rgba(255, 255, 255, 0.85)', 
                        fontSize: 11 
                      }}
                      tickLine={false}
                      height={70}
                      interval={0}
                      tickFormatter={formatFunctionName}
                      textAnchor="end"
                      angle={-30}
                    />
                    <YAxis 
                      tick={{ fill: 'rgba(255, 255, 255, 0.85)' }}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(2)} ms`, 'Duration']}
                      content={<CustomTooltip />}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={50}
                      wrapperStyle={{ 
                        color: 'rgba(255, 255, 255, 0.85)',
                        paddingTop: '10px',
                        fontSize: '13px',
                        fontWeight: 500
                      }}
                      formatter={(value) => {
                        const valueMap: Record<string, string> = {
                          'Average': 'Average (ms)',
                          'Min': 'Min (ms)',
                          'Max': 'Max (ms)',
                          'Total Calls': 'Total Calls'
                        };
                        return valueMap[value] || value;
                      }}
                    />
                    <Bar dataKey="avgDuration" name="Average" fill="#8884d8" radius={[3, 3, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="minDuration" name="Min" fill="#82ca9d" radius={[3, 3, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="maxDuration" name="Max" fill="#ffc658" radius={[3, 3, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          )}
          
          {fullScreenChart === 'typeDistribution' && (
            <Box sx={{ height: '100%' }}>
              <Typography 
                variant="h5" 
                sx={{
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  mb: 2,
                  background: 'linear-gradient(90deg, #FFFFFF 30%, rgba(255, 255, 255, 0.7) 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Trace Type Distribution
              </Typography>
              <Box sx={{ height: 'calc(100% - 50px)', display: 'flex', flexDirection: 'row' }}>
                <Box sx={{ flex: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart style={{ background: 'rgba(10, 10, 10, 0.2)', borderRadius: '8px' }}>
                      <Pie
                        data={typeDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({
                          name,
                          percent,
                          x,
                          y
                        }) => {
                          return (
                            <text
                              x={x}
                              y={y}
                              fill="rgba(255, 255, 255, 0.95)"
                              fontSize={14}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontWeight="500"
                            >
                              {(percent * 100).toFixed(0)}%
                            </text>
                          );
                        }}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {typeDistribution.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={<CustomTooltip />}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', pl: 3 }}>
                  {typeDistribution.map((type, index) => (
                    <Box 
                      key={type.name} 
                      sx={{
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 1, 
                        py: 1,
                        px: 2,
                        borderRadius: 1,
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.1)'
                        }
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          width: 16,
                          height: 16,
                          backgroundColor: COLORS[index % COLORS.length],
                          marginRight: 12,
                          borderRadius: '2px',
                        }}
                      />
                      <span style={{ flex: 1, fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>{type.name}</span>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>{type.value} traces</span>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          )}
          
          {fullScreenChart === 'callCounts' && (
            <Box sx={{ height: '100%' }}>
              <Typography 
                variant="h5" 
                sx={{
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  mb: 2,
                  background: 'linear-gradient(90deg, #FFFFFF 30%, rgba(255, 255, 255, 0.7) 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Function Call Counts
              </Typography>
              <Box sx={{ height: 'calc(100% - 50px)' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={functionPerformance}
                    margin={{ top: 30, right: 30, left: 20, bottom: 70 }}
                    style={{ background: 'rgba(10, 10, 10, 0.2)', borderRadius: '8px', padding: '10px' }}
                    barGap={4}
                    barCategoryGap={16}
                  >
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                    <XAxis
                      dataKey="name"
                      tick={{ 
                        fill: 'rgba(255, 255, 255, 0.85)', 
                        fontSize: 11 
                      }}
                      tickLine={false}
                      height={70}
                      interval={0}
                      tickFormatter={formatFunctionName}
                      textAnchor="end"
                      angle={-30}
                    />
                    <YAxis 
                      tick={{ fill: 'rgba(255, 255, 255, 0.85)' }}
                    />
                    <Tooltip 
                      content={<CustomTooltip />}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={50}
                      wrapperStyle={{ 
                        color: 'rgba(255, 255, 255, 0.85)',
                        paddingTop: '10px',
                        fontSize: '13px',
                        fontWeight: 500
                      }}
                    />
                    <Bar dataKey="totalCalls" name="Total Calls" fill="#82ca9d" radius={[3, 3, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          )}
        </Box>
      </Modal>
    </Box>
  );
};

export default Performance; 