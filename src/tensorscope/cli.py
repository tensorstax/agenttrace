"""
Command-line interface for Tensorscope.
"""

import argparse
import os
import sys
import webbrowser
import subprocess
import time
import signal
import importlib.resources as pkg_resources

def get_frontend_dir():
    """Get the path to the frontend directory."""
    # In a proper installation, the frontend directory will be in the package
    return os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend')

def start_command(args):
    """Start the Tensorscope frontend server."""
    print("Starting Tensorscope frontend...")
    
    frontend_dir = get_frontend_dir()
    if not os.path.exists(frontend_dir):
        print(f"Error: Frontend directory not found at {frontend_dir}")
        return 1
    
    # Navigate to the frontend directory and start the servers
    try:
        # Run npm install if requested
        if args.install:
            print("Installing frontend dependencies...")
            subprocess.run(['npm', 'run', 'install:all'], cwd=frontend_dir, check=True)
        
        # Start both servers
        process = subprocess.Popen(
            ['npm', 'run', 'start'],
            cwd=frontend_dir,
            stdout=subprocess.PIPE if args.quiet else None,
            stderr=subprocess.STDOUT if args.quiet else None
        )
        
        # Give the servers a moment to start
        time.sleep(3)
        
        # Open browser if requested
        if not args.no_browser:
            webbrowser.open(f"http://localhost:5173")
        
        print("Tensorscope web interface is running.")
        print("- Frontend: http://localhost:5173")
        print("- API: http://localhost:3002")
        print("\nPress Ctrl+C to stop the servers")
        
        # Keep the process running until interrupted
        process.wait()
        
    except KeyboardInterrupt:
        print("\nShutting down Tensorscope servers...")
        if 'process' in locals():
            process.terminate()
            process.wait()
    except subprocess.CalledProcessError as e:
        print(f"Error running npm commands: {e}")
        return 1
    except Exception as e:
        print(f"Error starting Tensorscope frontend: {e}")
        return 1
    
    return 0

def main():
    """Main entry point for the CLI."""
    parser = argparse.ArgumentParser(description="Tensorscope command-line interface")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Start command
    start_parser = subparsers.add_parser("start", help="Start the Tensorscope frontend")
    start_parser.add_argument("--no-browser", action="store_true", help="Don't open a browser window")
    start_parser.add_argument("--install", action="store_true", help="Install dependencies before starting")
    start_parser.add_argument("--quiet", action="store_true", help="Suppress npm output")
    
    args = parser.parse_args()
    
    if args.command == "start":
        return start_command(args)
    else:
        parser.print_help()
        return 1

if __name__ == "__main__":
    sys.exit(main()) 