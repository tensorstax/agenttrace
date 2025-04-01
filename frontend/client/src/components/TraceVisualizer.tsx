import React, { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography, IconButton, Tooltip, Fade, Button } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import JsonViewer from './JsonViewer';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

interface TraceVisualizerProps {
  data: any;
  title?: string;
}

// Node types for different trace elements
enum NodeType {
  ROOT = 'root',
  FUNCTION = 'function',
  ARGUMENT = 'argument',
  TOOL = 'tool',
  RESULT = 'result',
  OTHER = 'other'
}

// Interface for nodes in our visualization
interface TraceNode {
  id: string;
  type: NodeType;
  label: string;
  data: any;
  children: TraceNode[];
  parent?: TraceNode;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  collapsed?: boolean;
  level?: number;
}

// Parse trace data into a hierarchical structure
const parseTraceData = (data: any): TraceNode => {
  // Helper function to create nodes recursively
  const createNode = (
    data: any, 
    id: string, 
    type: NodeType, 
    parentNode?: TraceNode, 
    level: number = 0
  ): TraceNode => {
    let label = id;
    
    // Determine node label based on data type and content
    if (typeof data === 'object' && data !== null) {
      if (data.name) {
        label = data.name;
      } else if (data.input_message) {
        label = 'Input: ' + data.input_message.substring(0, 30) + (data.input_message.length > 30 ? '...' : '');
      } else if (data.type) {
        label = data.type;
      } else if (data.function) {
        label = data.function;
      } else if (id.includes('-')) {
        // For child nodes, use the last part of the ID which is the key name
        const parts = id.split('-');
        label = parts[parts.length - 1];
      }
    } else if (typeof data === 'string') {
      label = data.substring(0, 30) + (data.length > 30 ? '...' : '');
    }

    // Create the node
    const node: TraceNode = {
      id,
      type,
      label,
      data,
      children: [],
      parent: parentNode,
      collapsed: false,
      level
    };

    // Process trace data hierarchically
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      // First, handle the main function call if it exists
      if (data.function) {
        const functionNode = createNode(
          { name: data.function },
          `${id}-function`,
          NodeType.FUNCTION,
          node,
          level + 1
        );
        node.children.push(functionNode);
      }

      // Then handle input arguments
      if (data.args || data.kwargs) {
        const argsNode = createNode(
          { ...data.args, ...data.kwargs },
          `${id}-args`,
          NodeType.ARGUMENT,
          node,
          level + 1
        );
        node.children.push(argsNode);

        // Further process args and kwargs to show their structure
        processObjectProperties(argsNode.data, argsNode, level + 2);
      }

      // Handle tools/steps in sequence
      if (data.tools && Array.isArray(data.tools)) {
        data.tools.forEach((tool: Record<string, any>, index: number) => {
          const toolNode = createNode(
            tool,
            `${id}-tool-${index}`,
            NodeType.TOOL,
            node,
            level + 1
          );
          node.children.push(toolNode);
          
          // Further process each tool to show its structure
          processObjectProperties(tool, toolNode, level + 2);
        });
      }

      // Handle the result
      if (data.result) {
        const resultNode = createNode(
          data.result,
          `${id}-result`,
          NodeType.RESULT,
          node,
          level + 1
        );
        node.children.push(resultNode);
        
        // Further process the result to show its structure
        processObjectProperties(resultNode.data, resultNode, level + 2);
      }

      // Process all other properties that haven't been handled above
      const processedKeys = ['function', 'args', 'kwargs', 'tools', 'result'];
      Object.entries(data).forEach(([key, value]) => {
        if (!processedKeys.includes(key) && typeof value === 'object' && value !== null) {
          const childNode = createNode(
            value,
            `${id}-${key}`,
            NodeType.OTHER,
            node,
            level + 1
          );
          node.children.push(childNode);
          
          // Recursively process this property
          processObjectProperties(value, childNode, level + 2);
        }
      });
    }

    return node;
  };

  // Helper function to process all properties of an object recursively
  const processObjectProperties = (
    data: any, 
    parentNode: TraceNode, 
    level: number
  ) => {
    if (!data || typeof data !== 'object') return;
    
    if (Array.isArray(data)) {
      // For arrays, create a node for each item
      data.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          const childNode = createNode(
            item,
            `${parentNode.id}-${index}`,
            NodeType.OTHER,
            parentNode,
            level
          );
          parentNode.children.push(childNode);
          
          // Recursively process this item
          processObjectProperties(item, childNode, level + 1);
        }
      });
    } else {
      // For objects, create a node for each property
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          const childNode = createNode(
            value,
            `${parentNode.id}-${key}`,
            NodeType.OTHER,
            parentNode,
            level
          );
          parentNode.children.push(childNode);
          
          // Recursively process this property
          processObjectProperties(value, childNode, level + 1);
        }
      });
    }
  };

  // Start with a root node
  return createNode(data, 'root', NodeType.ROOT, undefined, 0);
};

