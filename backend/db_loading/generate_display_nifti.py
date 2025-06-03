import os
import uuid
import numpy as np
import nibabel as nib
from scipy.ndimage import gaussian_filter
from datetime import date

from dotenv import load_dotenv
load_dotenv()

from app import app, db
from models import Patients, TumorMask, NiftiData, DoseMask

# Directory paths for Docker volumes - relative to the /app working directory
INPUT_DIR = '/app/filestore/test_db_nifti'
OUT_DIR = '/app/filestore/nifti_display_cache'

def get_filtered_tumor_ids(criteria):
    """
    Query the database and return tumor IDs that match the filter criteria.
    
    Args:
        criteria (dict): Structured filter criteria based on database models
    
    Returns:
        List of tumor mask IDs that match the filter criteria
    """
    try:
        # Join patients and tumor masks
        query = db.session.query(TumorMask.id).join(
            NiftiData, TumorMask.id == NiftiData.id
        ).join(
            Patients, NiftiData.patient_id == Patients.id
        ).filter(
            NiftiData.series_type == 'tumor_mask'
        )
        
        # Apply patient demographic filters
        if criteria.get('patient_demographics'):
            demographics = criteria['patient_demographics']
            
            # Origin cancer filter
            if demographics.get('origin_cancer'):
                origin_cancers = [item if isinstance(item, str) else item.get('label', str(item)) 
                                for item in demographics['origin_cancer']]
                query = query.filter(Patients.origin_cancer.in_(origin_cancers))
            
            # Sex filter
            if demographics.get('sex'):
                sexes = [item if isinstance(item, str) else item.get('label', str(item)) 
                        for item in demographics['sex']]
                query = query.filter(Patients.sex.in_(sexes))
            
            # Age range filter
            if demographics.get('age_range'):
                age_filters = []
                current_date = date.today()
                for age_range in demographics['age_range']:
                    if isinstance(age_range, dict):
                        min_age = age_range.get('min', 0)
                        max_age = age_range.get('max', 150)
                        # Calculate birth year range
                        max_birth_year = current_date.year - min_age
                        min_birth_year = current_date.year - max_age
                        age_filters.append(
                            db.extract('year', Patients.dob).between(min_birth_year, max_birth_year)
                        )
                if age_filters:
                    query = query.filter(db.or_(*age_filters))
            
            # Height range filter
            if demographics.get('height_range'):
                height_filters = []
                for height_range in demographics['height_range']:
                    if isinstance(height_range, dict):
                        min_height = height_range.get('min', 0)
                        max_height = height_range.get('max', 250)
                        height_filters.append(
                            Patients.height_cm.between(min_height, max_height)
                        )
                if height_filters:
                    query = query.filter(db.or_(*height_filters))
            
            # Weight range filter
            if demographics.get('weight_range'):
                weight_filters = []
                for weight_range in demographics['weight_range']:
                    if isinstance(weight_range, dict):
                        min_weight = weight_range.get('min', 0)
                        max_weight = weight_range.get('max', 200)
                        weight_filters.append(
                            Patients.weight_kg.between(min_weight, max_weight)
                        )
                if weight_filters:
                    query = query.filter(db.or_(*weight_filters))
            
            # Tumor count range filter
            if demographics.get('tumor_count_range'):
                count_filters = []
                for count_range in demographics['tumor_count_range']:
                    if isinstance(count_range, dict):
                        min_count = count_range.get('min', 1)
                        max_count = count_range.get('max', 100)
                        count_filters.append(
                            Patients.tumor_count.between(min_count, max_count)
                        )
                if count_filters:
                    query = query.filter(db.or_(*count_filters))
        
        # Apply clinical data filters
        if criteria.get('clinical_data'):
            clinical = criteria['clinical_data']
            
            # Systolic BP filter
            if clinical.get('systolic_bp_range'):
                bp_filters = []
                for bp_range in clinical['systolic_bp_range']:
                    if isinstance(bp_range, dict):
                        min_bp = bp_range.get('min', 0)
                        max_bp = bp_range.get('max', 300)
                        bp_filters.append(
                            Patients.systolic_bp.between(min_bp, max_bp)
                        )
                if bp_filters:
                    query = query.filter(db.or_(*bp_filters))
            
            # Diastolic BP filter
            if clinical.get('diastolic_bp_range'):
                bp_filters = []
                for bp_range in clinical['diastolic_bp_range']:
                    if isinstance(bp_range, dict):
                        min_bp = bp_range.get('min', 0)
                        max_bp = bp_range.get('max', 200)
                        bp_filters.append(
                            Patients.diastolic_bp.between(min_bp, max_bp)
                        )
                if bp_filters:
                    query = query.filter(db.or_(*bp_filters))
        
        # Apply tumor characteristic filters
        if criteria.get('tumor_characteristics'):
            tumor_chars = criteria['tumor_characteristics']
            
            # Tumor location filter
            if tumor_chars.get('tumor_location'):
                locations = [item if isinstance(item, str) else item.get('label', str(item)) 
                           for item in tumor_chars['tumor_location']]
                query = query.filter(TumorMask.location.in_(locations))
            
            # Tumor volume filter
            if tumor_chars.get('tumor_volume_range'):
                volume_filters = []
                for volume_range in tumor_chars['tumor_volume_range']:
                    if isinstance(volume_range, dict):
                        min_volume = volume_range.get('min', 0)
                        max_volume = volume_range.get('max', 1000)
                        volume_filters.append(
                            TumorMask.volume_mm3.between(min_volume, max_volume)
                        )
                if volume_filters:
                    query = query.filter(db.or_(*volume_filters))
        
        # Apply treatment data filters
        if criteria.get('treatment_data'):
            treatment = criteria['treatment_data']
            
            # Dose range filter - need to join with DoseMask
            if treatment.get('dose_range'):
                # Join with dose mask data through patient relationship
                dose_query = db.session.query(Patients.id).join(
                    NiftiData, NiftiData.patient_id == Patients.id
                ).join(
                    DoseMask, DoseMask.id == NiftiData.id
                ).filter(
                    NiftiData.series_type == 'dose_mask'
                )
                
                dose_filters = []
                for dose_range in treatment['dose_range']:
                    if isinstance(dose_range, dict):
                        min_dose = dose_range.get('min', 0)
                        max_dose = dose_range.get('max', 70)
                        dose_filters.append(
                            DoseMask.max_dose.between(min_dose, max_dose)
                        )
                if dose_filters:
                    dose_query = dose_query.filter(db.or_(*dose_filters))
                
                # Get patient IDs that match dose criteria
                dose_patient_ids = [result.id for result in dose_query.all()]
                if dose_patient_ids:
                    query = query.filter(Patients.id.in_(dose_patient_ids))
                else:
                    # No patients match dose criteria, return empty result
                    return []
        
        # Execute query and return IDs
        results = query.all()
        return [str(result.id) for result in results]
        
    except Exception as e:
        print(f"Error in filtering: {e}")
        return []

