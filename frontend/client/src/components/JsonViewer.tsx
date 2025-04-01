import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, IconButton, Tooltip, Fade } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

interface JsonViewerProps {
  data: any;
  title?: string;
  maxHeight?: string | number;
  defaultExpanded?: boolean;
}

// Recursive component to render JSON with collapsible sections
const JsonNode: React.FC<{ 
  data: any; 
  level: number; 
  isLast: boolean;
  path: string;
  expandedPaths: Set<string>;
  togglePath: (path: string) => void;
}> = ({ data, level, isLast, path, expandedPaths, togglePath }) => {
  const isExpanded = expandedPaths.has(path);
  const indent = level * 16;
  
  // Function to determine if an item is expandable (object or array)
  const isExpandable = (item: any) => {
    return (typeof item === 'object' && item !== null && Object.keys(item).length > 0);
  };
  
  // If data is an array
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <div style={{ paddingLeft: indent, color: '#e6e6e6' }}>
          []
          {!isLast && <span style={{ color: '#e6e6e6' }}>,</span>}
        </div>
      );
    }
    
    return (
      <>
        <div style={{ paddingLeft: indent }}>
          {isExpandable(data) ? (
            <IconButton 
              size="small" 
              onClick={() => togglePath(path)}
              sx={{ 
                p: 0, 
                mr: 0.5, 
                color: 'rgba(255, 255, 255, 0.7)',
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }}
            >
              <KeyboardArrowRightIcon fontSize="small" />
            </IconButton>
          ) : null}
          <span style={{ color: '#64B5F6' }}>[</span>
          {!isExpanded && <span style={{ color: '#9E9E9E' }}>...</span>}
        </div>
        
        {isExpanded && data.map((item, index) => (
          <JsonNode 
            key={`${path}-${index}`}
            data={item} 
            level={level + 1} 
            isLast={index === data.length - 1}
            path={`${path}-${index}`}
            expandedPaths={expandedPaths}
            togglePath={togglePath}
          />
        ))}
        
        <div style={{ paddingLeft: indent }}>
          <span style={{ color: '#64B5F6' }}>]</span>
          {!isLast && <span style={{ color: '#e6e6e6' }}>,</span>}
        </div>
      </>
    );
  }
  
  // If data is an object
  if (typeof data === 'object' && data !== null) {
    const keys = Object.keys(data);
    
    if (keys.length === 0) {
      return (
        <div style={{ paddingLeft: indent, color: '#e6e6e6' }}>
          {}
          {!isLast && <span style={{ color: '#e6e6e6' }}>,</span>}
        </div>
      );
    }
    
    return (
      <>
        <div style={{ paddingLeft: indent }}>
          {isExpandable(data) ? (
            <IconButton 
              size="small" 
              onClick={() => togglePath(path)}
              sx={{ 
                p: 0, 
                mr: 0.5, 
                color: 'rgba(255, 255, 255, 0.7)',
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }}
            >
              <KeyboardArrowRightIcon fontSize="small" />
            </IconButton>
          ) : null}
          <span style={{ color: '#90CAF9' }}>{`{`}</span>
          {!isExpanded && <span style={{ color: '#9E9E9E' }}>...</span>}
        </div>
        
        {isExpanded && keys.map((key, index) => (
          <div key={`${path}-${key}`} style={{ paddingLeft: indent + 16 }}>
            <span style={{ color: '#F06292' }}>{`"${key}"`}</span>
            <span style={{ color: '#e6e6e6' }}>: </span>
            {isExpandable(data[key]) ? (
              <JsonNode 
                data={data[key]} 
                level={0} 
                isLast={index === keys.length - 1}
                path={`${path}-${key}`}
                expandedPaths={expandedPaths}
                togglePath={togglePath}
              />
            ) : (
              <JsonValue value={data[key]} isLast={index === keys.length - 1} />
            )}
          </div>
        ))}
        
        <div style={{ paddingLeft: indent }}>
          <span style={{ color: '#90CAF9' }}>{`}`}</span>
          {!isLast && <span style={{ color: '#e6e6e6' }}>,</span>}
        </div>
      </>
    );
  }
  
  // If data is a primitive value
  return <JsonValue value={data} isLast={isLast} paddingLeft={indent} />;
};

// Component to render primitive JSON values with proper syntax highlighting
const JsonValue: React.FC<{ value: any; isLast: boolean; paddingLeft?: number }> = ({ 
  value, 
  isLast,
  paddingLeft
}) => {
  let color = '#e6e6e6'; // default
  let displayValue: React.ReactNode = String(value);
  
  if (typeof value === 'string') {
    color = '#FFCC80'; // orange for strings
    displayValue = `"${value}"`;
  } else if (typeof value === 'number') {
    color = '#81C784'; // green for numbers
  } else if (typeof value === 'boolean') {
    color = '#BA68C8'; // purple for booleans
  } else if (value === null) {
    color = '#EF5350'; // red for null
    displayValue = 'null';
  }
  
  return (
    <div style={{ display: 'inline', paddingLeft: paddingLeft || 0 }}>
      <span style={{ color }}>
        {displayValue}
      </span>
      {!isLast && <span style={{ color: '#e6e6e6' }}>,</span>}
    </div>
  );
};

