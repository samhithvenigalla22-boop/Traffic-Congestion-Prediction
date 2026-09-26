import os
import sys
import time
import nbformat as nbf
from nbconvert.preprocessors import ExecutePreprocessor

def main():
    # 1. Regenerate fresh unexecuted notebook
    print("Step 1: Building notebook...")
    sys.path.insert(0, os.path.dirname(__file__))
    from generate_complete_notebook import build_notebook
    nb_path = build_notebook()
    print(f"Notebook generated at: {nb_path}")

    # 2. Read notebook
    with open(nb_path, "r", encoding="utf-8") as f:
        nb = nbf.read(f, as_version=4)

    print(f"Executing {len(nb.cells)} cells in notebook...")
    start_time = time.time()

    ep = ExecutePreprocessor(timeout=600, kernel_name='python3')
    
    # Set execution path to the project root directory
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    
    try:
        ep.preprocess(nb, {'metadata': {'path': project_root}})
        print(f"Execution successful in {time.time() - start_time:.2f} seconds!")
    except Exception as e:
        print(f"Execution failed: {e}")
        # Save what we have so far
        with open(nb_path, "w", encoding="utf-8") as f:
            nbf.write(nb, f)
        sys.exit(1)

    # 3. Save executed notebook with all outputs and figures embedded
    with open(nb_path, "w", encoding="utf-8") as f:
        nbf.write(nb, f)
    
    size_kb = os.path.getsize(nb_path) / 1024
    print(f"Successfully saved executed notebook: {nb_path} ({size_kb:.1f} KB)")

if __name__ == "__main__":
    main()
