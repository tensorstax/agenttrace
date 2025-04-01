import React from 'react';
import {
  DataGrid,
  GridColDef,
  GridRowsProp,
  GridToolbar,
  GridColumnVisibilityModel,
} from '@mui/x-data-grid';
import { Box, Paper, alpha } from '@mui/material';

interface DataTableProps {
  rows: GridRowsProp;
  columns: GridColDef[];
  loading?: boolean;
  pageSize?: number;
  height?: string | number;
  initialState?: {
    columns?: {
      columnVisibilityModel?: GridColumnVisibilityModel;
    };
  };
}

const DataTable: React.FC<DataTableProps> = ({
  rows,
  columns,
  loading = false,
  pageSize = 25,
  height = 600,
  initialState,
}) => {
  return (
    <Box sx={{ width: '100%', height }}>
      <Paper
        elevation={0}
        sx={{
          height: '100%',
          width: '100%',
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(25, 25, 25, 0.7)',
          borderRadius: 3,
          border: '1px solid rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            backgroundColor: 'rgba(30, 30, 30, 0.75)',
          },
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize,
              },
            },
            ...initialState,
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 300 },
              sx: {
                p: 2,
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                '& .MuiButton-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  },
                },
                '& .MuiInputBase-root': {
                  backgroundColor: 'rgba(45, 45, 45, 0.5)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 1.5,
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(55, 55, 55, 0.6)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                  },
                  '&.Mui-focused': {
                    borderColor: alpha('#0A84FF', 0.7),
                    boxShadow: `0 0 0 1px ${alpha('#0A84FF', 0.2)}`,
                  },
                },
              }
            },
          }}
          sx={{
            border: 'none',
            backgroundColor: 'transparent',
            '& .MuiDataGrid-main': {
              backgroundColor: 'rgba(15, 15, 15, 0.3)',
            },
            '& .MuiDataGrid-cell': {
              whiteSpace: 'normal',
              lineHeight: 'normal',
              padding: '12px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              color: 'rgba(255, 255, 255, 0.9)',
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: 'rgba(25, 25, 25, 0.7)',
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: 600,
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 600,
            },
            '& .MuiDataGrid-row': {
              '&:hover': {
                backgroundColor: 'rgba(45, 45, 45, 0.4)',
              },
              '&.Mui-selected': {
                backgroundColor: alpha('#0A84FF', 0.15),
                '&:hover': {
                  backgroundColor: alpha('#0A84FF', 0.25),
                },
              },
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              backgroundColor: 'rgba(25, 25, 25, 0.7)',
            },
            '& .MuiTablePagination-root': {
              color: 'rgba(255, 255, 255, 0.7)',
            },
            '& .MuiButtonBase-root': {
              color: 'rgba(255, 255, 255, 0.7)',
            },
            '& .MuiDataGrid-overlay': {
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(4px)',
            },
            '& .MuiDataGrid-virtualScroller': {
              backgroundColor: 'transparent',
            },
          }}
        />
      </Paper>
    </Box>
  );
};

export default DataTable; 