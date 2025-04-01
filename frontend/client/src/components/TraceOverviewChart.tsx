import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import TraceVisualizer from './TraceVisualizer';
import { getTraces } from '../services/api';

const TraceOverviewChart: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [traceData, setTraceData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTraceData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch the most recent trace for visualization
        const tracesResponse = await getTraces(1); // Just get the most recent one for the overview
        
        if (tracesResponse.traces && tracesResponse.traces.length > 0) {
          // Get the first trace as our sample
          setTraceData(tracesResponse.traces[0]);
        } else {
          setError('No trace data available for visualization.');
        }
      } catch (err) {
        console.error('Error fetching trace data:', err);
        setError('Failed to load trace data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTraceData();
  }, []);

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
        mb: 3
      }}
    >
      <Box sx={{ p: 2.5 }}>
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            fontWeight: 600,
            letterSpacing: '-0.01em',
            mb: 1
          }}
        >
          Trace Visualization
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            mb: 3
          }}
        >
          Latest trace execution flow visualization
        </Typography>
      </Box>

      <Box sx={{ height: 500, position: 'relative' }}>
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
            }}
          >
            <Typography color="error">{error}</Typography>
          </Box>
        ) : traceData ? (
          <TraceVisualizer data={traceData} title="Latest Trace" />
        ) : (
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
            <Typography>No trace data available.</Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default TraceOverviewChart; 