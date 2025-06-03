import os
import uuid
import numpy as np
import nibabel as nib
from scipy.ndimage import gaussian_filter
from models import Patients, NiftiData, TumorMask, MRIMask, DoseMask
from datetime import date, timedelta
import random
import gc  # For garbage collection

from dotenv import load_dotenv
load_dotenv()

from app import app, db

OUT_DIR = "../filestore/test_db_nifti"
SHAPE   = (31, 100, 100)  # (z, y, x) - 31 slices in z-direction
CURRENT_DATE = date(2025, 6, 3)
BATCH_SIZE = 100  # Process patients in batches to manage memory

# Realistic voxel dimensions for brain MRI (mm per voxel)
VOXEL_SIZE = (3.5, 1.3, 1.3)  # z, y, x (slice thickness, in-plane resolution)

os.makedirs(OUT_DIR, exist_ok=True)

# Pre-calculate coordinate grids once (optimization)
Z_GRID, Y_GRID, X_GRID = np.ogrid[:SHAPE[0], :SHAPE[1], :SHAPE[2]]

# Brain regions and their approximate boundaries in the volume
# SHAPE is (31, 100, 100) = (z, y, x)
BRAIN_REGIONS = {
    "Frontal Lobe": {
        "x": (0, 49),    # Anterior portion (x: 0-99, so 0-49 is anterior half)
        "y": (0, 99),    # Full width (y: 0-99)
        "z": (15, 30)    # Upper portion (z: 0-30, so 15-30 is upper half)
    },
    "Parietal Lobe": {
        "x": (25, 74),   # Middle portion
        "y": (0, 99),    # Full width
        "z": (15, 30)    # Upper portion
    },
    "Temporal Lobe": {
        "x": (0, 49),    # Anterior portion
        "y": (0, 99),    # Full width
        "z": (0, 14)     # Lower portion
    },
    "Occipital Lobe": {
        "x": (50, 99),   # Posterior portion
        "y": (0, 99),    # Full width
        "z": (0, 30)     # Full height
    },
    "Cerebellum": {
        "x": (25, 74),   # Middle portion
        "y": (0, 99),    # Full width
        "z": (0, 9)      # Lower portion
    },
    "Brainstem": {
        "x": (45, 54),   # Very narrow in x
        "y": (45, 54),   # Very narrow in y
        "z": (0, 4)      # Very lower portion
    }
}

# Pre-calculate voxel volume
VOXEL_VOLUME = VOXEL_SIZE[0] * VOXEL_SIZE[1] * VOXEL_SIZE[2]

def generate_mri_dates(metastatic_diagnosis_date):
    """Generate MRI dates starting from metastatic diagnosis until 5 years after or current date."""
    mri_dates = []
    current_date = metastatic_diagnosis_date
    
    # Calculate end date (5 years after metastatic diagnosis or current date, whichever is first)
    # Use timedelta to handle leap years correctly
    five_years_later = metastatic_diagnosis_date + timedelta(days=365*5)  # 5 years = 365*5 days
    end_date = min(five_years_later, CURRENT_DATE)
    
    # Add first MRI on diagnosis date
    mri_dates.append(metastatic_diagnosis_date)
    
    # Generate subsequent MRI dates
    while current_date < end_date:
        # Random interval between 6-18 months
        days_to_add = random.randint(180, 540)
        current_date += timedelta(days=days_to_add)
        
        if current_date <= end_date:
            mri_dates.append(current_date)
    
    return mri_dates

def generate_tumor(region):
    """Generate a tumor in the specified brain region and return its properties."""
    # Get region boundaries
    bounds = BRAIN_REGIONS[region]
    
    # Generate random center point within region bounds
    center_x = random.randint(bounds["x"][0], bounds["x"][1])
    center_y = random.randint(bounds["y"][0], bounds["y"][1])
    center_z = random.randint(bounds["z"][0], bounds["z"][1])
    
    # Generate random radius to match realistic tumor volumes (6-250 mm³)
    # Based on study: mean 62.80 mm³, median 42.71 mm³, range 6.61-252.21 mm³
    radius = random.uniform(0.8, 2.2)  # voxels (generates ~6-250 mm³)
    
    # Calculate volume in mm³ using realistic voxel dimensions
    # Volume of sphere in voxels: (4/3) * π * r³
    # Convert to mm³ by multiplying by voxel volume
    voxel_volume = VOXEL_SIZE[0] * VOXEL_SIZE[1] * VOXEL_SIZE[2]  # mm³ per voxel
    volume = (4/3) * np.pi * (radius**3) * voxel_volume
    
    # Calculate bounding box - SHAPE is (z, y, x)
    min_x = max(0, int(center_x - radius))
    max_x = min(SHAPE[2]-1, int(center_x + radius))  # SHAPE[2] is x dimension (99)
    min_y = max(0, int(center_y - radius))
    max_y = min(SHAPE[1]-1, int(center_y + radius))  # SHAPE[1] is y dimension (99)
    min_z = max(0, int(center_z - radius))
    max_z = min(SHAPE[0]-1, int(center_z + radius))  # SHAPE[0] is z dimension (30)
    
    return {
        "region": region,
        "center": (center_x, center_y, center_z),
        "radius": radius,
        "volume": volume,
        "bounds": {
            "x": (min_x, max_x),
            "y": (min_y, max_y),
            "z": (min_z, max_z)
        }
    }

