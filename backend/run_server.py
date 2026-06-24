import os
import sys
import subprocess

# Ensure the backend directory is in the Python search path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)
os.environ["PYTHONPATH"] = current_dir + os.pathsep + os.environ.get("PYTHONPATH", "")

# Extract the port from environment variables (Render sets this dynamically)
port = os.environ.get("PORT", "8000")

# Build the execution command using the current Python executable
cmd = [
    sys.executable,
    "-m",
    "uvicorn",
    "app.main:app",
    "--host",
    "0.0.0.0",
    "--port",
    port
]

print(f"[Run Server] Executing command: {' '.join(cmd)}")
sys.stdout.flush()

try:
    # Execute uvicorn as a subprocess and exit with its return code
    exit_code = subprocess.call(cmd)
    sys.exit(exit_code)
except Exception as e:
    print(f"[Run Server] Fatal error launching uvicorn: {e}")
    sys.stdout.flush()
    sys.exit(1)
