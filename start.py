#!/usr/bin/env python3
import os
import sys
import subprocess
import threading
import shutil
import platform
import time

# ANSI Color Codes for Premium Terminal Aesthetics
CLR_HEADER = "\033[95m"
CLR_INFO = "\033[94m"
CLR_SUCCESS = "\033[92m"
CLR_WARNING = "\033[93m"
CLR_FAIL = "\033[91m"
CLR_END = "\033[0m"
CLR_BOLD = "\033[1m"

COLOR_BACKEND = "\033[95m" # Purple
COLOR_FRONTEND = "\033[96m" # Cyan
COLOR_SYSTEM = "\033[90m" # Grey

def print_banner():
    banner = f"""
{CLR_HEADER}{CLR_BOLD}=====================================================================
            __     __            _ _    _    ___ 
            \\ \\   / /_ _ _   _  | | |  / \\  |_ _|
             \\ \\ / / _` | | | | | | | / _ \\  | | 
              \\ V / (_| | |_| | | | |/ ___ \\ | | 
               \\_/ \\__,_|\\__,_|_|_|_/_/   \\_\\___|

          Private Document Intelligence Offline RAG Suite
====================================================================={CLR_END}
"""
    print(banner)

def get_python_executable(venv_path):
    """Returns the python executable path inside the virtual environment."""
    if platform.system() == "Windows":
        return os.path.join(venv_path, "Scripts", "python.exe")
    return os.path.join(venv_path, "bin", "python")

def get_pip_executable(venv_path):
    """Returns the pip executable path inside the virtual environment."""
    if platform.system() == "Windows":
        return os.path.join(venv_path, "Scripts", "pip.exe")
    return os.path.join(venv_path, "bin", "pip")