def add_tumor_to_volume(volume, tumor):
    """Add a spherical tumor to the 3D volume using pre-calculated grids."""
    center_x, center_y, center_z = tumor["center"]
    radius = tumor["radius"]
    
    # Use pre-calculated coordinate grids (optimization)
    distance = np.sqrt((X_GRID - center_x)**2 + (Y_GRID - center_y)**2 + (Z_GRID - center_z)**2)
    
    # Create spherical tumor (1 where distance <= radius, 0 elsewhere)
    tumor_mask = distance <= radius
    
    # Add tumor to volume (set to 1 for tumor tissue)
    volume[tumor_mask] = 1
    
    return volume

def create_brain_volume():
    """Create a binary volume initialized to zeros."""
    # Create volume with all zeros for background
    volume = np.zeros(SHAPE, dtype=np.uint8)
    
    return volume

def save_nifti_fast(volume, filename):
    """Optimized NIfTI saving."""
    # Create affine matrix with realistic voxel spacing
    affine = np.array([
        [VOXEL_SIZE[2], 0, 0, 0],
        [0, VOXEL_SIZE[1], 0, 0], 
        [0, 0, VOXEL_SIZE[0], 0],
        [0, 0, 0, 1]
    ], dtype=np.float32)
    
    # Create NIfTI image and save
    nifti_img = nib.Nifti1Image(volume, affine)
    nib.save(nifti_img, filename)

def create_mri_volume(tumors, timepoint_index=0, base_seed=None):
    """Create an MRI volume with realistic intensity values and tumor enhancement."""
    # Set seed for reproducible but varying results across timepoints
    if base_seed is not None:
        np.random.seed(base_seed + timepoint_index)
    
    # Create base MRI volume with normal distribution around 0, range -10 to 10
    volume = np.random.normal(0, 2.5, SHAPE).astype(np.float32)
    # Clip to ensure values stay within -10 to 10 range
    np.clip(volume, -10, 10, out=volume)  # In-place clipping (optimization)
    
    # Add tumor enhancement
    for tumor in tumors:
        center_x, center_y, center_z = tumor["center"]
        radius = tumor["radius"]
        
        # Use pre-calculated coordinate grids (optimization)
        distance = np.sqrt((X_GRID - center_x)**2 + (Y_GRID - center_y)**2 + (Z_GRID - center_z)**2)
        
        # Create tumor enhancement (stronger in center, falls off with distance)
        base_enhancement = 3.0 + (timepoint_index * 0.2)  # Slight progression over time
        enhancement_mask = np.exp(-distance / (radius * 0.8))  # Smooth falloff
        
        # Add enhancement to volume (in-place operation)
        volume += enhancement_mask * base_enhancement
    
    # Add temporal variation (in-place)
    volume += np.random.normal(0, 0.5, SHAPE).astype(np.float32)
    
    # Final clipping (in-place)
    np.clip(volume, -10, 10, out=volume)
    
    return volume

