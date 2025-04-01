import React from 'react';
import { Box, Paper, Typography, IconButton, Tooltip, Fade } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface CodeViewerProps {
  code: string;
  title?: string;
  language?: string;
}

const CodeViewer: React.FC<CodeViewerProps> = ({ 
  code, 
  title = 'Code', 
  language = 'python'
}) => {
  const [copied, setCopied] = React.useState(false);

  // Function to format code by replacing escaped newlines and indentation
  const formatCode = (code: string) => {
    // Remove outer quotes if present
    let formattedCode = code.trim();
    if ((formattedCode.startsWith('"') && formattedCode.endsWith('"')) || 
        (formattedCode.startsWith("'") && formattedCode.endsWith("'"))) {
      formattedCode = formattedCode.substring(1, formattedCode.length - 1);
    }

    // Handle the specific case of score_functions_code format
    if (formattedCode.includes('def scoring_function')) {
      formattedCode = formattedCode
        .replace(/\\n/g, '\n')  // Replace escaped newlines
        .replace(/\\"/g, '"')  // Replace escaped double quotes
        .replace(/\\'/g, "'")  // Replace escaped single quotes
        .replace(/\\t/g, '    ')  // Replace tabs with 4 spaces
        .replace(/\\x1b\[93m/g, '')  // Remove terminal color codes
        .replace(/\\x1b\[0m/g, '')   // Remove terminal color codes
        .replace(/\\033\[93m/g, '')  // Remove terminal color codes
        .replace(/\\033\[0m/g, '');  // Remove terminal color codes
    } else {
      // Standard escaped character replacement
      formattedCode = formattedCode
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\t/g, '    ');
    }
    
    return formattedCode;
  };

  // Function to apply simple syntax highlighting for Python code
  const highlightPythonCode = (code: string) => {
    if (language !== 'python') return code;
    
    // Instead of doing multiple replacements that can conflict with each other,
    // we'll use a more structured approach to prevent HTML nesting issues
    
    const escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Define color mapping
    const colors = {
      keyword: '#FF79C6', // Pink for keywords
      function: '#50FA7B', // Green for function calls
      string: '#F1FA8C',  // Yellow for strings 
      comment: '#6272A4', // Blue-gray for comments
      number: '#BD93F9',  // Purple for numbers
    };
    
    // Process line by line for better control
    const highlightedLines = escapedCode.split('\n').map(line => {
      // Highlight keywords first
      const keywords = ['def', 'if', 'else', 'elif', 'for', 'while', 'return', 'import',
                        'from', 'as', 'class', 'try', 'except', 'finally', 'with', 'in',
                        'and', 'or', 'not', 'True', 'False', 'None'];
      
      let processedLine = line;
      
      // Highlight comments (do this first since they take precedence)
      const commentMatch = processedLine.match(/(#.*)$/);
      if (commentMatch) {
        const beforeComment = processedLine.substring(0, commentMatch.index);
        const comment = `<span style="color: ${colors.comment}">${commentMatch[1]}</span>`;
        processedLine = beforeComment + comment;
      }
      
      // Highlight strings - we need to identify string boundaries first to avoid processing inside strings
      const stringRanges: [number, number][] = [];
      let inString = false;
      let stringStart = -1;
      let quoteChar: string | null = null;
      
      for (let i = 0; i < processedLine.length; i++) {
        const char = processedLine[i];
        
        if (!inString && (char === '"' || char === "'")) {
          inString = true;
          quoteChar = char;
          stringStart = i;
        } else if (inString && char === quoteChar && processedLine[i-1] !== '\\') {
          inString = false;
          stringRanges.push([stringStart, i]);
        }
      }
      
      // Highlight the detected strings
      let result = '';
      let lastEnd = 0;
      
      for (const [start, end] of stringRanges) {
        // Add the text before the string
        result += processedLine.substring(lastEnd, start);
        
        // Add the highlighted string
        const stringContent = processedLine.substring(start, end + 1);
        result += `<span style="color: ${colors.string}">${stringContent}</span>`;
        
        lastEnd = end + 1;
      }
      
      // Add remaining text
      result += processedLine.substring(lastEnd);
      processedLine = result;
      
      // Process keywords (only outside strings)
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
        processedLine = processedLine.replace(regex, `<span style="color: ${colors.keyword}">$1</span>`);
      }
      
      // Highlight function calls (only outside strings)
      processedLine = processedLine.replace(/(\w+)(?=\()/g, `<span style="color: ${colors.function}">$1</span>`);
      
      // Highlight numbers (only outside strings)
      processedLine = processedLine.replace(/\b(\d+)\b/g, `<span style="color: ${colors.number}">$1</span>`);
      
      return processedLine;
    });
    
    return highlightedLines.join('\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formatCode(code));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2.5,
        overflow: 'hidden',
        mb: 2.5,
        backgroundColor: '#1E1E1E',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: '#1E1E1E',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        },
      }}
    >
      <Box
        sx={{
          p: 1.5,
          pl: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
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
          {title}
        </Typography>
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

      <Box
        component="pre"
        sx={{
          p: 2,
          m: 0,
          maxHeight: '500px',
          overflow: 'auto',
          backgroundColor: '#1E1E1E',
          fontFamily: '"SF Mono", "Roboto Mono", "Menlo", monospace',
          fontSize: '0.875rem',
          fontWeight: 400,
          lineHeight: 1.5,
          color: 'rgba(255, 255, 255, 0.9)',
          whiteSpace: 'pre-wrap',
        }}
      >
        {language === 'python' ? (
          <Box 
            component="code"
            dangerouslySetInnerHTML={{ 
              __html: highlightPythonCode(formatCode(code))
            }}
          />
        ) : (
          <Box component="code">
            {formatCode(code)}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default CodeViewer; 