def setup_environment():
    """Checks and sets up the Python virtual environment and dependencies."""
    print(f"{CLR_INFO}[Environment]{CLR_END} Checking Python environment...")
    
    # 1. Verify python version (3.10+)
    if sys.version_info < (3, 10):
        print(f"{CLR_FAIL}[Error] VaultAI requires Python 3.10 or higher. Current version: {platform.python_version()}{CLR_END}")
        sys.exit(1)
        
    # 2. Check virtual environment
    workspace_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(workspace_dir, "backend")
    
    venv_options = [
        os.path.join(backend_dir, ".venv"),
        os.path.join(backend_dir, "venv"),
        os.path.join(workspace_dir, ".venv"),
        os.path.join(workspace_dir, "venv")
    ]
    
    venv_path = None
    for path in venv_options:
        py_exe = get_python_executable(path)
        if os.path.exists(py_exe):
            venv_path = path
            break
            
    if not venv_path:
        print(f"{CLR_INFO}[Environment]{CLR_END} Virtual environment not found. Creating one at {CLR_BOLD}backend/.venv{CLR_END}...")
        target_venv = os.path.join(backend_dir, ".venv")
        try:
            subprocess.run([sys.executable, "-m", "venv", target_venv], check=True)
            venv_path = target_venv
            print(f"{CLR_SUCCESS}[Environment]{CLR_END} Virtual environment created successfully.")
        except Exception as e:
            print(f"{CLR_FAIL}[Error] Failed to create virtual environment: {e}{CLR_END}")
            sys.exit(1)
            
    py_bin = get_python_executable(venv_path)
    pip_bin = get_pip_executable(venv_path)
    
    # 3. Verify / Install dependencies
    print(f"{CLR_INFO}[Dependencies]{CLR_END} Checking backend packages...")
    reqs_installed = True
    try:
        # Run import check using venv python
        subprocess.run(
            [py_bin, "-c", "import uvicorn, fastapi, chromadb, langchain_core"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=True
        )
    except subprocess.CalledProcessError:
        reqs_installed = False
        
    if not reqs_installed:
        print(f"{CLR_WARNING}[Dependencies]{CLR_END} Missing backend requirements. Installing from requirements.txt...")
        reqs_file = os.path.join(backend_dir, "requirements.txt")
        if not os.path.exists(reqs_file):
            print(f"{CLR_FAIL}[Error] requirements.txt not found at {reqs_file}{CLR_END}")
            sys.exit(1)
        try:
            subprocess.run([pip_bin, "install", "-r", reqs_file], check=True)
            print(f"{CLR_SUCCESS}[Dependencies]{CLR_END} Backend dependencies installed successfully.")
        except Exception as e:
            print(f"{CLR_FAIL}[Error] Failed to install backend dependencies: {e}{CLR_END}")
            sys.exit(1)
    else:
        print(f"{CLR_SUCCESS}[Dependencies]{CLR_END} All backend dependencies are satisfied.")
        
    # 4. Check Node.js and NPM
    npm_available = shutil.which("npm") is not None
    if not npm_available:
        print(f"{CLR_WARNING}[Warning]{CLR_END} Node.js / NPM is not installed or not in PATH.")
        print("          Only backend services and unified mode (if already built) will work.")
        
    return venv_path, npm_available

def run_backend(venv_path, reload=True, wait=False):
    """Runs the FastAPI backend server."""
    py_bin = get_python_executable(venv_path)
    backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
    
    cmd = [
        py_bin, "-m", "uvicorn", "app.main:app",
        "--host", "127.0.0.1",
        "--port", "8000"
    ]
    if reload:
        cmd.append("--reload")
        
    print(f"{CLR_INFO}[Launcher]{CLR_END} Starting FastAPI backend at http://127.0.0.1:8000 ...")
    
    if wait:
        try:
            subprocess.run(cmd, cwd=backend_dir)
        except KeyboardInterrupt:
            print(f"\n{CLR_INFO}[Launcher]{CLR_END} Backend server stopped.")
    else:
        return subprocess.Popen(
            cmd,
            cwd=backend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )

def run_frontend_dev(wait=False):
    """Runs the Vite frontend dev server."""
    frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")
    
    # Check node_modules
    node_modules_path = os.path.join(frontend_dir, "node_modules")
    if not os.path.exists(node_modules_path):
        print(f"{CLR_INFO}[Dependencies]{CLR_END} Installing frontend dependencies (npm install)...")
        try:
            subprocess.run(["npm", "install"], cwd=frontend_dir, check=True)
            print(f"{CLR_SUCCESS}[Dependencies]{CLR_END} Frontend dependencies installed.")
        except Exception as e:
            print(f"{CLR_FAIL}[Error] Failed to run npm install: {e}{CLR_END}")
            sys.exit(1)
            
    cmd = ["npm", "run", "dev"]
    print(f"{CLR_INFO}[Launcher]{CLR_END} Starting Vite dev server at http://localhost:3000 ...")
    
    if wait:
        try:
            subprocess.run(cmd, cwd=frontend_dir, shell=True)
        except KeyboardInterrupt:
            print(f"\n{CLR_INFO}[Launcher]{CLR_END} Frontend dev server stopped.")
    else:
        return subprocess.Popen(
            cmd,
            cwd=frontend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            shell=True
        )

def build_frontend():
    """Builds the React frontend production bundle."""
    frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")
    print(f"{CLR_INFO}[Builder]{CLR_END} Running production build (npm run build)...")
    
    # Check node_modules
    node_modules_path = os.path.join(frontend_dir, "node_modules")
    if not os.path.exists(node_modules_path):
        subprocess.run(["npm", "install"], cwd=frontend_dir, check=True)
        
    try:
        subprocess.run(["npm", "run", "build"], cwd=frontend_dir, check=True, shell=True)
        print(f"{CLR_SUCCESS}[Builder]{CLR_END} Production build created successfully.")
        return True
    except Exception as e:
        print(f"{CLR_FAIL}[Error] Frontend build failed: {e}{CLR_END}")
        return False

def run_tests(venv_path):
    """Runs backend integration tests."""
    py_bin = get_python_executable(venv_path)
    backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
    
    print(f"{CLR_INFO}[Test Runner]{CLR_END} Running backend integration tests...")
    try:
        subprocess.run([py_bin, "test_api.py"], cwd=backend_dir, check=True)
        print(f"\n{CLR_SUCCESS}[Test Runner] All tests passed!{CLR_END}")
    except subprocess.CalledProcessError:
        print(f"\n{CLR_FAIL}[Test Runner] Some tests failed.{CLR_END}")
    except KeyboardInterrupt:
        print(f"\n{CLR_WARNING}[Test Runner] Test execution aborted by user.{CLR_END}")

def log_reader(pipe, prefix, color):
    """Reads lines from a subprocess pipe and prints them with a custom colored prefix."""
    try:
        for line in iter(pipe.readline, ''):
            if not line:
                break
            print(f"{color}{prefix}{CLR_END} {line.rstrip()}")
    except Exception:
        pass

def run_concurrently(venv_path):
    """Runs both frontend dev and backend concurrently, merging log output."""
    backend_process = None
    frontend_process = None
    
    try:
        # Start backend
        backend_process = run_backend(venv_path, reload=True, wait=False)
        # Start frontend
        frontend_process = run_frontend_dev(wait=False)
        
        # Start log reader threads
        t_back = threading.Thread(target=log_reader, args=(backend_process.stdout, "[Backend]", COLOR_BACKEND), daemon=True)
        t_front = threading.Thread(target=log_reader, args=(frontend_process.stdout, "[Frontend]", COLOR_FRONTEND), daemon=True)
        
        t_back.start()
        t_front.start()
        
        print(f"\n{CLR_SUCCESS}[Launcher] Both servers running concurrently!{CLR_END}")
        print(f" - {COLOR_BACKEND}Backend API:{CLR_END} http://127.0.0.1:8000")
        print(f" - {COLOR_FRONTEND}Frontend Web Interface:{CLR_END} http://localhost:3000")
        print(f"{COLOR_SYSTEM}Press Ctrl+C to terminate both servers concurrently...{CLR_END}\n")
        
        # Keep main thread alive
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print(f"\n{CLR_WARNING}[System] Shutting down concurrent services...{CLR_END}")
    finally:
        # Gracefully terminate child processes
        if backend_process:
            backend_process.terminate()
            backend_process.wait()
        if frontend_process:
            frontend_process.terminate()
            frontend_process.wait()
        print(f"{CLR_SUCCESS}[System] All processes stopped.{CLR_END}")

def main():
    print_banner()
    venv_path, npm_available = setup_environment()
    
    while True:
        print(f"\n{CLR_BOLD}Select a startup option:{CLR_END}")
        print(f" [{CLR_INFO}1{CLR_END}] Start Backend Server Only (http://127.0.0.1:8000)")
        if npm_available:
            print(f" [{CLR_INFO}2{CLR_END}] Start Frontend Dev Server Only (http://localhost:3000)")
            print(f" [{CLR_INFO}3{CLR_END}] Start Both Services Concurrently (Recommended)")
            print(f" [{CLR_INFO}4{CLR_END}] Build Frontend & Serve via FastAPI (Unified Python App)")
        else:
            print(f" [2] Start Frontend Dev Server Only (NPM unavailable)")
            print(f" [3] Start Both Services Concurrently (NPM unavailable)")
            print(f" [{CLR_INFO}4{CLR_END}] Serve Existing Frontend via FastAPI (Unified Python App)")
        print(f" [{CLR_INFO}5{CLR_END}] Run Backend Integration Tests")
        print(f" [{CLR_INFO}6{CLR_END}] Exit")
        
        try:
            choice = input(f"\n{CLR_BOLD}Option [1-6]: {CLR_END}").strip()
        except (KeyboardInterrupt, EOFError):
            print(f"\n{CLR_WARNING}Exiting VaultAI Control Panel...{CLR_END}")
            break
            
        if choice == "1":
            run_backend(venv_path, reload=True, wait=True)
        elif choice == "2":
            if not npm_available:
                print(f"{CLR_FAIL}[Error] NPM is not installed. Cannot run frontend dev server.{CLR_END}")
                continue
            run_frontend_dev(wait=True)
        elif choice == "3":
            if not npm_available:
                print(f"{CLR_FAIL}[Error] NPM is not installed. Cannot run frontend.{CLR_END}")
                continue
            run_concurrently(venv_path)
        elif choice == "4":
            if npm_available:
                success = build_frontend()
                if not success:
                    print(f"{CLR_FAIL}[Error] Frontend build failed. Cannot launch unified server.{CLR_END}")
                    continue
            else:
                workspace_dir = os.path.dirname(os.path.abspath(__file__))
                dist_dir = os.path.join(workspace_dir, "frontend", "dist")
                if not os.path.exists(dist_dir):
                    print(f"{CLR_FAIL}[Error] Unified mode requires building first, but no build folder found at {dist_dir}{CLR_END}")
                    continue
                print(f"{CLR_WARNING}[Warning]{CLR_END} Serving pre-existing build folder since NPM is missing.")
            
            print(f"\n{CLR_SUCCESS}[Launcher] Launching unified application!{CLR_END}")
            print(f"Access everything (both Frontend UI and Backend APIs) at: {CLR_BOLD}http://127.0.0.1:8000{CLR_END}\n")
            run_backend(venv_path, reload=False, wait=True)
        elif choice == "5":
            run_tests(venv_path)
        elif choice == "6":
            print(f"{CLR_SUCCESS}Goodbye!{CLR_END}")
            break
        else:
            print(f"{CLR_FAIL}[Error] Invalid option. Please select 1 to 6.{CLR_END}")

if __name__ == "__main__":
    main()