def generate_display_nifti(filter_id, criteria):
    """
    Generate a display NIfTI file by averaging all the tumor NIfTI files
    that correspond to the IDs matching the filter criteria.
    
    Args:
        filter_id (str): Unique ID for this filter combination, used to name the output file
        criteria (dict): Structured filter criteria based on database models
    
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
    
    # Use the filter function to get list of tumor IDs that match the criteria
    with app.app_context():
        id_list = get_filtered_tumor_ids(criteria)
        
    if not id_list:
        print(f"No matching tumor records found for the filter criteria")
        return None
    
    # Keep track of successful loads
    loaded_volumes = []
    first_affine = None
    
    # Load and accumulate all the tumor NIfTI volumes
    for tumor_id in id_list:
        nifti_path = os.path.join(INPUT_DIR, f"{tumor_id}.nii.gz")
        
        if not os.path.exists(nifti_path):
            print(f"Warning: Tumor NIfTI file not found for ID {tumor_id}")
            continue
            
        try:
            img = nib.load(nifti_path)
            vol = img.get_fdata()
            
            # Store the first affine to use for output
            if first_affine is None:
                first_affine = img.affine
                
            loaded_volumes.append(vol)
        except Exception as e:
            print(f"Error loading tumor NIfTI for ID {tumor_id}: {e}")
    
    if not loaded_volumes:
        print("No valid tumor NIfTI files found to process")
        return None
    
    # Sum all tumor volumes to create a collective view
    combined_volume = np.zeros_like(loaded_volumes[0])
    for vol in loaded_volumes:
        # Ensure all volumes have the same shape before adding
        if vol.shape == combined_volume.shape:
            combined_volume += vol
    
    # Clip values to prevent overflow (tumors are binary 0/1, so max should be reasonable)
    combined_volume = np.clip(combined_volume, 0, len(loaded_volumes))
    
    # Create and save the new NIfTI
    output_img = nib.Nifti1Image(combined_volume, first_affine)
    nib.save(output_img, out_path)
    
    print(f"Created collective tumor display NIfTI at {out_path} from {len(loaded_volumes)} tumor volumes")
    return out_path

# Generate collective view of all tumors when run as main
if __name__ == "__main__":
    print("=== Generating Collective View of All Tumor Files ===")

    # Override the default paths for local execution
    INPUT_DIR = '../filestore/test_db_nifti'
    OUT_DIR = '../filestore/nifti_display_cache'
    
    # Create directories if they don't exist
    os.makedirs(INPUT_DIR, exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)
    
    # Check available tumor files
    nifti_files = [f for f in os.listdir(INPUT_DIR) if f.endswith('.nii.gz')]
    print(f"Found {len(nifti_files)} NIfTI files in {INPUT_DIR}")
    
    if nifti_files:
        print("\n=== Creating Collective Tumor View (All Tumors) ===")
        
        with app.app_context():
            # Use empty criteria to get all tumor files
            all_tumors_filter_id = 'all_tumors_collective'
            all_tumors_criteria = {}  # Empty criteria = no filters = all tumors
            
            # Remove existing file if it exists to force regeneration
            all_tumors_output_path = os.path.join(OUT_DIR, f"{all_tumors_filter_id}.nii.gz")
            if os.path.exists(all_tumors_output_path):
                os.remove(all_tumors_output_path)
                print(f"Removed existing collective tumor view at {all_tumors_output_path}")
            
            # Generate the collective tumor view
            result_path = generate_display_nifti(all_tumors_filter_id, all_tumors_criteria)
            
            if result_path:
                print(f"Successfully created collective tumor view at {result_path}")
                
                # Get file info
                file_size_mb = os.path.getsize(result_path) / (1024 * 1024)
                print(f"File size: {file_size_mb:.2f} MB")
                
                # Load and analyze the result
                img = nib.load(result_path)
                data = img.get_fdata()
                print(f"Volume shape: {data.shape}")
                print(f"Value range: {data.min():.2f} to {data.max():.2f}")
                print(f"Non-zero voxels: {np.count_nonzero(data):,}")
                
                # Also create a default filter for the web interface
                default_output_path = os.path.join(OUT_DIR, "default_id.nii.gz")
                if os.path.exists(default_output_path):
                    os.remove(default_output_path)
                
                # Copy to default location
                import shutil
                shutil.copy2(result_path, default_output_path)
                print(f"Copied to default filter location: {default_output_path}")
                
            else:
                print("Failed to create collective tumor view")
        
        print("\n=== Testing with Sample Criteria ===")
        
        # Test with specific criteria (e.g., only lung cancer patients)
        sample_criteria = {
            'patient_demographics': {
                'origin_cancer': ['Lung']
            }
        }
        
        sample_filter_id = 'lung_cancer_tumors'
        sample_result = generate_display_nifti(sample_filter_id, sample_criteria)
        
        if sample_result:
            img = nib.load(sample_result)
            data = img.get_fdata()
            print(f"Lung cancer tumor view created with {np.count_nonzero(data):,} non-zero voxels")
        else:
            print("Failed to create lung cancer tumor view")
            
    else:
        print("Cannot run - no NIfTI files found in input directory")
        print(f"Please ensure tumor NIfTI files are present in {INPUT_DIR}")
    
    print("\n=== Collective Tumor View Generation Complete ===")