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

# Directory paths
INPUT_DIR = '../filestore/test_db_nifti'
OUT_DIR = '../filestore/nifti_display_cache'

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