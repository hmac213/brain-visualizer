import os
import uuid
import numpy as np
import nibabel as nib
from scipy.ndimage import gaussian_filter

from dotenv import load_dotenv
load_dotenv()

from app import app, db
from models import SampleData

# --- Configuration ---
OUT_DIR = "../filestore/test_db_nifti"
SHAPE   = (31, 100, 100)
# Base SIGMA values - these will be adjusted based on tumor size
BASE_SIGMA = (5, 5, 5)  # increased from (3, 3, 3) to make tumors larger by default

# Make sure output directory exists
os.makedirs(OUT_DIR, exist_ok=True)

# Create Flask app context so we can use SQLAlchemy
with app.app_context():
    # Query all sample entries
    samples = SampleData.query.all()

    for sample in samples:
        # Initialize empty volume
        vol = np.zeros(SHAPE, dtype=np.float32)
        
        # Adjust sigma based on tumor size
        sigma_multiplier = 1.0  # default multiplier
        if sample.tumor_size == "small":
            sigma_multiplier = 0.8
        elif sample.tumor_size == "medium":
            sigma_multiplier = 1.2
        elif sample.tumor_size == "large":
            sigma_multiplier = 1.6
            
        # Calculate the actual sigma for this sample
        sigma = tuple(s * sigma_multiplier for s in BASE_SIGMA)
        
        # Place `tumor_count` random Gaussian hotspots
        for _ in range(sample.tumor_count):
            # pick a random integer center in each dimension
            center = [np.random.randint(0, dim) for dim in SHAPE]

            # create an impulse at the center
            blob = np.zeros(SHAPE, dtype=np.float32)
            blob[tuple(center)] = 1.0

            # smooth it to spread out into a blob
            blob = gaussian_filter(blob, sigma=sigma)

            # accumulate into the volume
            vol += blob

        # normalize to [0, 1]
        vol_min, vol_max = vol.min(), vol.max()
        if vol_max > vol_min:
            vol = (vol - vol_min) / (vol_max - vol_min)
        else:
            vol = np.zeros_like(vol)

        # wrap as NIfTI and save
        affine = np.diag([1, 1, 1, 1])  # 1 mm isotropic voxels
        img    = nib.Nifti1Image(vol, affine)

        out_path = os.path.join(OUT_DIR, f"{sample.id}.nii.gz")
        nib.save(img, out_path)
        print(f"Wrote {out_path} with tumor size: {sample.tumor_size}, sigma: {sigma}")