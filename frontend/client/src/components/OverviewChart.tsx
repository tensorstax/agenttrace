import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  Area
} from 'recharts';
import { format, parseISO, subDays } from 'date-fns';
import { getTraces, getEvalResults, getSessions } from '../services/api';
import { 
  Trace, 
  EvalResult, 
  TraceResponse, 
  EvalResultsResponse,
  SessionResponse
} from '../types';

// Type for our aggregated data
interface OverviewDataPoint {
  date: string;
  traces: number;
  evaluations: number;
  sessions: number;
  display: string;
}

const OverviewChart: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewDataPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasEvals, setHasEvals] = useState(false);

  useEffect(() => {
    const fetchOverviewData = async () => {
      let tracesResponse: TraceResponse | null = null;
      
      try {
        setLoading(true);
        setError(null);
        setHasEvals(false);

        // Fetch the last 30 days of data
        tracesResponse = await getTraces(1000);
        
        // Initialize evaluationsResponse with empty results in case fetching fails
        let evaluationsResponse: EvalResultsResponse = { results: [], count: 0, success: true };
        
        try {
          // Try to fetch evaluations, but don't fail if this doesn't work
          evaluationsResponse = await getEvalResults(undefined, undefined, undefined, 1000);
          // If we got results, set the hasEvals flag to true
          setHasEvals(evaluationsResponse.results && evaluationsResponse.results.length > 0);
        } catch (evalErr) {
          // Log the error but continue with empty evaluations
          console.error('Error fetching evaluation data:', evalErr);
          // Don't set the error state here, we'll continue with empty evaluations
        }
        
        const sessionsResponse = await getSessions(1000);

        // Prepare data structure to hold aggregated data by date
        const aggregatedData: Record<string, OverviewDataPoint> = {};
        
        // Get the date 30 days ago
        const thirtyDaysAgo = subDays(new Date(), 30);
        
        // Initialize data for the last 30 days
        for (let i = 0; i < 30; i++) {
          const date = subDays(new Date(), i);
          const dateKey = format(date, 'yyyy-MM-dd');
          aggregatedData[dateKey] = {
            date: dateKey,
            traces: 0,
            evaluations: 0,
            sessions: 0,
            display: format(date, 'MMM dd')
          };
        }

        // Process traces
        const traces = tracesResponse.traces || [];
        traces.forEach((trace: Trace) => {
          if (trace.timestamp) {
            const date = parseISO(trace.timestamp);
            if (date >= thirtyDaysAgo) {
              const dateKey = format(date, 'yyyy-MM-dd');
              if (aggregatedData[dateKey]) {
                aggregatedData[dateKey].traces += 1;
              }
            }
          }
        });

        // Process evaluations
        const evaluations = evaluationsResponse.results || [];
        evaluations.forEach((evaluation: EvalResult) => {
          if (evaluation.timestamp) {
            const date = parseISO(evaluation.timestamp);
            if (date >= thirtyDaysAgo) {
              const dateKey = format(date, 'yyyy-MM-dd');
              if (aggregatedData[dateKey]) {
                aggregatedData[dateKey].evaluations += 1;
              }
            }
          }
        });

        // Process sessions
        const sessions = sessionsResponse.sessions || [];
        sessions.forEach((sessionId: string) => {
          // For sessions, we might not have timestamps directly
          // We'll just count them for demonstration purposes
          // In a real application, you'd adjust this based on your data model
          const today = format(new Date(), 'yyyy-MM-dd');
          if (aggregatedData[today]) {
            aggregatedData[today].sessions += 1;
          }
        });

        // Convert aggregated data into an array and sort by date
        const chartData = Object.values(aggregatedData).sort((a, b) => 
          a.date.localeCompare(b.date)
        );

        setData(chartData);
      } catch (err) {
        console.error('Error fetching overview data:', err);
        
        // Only show error if we couldn't get any trace data at all and it's not related to missing evals
        if ((!tracesResponse || !tracesResponse.traces) && 
            !(err instanceof Error && 
              (err.message.includes('no such table') || 
               err.message.includes('SQLITE_ERROR') ||
               err.message.includes('TABLE_NOT_FOUND')))) {
          setError('Failed to load overview data. Please try again later.');
        } else {
          // If we have trace data, we can still show a partial chart with evals as 0
          console.warn('Partial data loaded for overview chart, continuing with available data');
          
          // Check if this is the specific error for missing evals table
          if (err instanceof Error && 
              (err.message.includes('no such table') || 
               err.message.includes('SQLITE_ERROR') ||
               err.message.includes('TABLE_NOT_FOUND'))) {
            // Log informational message but don't show an error - we'll still show the chart
            console.info('Evaluations table does not exist yet - showing chart with evals as 0');
          }
          
          // Create minimal chart data with just traces if we have them
          const minimalData: OverviewDataPoint[] = [];
          for (let i = 0; i < 30; i++) {
            const date = subDays(new Date(), i);
            const dateKey = format(date, 'yyyy-MM-dd');
            minimalData.push({
              date: dateKey,
              traces: 0, // Will be updated below if we have trace data
              evaluations: 0,
              sessions: 0,
              display: format(date, 'MMM dd')
            });
          }
          
          // Add any trace data we have
          if (tracesResponse && tracesResponse.traces) {
            const thirtyDaysAgo = subDays(new Date(), 30);
            
            tracesResponse.traces.forEach((trace: Trace) => {
              if (trace.timestamp) {
                const date = parseISO(trace.timestamp);
                if (date >= thirtyDaysAgo) {
                  const dateKey = format(date, 'yyyy-MM-dd');
                  const dataPoint = minimalData.find(dp => dp.date === dateKey);
                  if (dataPoint) {
                    dataPoint.traces += 1;
                  }
                }
              }
            });
          }
          
          // Set the minimal data we were able to construct
          setData(minimalData);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            backgroundColor: 'rgba(25, 25, 25, 0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 1.5,
            p: 1.5,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          }}
        >
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 0.5 }}>
            {format(parseISO(label), 'MMMM d, yyyy')}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Box key={`tooltip-${index}`} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  backgroundColor: entry.color,
                  mr: 1,
                  borderRadius: '50%',
                }}
              />
              <Typography sx={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                {entry.name}: {entry.value}
              </Typography>
            </Box>
          ))}
        </Box>
      );
    }
    return null;
  };

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(25, 25, 25, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        height: '100%',
        p: 2,
        mb: 0,
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          backgroundColor: 'rgba(30, 30, 30, 0.7)',
        }
      }}
    >
      <Typography
        variant="h5"
        gutterBottom
        sx={{
          fontWeight: 600,
          letterSpacing: '-0.01em',
          mb: 0.5,
          pl: 1,
          background: 'linear-gradient(90deg, #FFFFFF 30%, rgba(255, 255, 255, 0.7) 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        System Overview
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: 'text.secondary',
          mb: 1.5,
          pl: 1
        }}
      >
        Traces and evaluations over the last 30 days
        {!hasEvals && (
          <Box component="span" sx={{ display: 'inline-block', ml: 1, color: 'info.main', fontSize: '0.8rem' }}>
            (No evaluations available yet. Run an eval to create data.)
          </Box>
        )}
      </Typography>

      <Box sx={{ height: 400, position: 'relative' }}>
        {loading ? (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress size={40} />
          </Box>
        ) : error ? (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              padding: 3,
              textAlign: 'center'
            }}
          >
            <Typography color="error" gutterBottom>{error}</Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  const dateObj = parseISO(value);
                  return format(dateObj, 'MMM dd');
                }}
                tick={{ fontSize: 12, fill: 'rgba(255, 255, 255, 0.6)' }}
                stroke="rgba(255, 255, 255, 0.1)"
                tickMargin={10}
              />
              <YAxis 
                yAxisId="left" 
                tick={{ fontSize: 12, fill: 'rgba(255, 255, 255, 0.6)' }} 
                stroke="rgba(255, 255, 255, 0.1)"
                tickMargin={5}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12, fill: 'rgba(255, 255, 255, 0.6)' }}
                stroke="rgba(255, 255, 255, 0.1)"
                tickMargin={5}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ 
                  paddingTop: 15,
                  fontSize: '0.875rem', 
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontWeight: 500
                }} 
                iconSize={10}
                iconType="circle"
              />
              <Area
                type="monotone"
                dataKey="traces"
                yAxisId="left"
                fill="#8884d8"
                stroke="#8884d8"
                fillOpacity={0.3}
                activeDot={{ r: 8, strokeWidth: 2 }}
                name="Traces"
                strokeWidth={2}
              />
              <Bar 
                dataKey="sessions" 
                yAxisId="right" 
                fill="#1E88E5" 
                name="Sessions" 
                barSize={26}
                radius={[4, 4, 0, 0]}
                fillOpacity={0.8}
              />
              <Line
                type="monotone"
                dataKey="evaluations"
                yAxisId="left"
                stroke="#4CAF50"
                strokeWidth={3}
                dot={{ strokeWidth: 2, r: 5, fill: "#4CAF50" }}
                activeDot={{ r: 8, strokeWidth: 2 }}
                name="Evaluations"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Paper>
  );
};

export default OverviewChart; 