# Tensorscope Frontend

This directory contains the web interface for Tensorscope, which consists of:

1. A backend API server (Express.js) that provides trace and evaluation data
2. A frontend web application (React) that visualizes the data

## Directory Structure

- `server/`: Backend API server code
- `client/`: Frontend web application code

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm (usually comes with Node.js)

### Installation

Install all dependencies for both the backend and frontend:

```bash
# Install root dependencies, including concurrently for running both services
npm install

# Install server dependencies
npm run install:server

# Install client dependencies
npm run install:client

# Or do all of the above in one command
npm run install:all
```

## Running the Web Interface

Start both the backend API server and frontend web application:

```bash
npm run start
```

This will:
- Start the backend API server on port 3002
- Start the frontend web application on port 5173

Once running, you can open your browser and go to:
- http://localhost:5173

## Development Commands

### Running Server Only

```bash
npm run start:server
```

### Running Client Only

```bash
npm run start:client
```

### Building for Production

```bash
npm run build
```

This will create a production build of the client application in the `client/dist` directory.

## Troubleshooting

### Port Conflicts

If you have services already running on ports 3002 or 5173, you may see errors when starting the web interface. To resolve this:

1. For the backend server, modify the port in `server/index.ts`
2. For the frontend, modify the port in the `client/vite.config.ts` file and update the proxy configuration to match the backend port 