def create_dose_volume(tumors, base_seed=None):
    """Create a dose volume with realistic dose distribution and tumor targeting."""
    if base_seed is not None:
        np.random.seed(base_seed + 1000)  # Different seed offset for dose generation
    
    # Create base dose volume (mostly zeros)
    volume = np.zeros(SHAPE, dtype=np.float32)
    
    # Generate fewer dose spots for speed (reduce from 7% to 3%)
    total_voxels = np.prod(SHAPE)
    num_dose_spots = int(total_voxels * 0.03)  # 3% of voxels get dose
    
    # Random locations for dose spots
    dose_indices = np.random.choice(total_voxels, num_dose_spots, replace=False)
    z_coords, y_coords, x_coords = np.unravel_index(dose_indices, SHAPE)
    
    # Generate dose values (0-70, mean around 20)
    dose_values = np.random.gamma(shape=2, scale=10, size=num_dose_spots)
    np.clip(dose_values, 0, 70, out=dose_values)  # In-place clipping
    
    # Apply base doses
    volume[z_coords, y_coords, x_coords] = dose_values
    
    # Enhance doses in tumor regions
    for tumor in tumors:
        center_x, center_y, center_z = tumor["center"]
        radius = tumor["radius"]
        
        # Use pre-calculated coordinate grids
        distance = np.sqrt((X_GRID - center_x)**2 + (Y_GRID - center_y)**2 + (Z_GRID - center_z)**2)
        
        # Create tumor targeting enhancement
        tumor_mask = distance <= (radius * 1.5)
        
        # Add additional dose spots in tumor region
        tumor_region = np.where(tumor_mask)
        if len(tumor_region[0]) > 0:
            # Add targeted doses to tumor region
            enhanced_doses = np.random.gamma(shape=3, scale=15, size=len(tumor_region[0]))
            np.clip(enhanced_doses, 20, 70, out=enhanced_doses)
            
            # Combine with existing doses (take maximum)
            volume[tumor_region] = np.maximum(volume[tumor_region], enhanced_doses)
    
    return volume

def calculate_dose_statistics(volume):
    """Calculate statistics for the dose mask."""
    # Find non-zero voxels (where dose is applied)
    nonzero_mask = volume > 0
    nonzero_coords = np.where(nonzero_mask)
    
    if len(nonzero_coords[0]) == 0:
        # No dose applied - return default values
        return {
            'max_dose': 0,
            'volume_mm3': 0.0,
            'center_of_mass': (0, 0, 0),
            'bounding_box': {'x': (0, 0), 'y': (0, 0), 'z': (0, 0)}
        }
    
    # Maximum dose
    max_dose = int(np.max(volume))
    
    # Volume of treated region (count non-zero voxels and convert to mm³)
    voxel_volume = VOXEL_SIZE[0] * VOXEL_SIZE[1] * VOXEL_SIZE[2]
    volume_mm3 = len(nonzero_coords[0]) * voxel_volume
    
    # Center of mass (weighted by dose intensity)
    doses = volume[nonzero_mask]
    z_com = int(np.average(nonzero_coords[0], weights=doses))
    y_com = int(np.average(nonzero_coords[1], weights=doses))
    x_com = int(np.average(nonzero_coords[2], weights=doses))
    
    # Bounding box
    z_min, z_max = int(np.min(nonzero_coords[0])), int(np.max(nonzero_coords[0]))
    y_min, y_max = int(np.min(nonzero_coords[1])), int(np.max(nonzero_coords[1]))
    x_min, x_max = int(np.min(nonzero_coords[2])), int(np.max(nonzero_coords[2]))
    
    return {
        'max_dose': max_dose,
        'volume_mm3': float(volume_mm3),
        'center_of_mass': (x_com, y_com, z_com),
        'bounding_box': {
            'x': (x_min, x_max),
            'y': (y_min, y_max),
            'z': (z_min, z_max)
        }
    }

