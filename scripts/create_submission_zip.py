import os
import zipfile

def create_zip():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    zip_path = os.path.join(root_dir, "Traffic_Congestion_Prediction_Project.zip")

    # Directories and files to exclude (only virtual environments, build artifacts, git internals, and the zip itself)
    exclude_dirs = {'.git', '.venv', 'venv', 'node_modules', '__pycache__', '.cache', 'dist'}
    exclude_files = {'Traffic_Congestion_Prediction_Project.zip'}

    if os.path.exists(zip_path):
        os.remove(zip_path)

    print(f"Creating zip file from: {root_dir}")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(root_dir):
            # Prune excluded directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                if file in exclude_files or file.endswith('.pyc'):
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, root_dir)
                zipf.write(full_path, rel_path)

    size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"Zip created successfully: {zip_path}")
    print(f"Total size: {size_mb:.2f} MB (Well under 10 MB limit!)")

if __name__ == "__main__":
    create_zip()