const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  title,
  maxHeight = '500px',
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => {
    // Start with all paths expanded by default
    const allPaths = new Set<string>(['root']);
    
    // Helper function to recursively collect all possible paths
    const collectPaths = (obj: any, currentPath: string = 'root') => {
      if (typeof obj !== 'object' || obj === null) return;
      
      allPaths.add(currentPath);
      
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          collectPaths(item, `${currentPath}-${index}`);
        });
      } else {
        Object.entries(obj).forEach(([key, value]) => {
          collectPaths(value, `${currentPath}-${key}`);
        });
      }
    };
    
    collectPaths(data);
    return allPaths;
  });

  const formattedJson = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const togglePath = (path: string) => {
    const newExpandedPaths = new Set(expandedPaths);
    if (newExpandedPaths.has(path)) {
      newExpandedPaths.delete(path);
    } else {
      newExpandedPaths.add(path);
    }
    setExpandedPaths(newExpandedPaths);
  };

  // New function to expand or collapse all paths
  const toggleAllPaths = (expand: boolean) => {
    if (expand) {
      // Expand all by recollecting all paths
      const allPaths = new Set<string>(['root']);
      
      const collectPaths = (obj: any, currentPath: string = 'root') => {
        if (typeof obj !== 'object' || obj === null) return;
        
        allPaths.add(currentPath);
        
        if (Array.isArray(obj)) {
          obj.forEach((item, index) => {
            collectPaths(item, `${currentPath}-${index}`);
          });
        } else {
          Object.entries(obj).forEach(([key, value]) => {
            collectPaths(value, `${currentPath}-${key}`);
          });
        }
      };
      
      collectPaths(data);
      setExpandedPaths(allPaths);
    } else {
      // Collapse all except root
      setExpandedPaths(new Set(['root']));
    }
  };
  
  // Auto-expand all nodes once the component is mounted
  useEffect(() => {
    // Force expanding all nodes when component mounts or when data changes
    toggleAllPaths(true);
  }, [data]);

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2.5,
        overflow: 'hidden',
        mb: 2.5,
        backdropFilter: 'blur(10px)',
        backgroundColor: '#1E1E1E',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: '#1E1E1E',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        },
        ...(isFullScreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          margin: 0,
          borderRadius: 0,
          maxHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }),
      }}
    >
      <Box
        sx={{
          p: 1.5,
          pl: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backdropFilter: 'blur(10px)',
          borderBottom: expanded ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
          transition: 'all 0.2s ease',
          backgroundColor: '#1E1E1E',
        }}
      >
        <Typography 
          variant="subtitle1" 
          fontWeight="600"
          sx={{
            letterSpacing: '-0.025em',
            backgroundImage: 'linear-gradient(90deg, #FFFFFF 30%, rgba(255, 255, 255, 0.7) 100%)',
            backgroundClip: 'text',
            textFillColor: 'transparent',
          }}
        >
          {title || 'JSON Data'}
        </Typography>
        <Box>
          {/* Expand/Collapse all paths buttons */}
          <Tooltip 
            title="Expand All" 
            arrow
            TransitionComponent={Fade}
            TransitionProps={{ timeout: 600 }}
          >
            <IconButton
              size="small"
              onClick={() => toggleAllPaths(true)}
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                transition: 'color 0.2s ease',
                '&:hover': {
                  color: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                }
              }}
            >
              <KeyboardArrowDownIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip 
            title="Collapse All" 
            arrow
            TransitionComponent={Fade}
            TransitionProps={{ timeout: 600 }}
          >
            <IconButton
              size="small"
              onClick={() => toggleAllPaths(false)}
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                transition: 'color 0.2s ease',
                '&:hover': {
                  color: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                }
              }}
            >
              <KeyboardArrowUpIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          {/* Existing buttons */}
          <Tooltip 
            title={copied ? "Copied!" : "Copy to clipboard"} 
            arrow
            TransitionComponent={Fade}
            TransitionProps={{ timeout: 600 }}
          >
            <IconButton
              size="small"
              onClick={handleCopy}
              sx={{ 
                color: copied ? 'success.main' : 'rgba(255, 255, 255, 0.7)',
                transition: 'color 0.2s ease',
                '&:hover': {
                  color: copied ? 'success.main' : 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                }
              }}
            >
              {copied ? <CheckCircleIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip 
            title={isFullScreen ? "Exit full screen" : "Full screen"} 
            arrow
            TransitionComponent={Fade}
            TransitionProps={{ timeout: 600 }}
          >
            <IconButton
              size="small"
              onClick={toggleFullScreen}
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  color: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                }
              }}
            >
              {isFullScreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip 
            title={expanded ? "Collapse" : "Expand"} 
            arrow
            TransitionComponent={Fade}
            TransitionProps={{ timeout: 600 }}
          >
            <IconButton
              size="small"
              onClick={toggleExpanded}
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                transition: 'all 0.2s ease',
                transform: expanded ? 'rotate(0deg)' : 'rotate(0deg)',
                '&:hover': {
                  color: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                }
              }}
            >
              {expanded ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {expanded && (
        <Box
          sx={{
            p: 2,
            maxHeight: isFullScreen ? 'calc(100vh - 60px)' : maxHeight,
            overflow: 'auto',
            backgroundColor: '#1E1E1E',
            fontFamily: '"SF Mono", "Roboto Mono", "Menlo", monospace',
            fontSize: '0.875rem',
            fontWeight: 400,
            lineHeight: 1.5,
            color: 'rgba(255, 255, 255, 0.9)',
            flexGrow: isFullScreen ? 1 : 0,
          }}
        >
          <JsonNode 
            data={data} 
            level={0} 
            isLast={true} 
            path="root"
            expandedPaths={expandedPaths}
            togglePath={togglePath}
          />
        </Box>
      )}
    </Paper>
  );
};

export default JsonViewer; 