// Calculate layout for the visualization
const calculateLayout = (
  rootNode: TraceNode, 
  nodeWidth: number = 160, // Reduced further
  nodeHeight: number = 32, // Reduced further
  horizontalSpacing: number = 40, // Reduced further
  verticalSpacing: number = 36  // Reduced further
): TraceNode => {
  // First, calculate dimensions for all nodes and their subtrees
  const calculateDimensions = (node: TraceNode): { width: number; height: number } => {
    if (node.collapsed || node.children.length === 0) {
      node.width = nodeWidth;
      node.height = nodeHeight;
      return { width: nodeWidth, height: nodeHeight };
    }

    let totalHeight = 0;
    let maxChildWidth = 0;

    node.children.forEach(child => {
      const childDims = calculateDimensions(child);
      totalHeight += childDims.height + verticalSpacing;
      maxChildWidth = Math.max(maxChildWidth, childDims.width);
    });

    totalHeight = totalHeight > 0 ? totalHeight - verticalSpacing : nodeHeight;

    node.width = nodeWidth + horizontalSpacing + maxChildWidth;
    node.height = Math.max(nodeHeight, totalHeight);
    
    return { width: node.width || nodeWidth, height: node.height || nodeHeight };
  };

  // Then, assign coordinates to each node in a sequential flow
  const assignCoordinates = (node: TraceNode, startX: number = 0, startY: number = 0): void => {
    node.x = startX;
    node.y = startY + (node.height || nodeHeight) / 2 - nodeHeight / 2;

    if (node.collapsed || node.children.length === 0) {
      return;
    }

    let currentY = startY;
    let currentX = startX + nodeWidth + horizontalSpacing;
    
    node.children.forEach((child, index) => {
      // For sequential layout, stack children vertically and slightly to the right
      assignCoordinates(
        child, 
        currentX,
        currentY
      );
      currentY += (child.height || nodeHeight) + verticalSpacing;
    });
  };

  calculateDimensions(rootNode);
  assignCoordinates(rootNode);
  
  return rootNode;
};

