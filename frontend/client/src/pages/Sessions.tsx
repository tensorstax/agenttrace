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
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { getSessions, getTraces } from '../services/api';
import { Trace } from '../types';
import LoadingIndicator from '../components/LoadingIndicator';

interface SessionData {
  id: string;
  firstTrace?: Trace;
  lastTrace?: Trace;
  traceCount: number;
  types: Set<string>;
  functions: Set<string>;
  tags: Set<string>;
}

const Sessions: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [sessionsData, setSessionsData] = useState<SessionData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

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
            traceCount: traces.length, // This is just the count of fetched traces, not total
            types,
            functions,
            tags,
          };
        });

        const sessionsWithData = await Promise.all(sessionDataPromises);
        setSessionsData(sessionsWithData);
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
    return (
      session.id.toLowerCase().includes(searchLower) ||
      Array.from(session.functions).some((func) => func.toLowerCase().includes(searchLower)) ||
      Array.from(session.tags).some((tag) => tag.toLowerCase().includes(searchLower))
    );
  });

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  if (loading) {
    return <LoadingIndicator message="Loading sessions..." />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: 'white' }}>
        Trace Sessions
      </Typography>

      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        borderRadius: 2, 
        bgcolor: '#121212', // Changed to darker background
      }}>
        <Typography variant="h6" gutterBottom sx={{ color: 'white', fontWeight: 500 }}>
          Search
        </Typography>
        <TextField
          fullWidth
          placeholder="Search sessions by ID, function name, or tag..."
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
            mb: 3, 
            maxWidth: '600px', 
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

        <Grid container spacing={3}>
          {filteredSessions.map((session) => (
            <Grid sx={{ gridColumn: { xs: 'span 12', md: 'span 6', lg: 'span 4' } }} key={session.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  borderRadius: 2,
                  bgcolor: '#0a0a0a', // Almost full black
                  boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: '#101010', // Very subtle hover effect
                    borderColor: '#FF6325',
                    boxShadow: '0 3px 10px rgba(255, 99, 37, 0.15)'
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      mb: 2.5,
                      pb: 1.5,
                      borderBottom: '1px solid rgba(255, 255, 255, 0.07)'
                    }}
                  >
                    <Typography 
                      variant="h6" 
                      noWrap 
                      title={session.id}
                      sx={{ 
                        fontWeight: 600,
                        maxWidth: '70%',
                        fontSize: '1rem',
                        color: 'white'
                      }}
                    >
                      {session.id.length > 16 ? `${session.id.slice(0, 16)}...` : session.id}
                    </Typography>
                    <Chip 
                      label={`${session.traceCount}+ traces`}
                      size="small"
                      sx={{ 
                        height: 24, 
                        fontWeight: 500,
                        bgcolor: 'rgba(255,255,255,0.05)',
                        color: 'rgba(255, 255, 255, 0.7)',
                        borderRadius: '12px'
                      }}
                    />
                  </Box>

                  <Box sx={{ mb: 2.5 }}>
                    <Box sx={{ display: 'flex', mb: 1.5 }}>
                      <Typography 
                        variant="body2" 
                        color="rgba(255, 255, 255, 0.6)" 
                        sx={{ 
                          width: '60px', 
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'flex-start'
                        }}
                      >
                        First:
                      </Typography>
                      {session.firstTrace ? (
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'normal', display: 'block', color: 'white' }}>
                            {format(parseISO(session.firstTrace.timestamp), 'MMM d, yyyy')}
                          </Typography>
                          <Typography variant="caption" color="rgba(255, 255, 255, 0.6)">
                            {format(parseISO(session.firstTrace.timestamp), 'h:mm a')}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="rgba(255, 255, 255, 0.6)">
                          —
                        </Typography>
                      )}
                    </Box>
                    
                    <Box sx={{ display: 'flex' }}>
                      <Typography 
                        variant="body2" 
                        color="rgba(255, 255, 255, 0.6)" 
                        sx={{ 
                          width: '60px', 
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'flex-start'
                        }}
                      >
                        Last:
                      </Typography>
                      {session.lastTrace ? (
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'normal', display: 'block', color: 'white' }}>
                            {format(parseISO(session.lastTrace.timestamp), 'MMM d, yyyy')}
                          </Typography>
                          <Typography variant="caption" color="rgba(255, 255, 255, 0.6)">
                            {format(parseISO(session.lastTrace.timestamp), 'h:mm a')}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="rgba(255, 255, 255, 0.6)">
                          —
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2.5 }}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.7px',
                        color: 'rgba(255, 255, 255, 0.5)',
                        mb: 1
                      }}
                    >
                      FUNCTIONS
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.7, ml: 0.5 }}>
                      {Array.from(session.functions)
                        .slice(0, 3)
                        .map((func) => (
                          <Chip 
                            key={func} 
                            label={func} 
                            size="small"
                            sx={{ 
                              height: 26,
                              fontSize: '0.75rem',
                              bgcolor: 'rgba(255,255,255,0.07)',
                              color: 'white',
                              '& .MuiChip-label': { 
                                px: 1.2
                              }
                            }}
                          />
                        ))}
                      {session.functions.size > 3 && (
                        <Chip 
                          label={`+${session.functions.size - 3} more`} 
                          size="small"
                          variant="outlined"
                          sx={{ 
                            height: 26,
                            fontSize: '0.75rem',
                            borderColor: 'rgba(255,255,255,0.1)',
                            color: 'rgba(255, 255, 255, 0.5)'
                          }}
                        />
                      )}
                    </Stack>
                  </Box>

                  <Box>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.7px',
                        color: 'rgba(255, 255, 255, 0.5)',
                        mb: 1
                      }}
                    >
                      TAGS
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.7, ml: 0.5 }}>
                      {Array.from(session.tags)
                        .slice(0, 5)
                        .map((tag) => {
                          // Determine chip color based on tag content
                          let bgColor = 'rgba(255,255,255,0.07)';
                          let textColor = 'white';
                          
                          // Convert tag to lowercase for case-insensitive comparison
                          const tagLower = tag.toLowerCase();
                          
                          if (tagLower === 'complete' || tagLower === 'completed') {
                            bgColor = 'rgba(76, 175, 80, 0.15)';
                            textColor = '#66ff66';
                          } else if (tagLower === 'error' || tagLower === 'failed') {
                            bgColor = 'rgba(244, 67, 54, 0.15)';
                            textColor = '#ff7066';
                          } else if (tagLower === 'warning') {
                            bgColor = 'rgba(255, 152, 0, 0.15)';
                            textColor = '#ffb74d';
                          } else if (tagLower === 'info') {
                            bgColor = 'rgba(33, 150, 243, 0.15)';
                            textColor = '#64b5f6';
                          } else if (tagLower === 'pending' || tagLower === 'in progress') {
                            bgColor = 'rgba(33, 150, 243, 0.15)';
                            textColor = '#64b5f6';
                          } else if (tagLower === 'eval-test') {
                            bgColor = 'rgba(255,255,255,0.07)';
                            textColor = 'white';
                          } else if (tagLower === 'test') {
                            bgColor = 'rgba(255,255,255,0.07)';
                            textColor = 'white';
                          }
                          
                          return (
                            <Chip 
                              key={tag} 
                              label={tag} 
                              size="small"
                              sx={{
                                height: '26px',
                                bgcolor: bgColor,
                                color: textColor,
                                borderRadius: '12px',
                                fontWeight: 500,
                                '& .MuiChip-label': {
                                  px: 1.2,
                                  fontSize: '0.75rem'
                                }
                              }}
                            />
                          );
                        })}
                      {session.tags.size > 5 && (
                        <Chip 
                          label={`+${session.tags.size - 5} more`} 
                          size="small" 
                          variant="outlined"
                          sx={{
                            height: '26px',
                            fontSize: '0.75rem',
                            borderColor: 'rgba(255,255,255,0.1)',
                            color: 'rgba(255, 255, 255, 0.5)',
                            '& .MuiChip-label': {
                              px: 1.2
                            }
                          }}
                        />
                      )}
                    </Stack>
                  </Box>
                </CardContent>
                <CardActions sx={{ px: 2.5, pb: 2 }}>
                  <Button
                    variant="contained"
                    size="small"
                    component={Link}
                    to={`/traces?session=${encodeURIComponent(session.id)}`}
                    sx={{ 
                      textTransform: 'none',
                      borderRadius: '8px',
                      boxShadow: 'none',
                      bgcolor: '#FF6325',
                      '&:hover': {
                        bgcolor: '#e55a20'
                      }
                    }}
                  >
                    View Traces
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {filteredSessions.length === 0 && (
          <Box 
            sx={{ 
              py: 5, 
              textAlign: 'center',
              borderRadius: 2,
              bgcolor: 'rgba(0,0,0,0.2)',
              border: '1px dashed rgba(255, 255, 255, 0.1)',
              my: 2
            }}
          >
            <Typography variant="h6" color="white">
              No sessions found matching your search criteria.
            </Typography>
            <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" sx={{ mt: 1 }}>
              Try adjusting your search terms or check back later.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default Sessions; 