def process_patient_batch(patients_batch, batch_num):
    """Process a batch of patients to manage memory usage."""
    print(f"Processing batch {batch_num}: {len(patients_batch)} patients")
    
    nifti_data_objects = []
    tumor_mask_objects = []
    dose_mask_objects = []
    mri_mask_objects = []
    
    for patient_idx, patient in enumerate(patients_batch):
        if patient_idx % 10 == 0:
            print(f"  Patient {patient_idx}/{len(patients_batch)} in batch {batch_num}")
            
        num_tumors = patient.tumor_count
        mri_dates = generate_mri_dates(patient.date_of_metastatic_diagnosis)
        num_mris = len(mri_dates)
        
        # Generate tumor data once per patient
        patient_tumors = []
        for i in range(num_tumors):
            tumor_id = uuid.uuid4()
            region = random.choice(list(BRAIN_REGIONS.keys()))
            tumor = generate_tumor(region)
            
            # Create volume with just this tumor
            tumor_volume_data = create_brain_volume()
            tumor_volume_data = add_tumor_to_volume(tumor_volume_data, tumor)
            
            # Create filename and save
            tumor_filename = f"{OUT_DIR}/{tumor_id}.nii.gz"
            save_nifti_fast(tumor_volume_data, tumor_filename)
            
            # Create database objects
            nifti_data_objects.append(NiftiData(
                id=tumor_id,
                patient_id=patient.id,
                series_type='tumor_mask'
            ))
            
            tumor_mask_objects.append(TumorMask(
                id=tumor_id,
                location=tumor["region"],
                volume_mm3=float(tumor["volume"]),
                x_com=int(tumor["center"][0]),
                y_com=int(tumor["center"][1]),
                z_com=int(tumor["center"][2]),
                x_min=tumor["bounds"]["x"][0],
                x_max=tumor["bounds"]["x"][1],
                y_min=tumor["bounds"]["y"][0],
                y_max=tumor["bounds"]["y"][1],
                z_min=tumor["bounds"]["z"][0],
                z_max=tumor["bounds"]["z"][1]
            ))
            
            patient_tumors.append(tumor)
            
            # Clear volume from memory
            del tumor_volume_data

        # Generate MRI scans
        base_seed = hash(str(patient.id)) % 2147483647
        for i, mri_date in enumerate(mri_dates):
            mri_mask_id = uuid.uuid4()
            
            mri_volume = create_mri_volume(patient_tumors, timepoint_index=i, base_seed=base_seed)
            mri_filename = f"{OUT_DIR}/{mri_mask_id}.nii.gz"
            save_nifti_fast(mri_volume, mri_filename)
            
            nifti_data_objects.append(NiftiData(
                id=mri_mask_id,
                patient_id=patient.id,
                series_type='mri_mask'
            ))
            
            mri_mask_objects.append(MRIMask(
                id=mri_mask_id,
                timepoint=mri_date
            ))
            
            # Clear volume from memory
            del mri_volume

        # Generate dose mask
        dose_mask_id = uuid.uuid4()
        dose_volume = create_dose_volume(patient_tumors, base_seed=base_seed)
        dose_stats = calculate_dose_statistics(dose_volume)
        
        dose_filename = f"{OUT_DIR}/{dose_mask_id}.nii.gz"
        save_nifti_fast(dose_volume, dose_filename)
        
        nifti_data_objects.append(NiftiData(
            id=dose_mask_id,
            patient_id=patient.id,
            series_type='dose_mask'
        ))
        
        dose_mask_objects.append(DoseMask(
            id=dose_mask_id,
            max_dose=dose_stats['max_dose'],
            volume_mm3=dose_stats['volume_mm3'],
            x_com=dose_stats['center_of_mass'][0],
            y_com=dose_stats['center_of_mass'][1],
            z_com=dose_stats['center_of_mass'][2],
            x_min=dose_stats['bounding_box']['x'][0],
            x_max=dose_stats['bounding_box']['x'][1],
            y_min=dose_stats['bounding_box']['y'][0],
            y_max=dose_stats['bounding_box']['y'][1],
            z_min=dose_stats['bounding_box']['z'][0],
            z_max=dose_stats['bounding_box']['z'][1]
        ))
        
        # Clear from memory
        del dose_volume
    
    return nifti_data_objects, tumor_mask_objects, mri_mask_objects, dose_mask_objects

with app.app_context():
    patients = Patients.query.all()
    print(f"Processing {len(patients)} patients in batches of {BATCH_SIZE}")
    
    # Process patients in batches
    for batch_start in range(0, len(patients), BATCH_SIZE):
        batch_end = min(batch_start + BATCH_SIZE, len(patients))
        batch_patients = patients[batch_start:batch_end]
        batch_num = (batch_start // BATCH_SIZE) + 1
        
        # Process this batch
        nifti_objects, tumor_objects, mri_objects, dose_objects = process_patient_batch(
            batch_patients, batch_num
        )
        
        # Add to database in batch
        print(f"  Committing batch {batch_num} to database...")
        db.session.add_all(nifti_objects)
        db.session.add_all(tumor_objects)
        db.session.add_all(mri_objects)
        db.session.add_all(dose_objects)
        
        try:
            db.session.commit()
            print(f"  Batch {batch_num} committed successfully")
        except Exception as e:
            db.session.rollback()
            print(f"  Error in batch {batch_num}: {e}")
            raise
        
        # Force garbage collection between batches
        gc.collect()
    
    print("All patients processed successfully!")
            