const TraceVisualizer: React.FC<TraceVisualizerProps> = ({ data, title = "Trace Visualization" }) => {
  const [copied, setCopied] = useState(false);
  const [rootNode, setRootNode] = useState<TraceNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<TraceNode | null>(null);
  const [zoom, setZoom] = useState(0.7); // Start more zoomed out
  const [pan, setPan] = useState({ x: 50, y: 50 }); // Start with some initial pan
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullScreen, setIsFullScreen] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Parse the trace data and calculate layout
  useEffect(() => {
    if (data) {
      const parsedRoot = parseTraceData(data);
      // Initialize with root level expanded but deeper levels collapsed by default
      const initializeNodes = (node: TraceNode, level: number = 0) => {
        // Only the first two levels expanded by default
        node.collapsed = level > 1;
        node.children.forEach(child => initializeNodes(child, level + 1));
      };
      initializeNodes(parsedRoot);
      const layoutRoot = calculateLayout(parsedRoot);
      setRootNode(layoutRoot);
    }
  }, [data]);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNodeClick = (node: TraceNode) => {
    // Toggle node collapse state
    if (node.children.length > 0) {
      const updatedRoot = { ...rootNode! };
      
      // Find the node in the updated tree
      const findAndToggleNode = (searchNode: TraceNode): boolean => {
        if (searchNode.id === node.id) {
          searchNode.collapsed = !searchNode.collapsed;
          return true;
        }
        
        for (const child of searchNode.children) {
          if (findAndToggleNode(child)) {
            return true;
          }
        }
        
        return false;
      };
      
      findAndToggleNode(updatedRoot);
      
      // Recalculate layout
      const layoutRoot = calculateLayout(updatedRoot);
      setRootNode(layoutRoot);
    }
    
    setSelectedNode(node);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
    
    // When entering full screen, expand all nodes for better visibility
    if (!isFullScreen && rootNode) {
      const updatedRoot = { ...rootNode };
      const expandAll = (node: TraceNode) => {
        node.collapsed = false;
        node.children.forEach(child => expandAll(child));
      };
      expandAll(updatedRoot);
      const layoutRoot = calculateLayout(updatedRoot);
      setRootNode(layoutRoot);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle mouse wheel for zoom
  const handleWheel = (e: React.WheelEvent) => {
    // Prevent default behavior
    e.preventDefault();
    
    // Check if it's a pinch gesture (ctrl key is pressed or deltaY is non-standard)
    const isPinch = e.ctrlKey || Math.abs(e.deltaY) % 1 !== 0;
    
    if (isPinch) {
      // For pinch gestures, zoom based on deltaY
      const scaleFactor = 0.05;
      const newZoom = zoom * (1 - Math.sign(e.deltaY) * scaleFactor);
      
      // Clamp zoom between 0.1 and 2
      setZoom(Math.min(Math.max(newZoom, 0.1), 2));
      
      // Adjust pan to zoom towards cursor position
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const scaleDiff = newZoom / zoom - 1;
        
        setPan(prev => ({
          x: prev.x - mouseX * scaleDiff,
          y: prev.y - mouseY * scaleDiff
        }));
      }
    } else {
      // For regular wheel, pan vertically
      setPan(prev => ({
        x: prev.x,
        y: prev.y - e.deltaY
      }));
    }
  };

  // Color map for different node types
  const getNodeColor = (type: NodeType) => {
    switch (type) {
      case NodeType.ROOT: return '#1E88E5';     // Bright blue
      case NodeType.FUNCTION: return '#43A047'; // Green
      case NodeType.ARGUMENT: return '#FB8C00'; // Orange
      case NodeType.TOOL: return '#E53935';     // Red
      case NodeType.RESULT: return '#8E24AA';   // Purple
      default: return '#546E7A';                // Gray
    }
  };

  // Render each node in the visualization
  const renderNode = (node: TraceNode) => {
    if (!node.x || !node.y) return null;
    
    const isSelected = selectedNode?.id === node.id;
    const nodeColor = getNodeColor(node.type);
    const nodeWidth = 160; // Make consistent with calculation
    const nodeHeight = 32; // Make consistent with calculation
    const hasChildren = node.children.length > 0;
    
    return (
      <g key={node.id}>
        {/* Connection lines to children */}
        {!node.collapsed && node.children.map(child => (
          <g key={`line-${node.id}-${child.id}`}>
            <path
              d={`M ${node.x! + nodeWidth} ${node.y! + nodeHeight / 2} 
                   C ${node.x! + nodeWidth + 20} ${node.y! + nodeHeight / 2},
                     ${child.x! - 20} ${child.y! + nodeHeight / 2},
                     ${child.x!} ${child.y! + nodeHeight / 2}`}
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth={1.5}
              fill="none"
            />
          </g>
        ))}
        
        {/* Node */}
        <g 
          transform={`translate(${node.x}, ${node.y})`} 
          onClick={() => handleNodeClick(node)}
          style={{ cursor: 'pointer' }}
        >
          <rect
            width={nodeWidth}
            height={nodeHeight}
            rx={4}
            ry={4}
            fill={nodeColor}
            stroke={isSelected ? "white" : "rgba(255, 255, 255, 0.1)"}
            strokeWidth={isSelected ? 2 : 1}
            opacity={0.9}
          />
          
          {/* Node label */}
          <text
            x={10}
            y={nodeHeight / 2 + 4} // Adjusted for smaller height
            fill="white"
            fontSize={11} // Smaller font
            fontFamily="'SF Mono', monospace"
            textAnchor="start"
            fontWeight={isSelected ? "bold" : "normal"}
          >
            {node.label.length > 20 ? node.label.substring(0, 20) + "..." : node.label}
          </text>
          
          {/* Expand/collapse indicator */}
          {hasChildren && (
            <g transform={`translate(${nodeWidth - 16}, ${nodeHeight / 2})`}>
              <circle r={7} fill="rgba(255, 255, 255, 0.2)" />
              <text
                x={0}
                y={3}
                fontSize={12}
                fontFamily="sans-serif"
                textAnchor="middle"
                fill="white"
              >
                {node.collapsed ? "+" : "-"}
              </text>
            </g>
          )}
        </g>
      </g>
    );
  };

  // Recursively render the node and its visible children
  const renderNodeTree = (node: TraceNode): React.ReactNode[] => {
    if (!node) return [];
    
    const nodeElement = renderNode(node);
    const elements: React.ReactNode[] = nodeElement ? [nodeElement] : [];
    
    if (!node.collapsed) {
      node.children.forEach(child => {
        elements.push(...renderNodeTree(child));
      });
    }
    
    return elements;
  };

  // Add a function to toggle all nodes
  const toggleAllNodes = (collapse: boolean) => {
    if (!rootNode) return;
    
    const updatedRoot = { ...rootNode };
    
    // Recursively set all nodes to collapsed or expanded
    const setNodeCollapse = (node: TraceNode, isCollapsed: boolean) => {
      node.collapsed = isCollapsed;
      node.children.forEach(child => setNodeCollapse(child, isCollapsed));
    };
    
    setNodeCollapse(updatedRoot, collapse);
    
    // Recalculate layout
    const layoutRoot = calculateLayout(updatedRoot);
    setRootNode(layoutRoot);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 2,
        backgroundColor: '#0a0a0a', // Matching the dialog dark background
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <Typography variant="h6" sx={{ color: 'white' }}>
          {title || 'Trace Visualization'}
        </Typography>
        <Box>
          {/* Expand/Collapse All button */}
          <Tooltip title="Expand All" arrow>
            <IconButton
              size="small"
              onClick={() => toggleAllNodes(false)}
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': { color: 'white', backgroundColor: 'rgba(255, 255, 255, 0.05)' }
              }}
            >
              <KeyboardArrowDownIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Collapse All" arrow>
            <IconButton
              size="small"
              onClick={() => toggleAllNodes(true)}
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': { color: 'white', backgroundColor: 'rgba(255, 255, 255, 0.05)' }
              }}
            >
              <KeyboardArrowUpIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          {/* Zoom controls */}
          <Tooltip title="Zoom in" arrow>
            <IconButton
              size="small"
              onClick={handleZoomIn}
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': { color: 'white', backgroundColor: 'rgba(255, 255, 255, 0.05)' }
              }}
            >
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom out" arrow>
            <IconButton
              size="small"
              onClick={handleZoomOut}
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': { color: 'white', backgroundColor: 'rgba(255, 255, 255, 0.05)' }
              }}
            >
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset view" arrow>
            <IconButton
              size="small"
              onClick={handleResetView}
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': { color: 'white', backgroundColor: 'rgba(255, 255, 255, 0.05)' }
              }}
            >
              <RestartAltIcon fontSize="small" />
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
        </Box>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          p: 2,
          backgroundColor: '#050505', // Even darker for the content area
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100% - 60px)', // Account for header height
        }}
      >
        {/* SVG visualization */}
        <Box 
          sx={{ 
            flex: '1 1 auto', 
            overflow: 'hidden',
            backgroundColor: 'rgba(18, 18, 18, 0.4)',
            position: 'relative',
            minHeight: '500px',
            height: '100%',
            borderRadius: 1,
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel} // Add wheel event handler
        >
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <g 
              transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
            >
              {rootNode && renderNodeTree(rootNode)}
            </g>
          </svg>
          
          {/* Empty state when no nodes are visible */}
          {(!rootNode || rootNode.children.length === 0) && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.5)',
              }}
            >
              <Typography variant="body1">
                No nodes available for visualization
              </Typography>
            </Box>
          )}
          
          {/* Instructions overlay */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 10,
              left: 10,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              p: 1,
              borderRadius: 1,
              fontSize: '0.75rem',
              opacity: 0.7,
            }}
          >
            {isFullScreen 
              ? "All nodes are expanded in full screen mode. Click nodes to collapse specific branches."
              : "Click nodes to expand/collapse. Use Expand All/Collapse All buttons for quick control. Drag to pan. Pinch or use mouse wheel to zoom."
            }
          </Box>
        </Box>
        
        {/* Details panel for selected node */}
        {selectedNode && (
          <Box 
            sx={{ 
              width: '300px', 
              borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
              overflow: 'auto',
              p: 2,
              backgroundColor: 'rgba(18, 18, 18, 0.5)'
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{ mb: 1, color: 'white', fontWeight: 600 }}
            >
              {selectedNode.label}
            </Typography>
            <JsonViewer 
              data={selectedNode.data} 
              title="Node Details" 
              maxHeight="415px"
              defaultExpanded={true}
            />
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default TraceVisualizer; 