import os
import uuid
import numpy as np
import nibabel as nib
from scipy.ndimage import gaussian_filter

from dotenv import load_dotenv
load_dotenv()

from app import app, db
from models import SampleData
from db_loading.get_db_filter_ids import gen_display_nifti

# Directory paths for Docker volumes - relative to the /app working directory
INPUT_DIR = '/app/filestore/test_db_nifti'
OUT_DIR = '/app/filestore/nifti_display_cache'

def generate_display_nifti(filter_id, options):
    """
    Generate a display NIfTI file by averaging all the NIfTI files
    that correspond to the IDs matching the filter criteria.
    
    Args:
        filter_id (str): Unique ID for this filter combination, used to name the output file
        options (list): List of selected filter options
    
    Returns:
        str: Path to the generated NIfTI file
    """
    # Make sure output directory exists
    os.makedirs(OUT_DIR, exist_ok=True)
    
    # Generate output file path
    out_path = os.path.join(OUT_DIR, f"{filter_id}.nii.gz")
    
    # Check if this filter has already been processed
    if os.path.exists(out_path):
        print(f"Display NIfTI already exists for filter {filter_id}")
        return out_path
    
    # Use the filter function to get list of IDs that match the criteria
    with app.app_context():
        id_list = gen_display_nifti(options)
        
    if not id_list:
        print(f"No matching records found for the filter options {options}")
        return None
    
    # Keep track of successful loads
    loaded_volumes = []
    first_affine = None
    
    # Load and accumulate all the NIfTI volumes
    for sample_id in id_list:
        nifti_path = os.path.join(INPUT_DIR, f"{sample_id}.nii.gz")
        
        if not os.path.exists(nifti_path):
            print(f"Warning: NIfTI file not found for ID {sample_id}")
            continue
            
        try:
            img = nib.load(nifti_path)
            vol = img.get_fdata()
            
            # Store the first affine to use for output
            if first_affine is None:
                first_affine = img.affine
                
            loaded_volumes.append(vol)
        except Exception as e:
            print(f"Error loading NIfTI for ID {sample_id}: {e}")
    
    if not loaded_volumes:
        print("No valid NIfTI files found to process")
        return None
    
    # Average all volumes
    combined_volume = np.zeros_like(loaded_volumes[0])
    for vol in loaded_volumes:
        # Ensure all volumes have the same shape before adding
        if vol.shape == combined_volume.shape:
            combined_volume += vol
    
    # Divide by number of volumes to get average
    num_volumes = len(loaded_volumes)
    if num_volumes > 0:
        combined_volume /= num_volumes
    
    # Create and save the new NIfTI
    output_img = nib.Nifti1Image(combined_volume, first_affine)
    nib.save(output_img, out_path)
    
    print(f"Created display NIfTI at {out_path} from {num_volumes} matching volumes")
    return out_path

# Test the function when run directly
if __name__ == "__main__":
    print("Testing generate_display_nifti function")

    # override the default paths
    INPUT_DIR = '../filestore/test_db_nifti'
    OUT_DIR = '../filestore/nifti_display_cache'
    
    # Create a small test case to check paths and logic
    os.makedirs(INPUT_DIR, exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)
    
    # Check if sample files exist
    nifti_files = [f for f in os.listdir(INPUT_DIR) if f.endswith('.nii.gz')]
    print(f"Found {len(nifti_files)} NIfTI files in {INPUT_DIR}")
    
    if nifti_files:
        print("Running a test with filter options:")
        
        # Generate a test filter ID
        test_filter_id = str(uuid.uuid4())
        print(f"Filter ID: {test_filter_id}")
        
        # Test with Lung cancer and small tumors
        test_options = ["Lung", "Small (<1cm)"]
        print(f"Filter options: {test_options}")
        
        # Run the function
        output_path = generate_display_nifti(test_filter_id, test_options)
        
        if output_path:
            print(f"Test successful! Output NIfTI created at {output_path}")
            
            # Verify the file exists
            if os.path.exists(output_path):
                file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
                print(f"File size: {file_size_mb:.2f} MB")
            else:
                print("Error: Output file was not created")
        else:
            print("Test failed: No output file was generated")
    else:
        print("Cannot run full test - no NIfTI files found")
    
    print("Testing complete")
    
    # Generate a default aggregate NIfTI file with all entries
    print("\n=== Generating Default Aggregate NIfTI ===")
    with app.app_context():
        # Use empty list to get all entries (no filters)
        default_filter_id = 'default_id'
        default_options = []
        
        # Remove existing file if it exists to force regeneration
        default_output_path = os.path.join(OUT_DIR, f"{default_filter_id}.nii.gz")
        if os.path.exists(default_output_path):
            os.remove(default_output_path)
            print(f"Removed existing default NIfTI at {default_output_path}")
        
        # Generate the aggregate NIfTI
        result_path = generate_display_nifti(default_filter_id, default_options)
        
        if result_path:
            print(f"Successfully created default aggregate NIfTI at {result_path}")
            
            # Also copy to the location expected by the viewer blueprint
            compressed_nifti_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'compressed_nifti_files')
            os.makedirs(compressed_nifti_dir, exist_ok=True)
            
            viewer_path = os.path.join(compressed_nifti_dir, f"filter_{default_filter_id}.nii.gz")
            
            # Use shutil to copy file
            import shutil
            shutil.copy2(result_path, viewer_path)
            print(f"Copied to viewer location: {viewer_path}")
        else:
            print("Failed to create default aggregate NIfTI")