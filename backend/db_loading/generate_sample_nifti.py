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
SIGMA   = (3, 3, 3)  # smoothing for each hotspot

# Make sure output directory exists
os.makedirs(OUT_DIR, exist_ok=True)

# Create Flask app context so we can use SQLAlchemy
with app.app_context():
    # Query all sample entries
    samples = SampleData.query.all()

    for sample in samples:
        # Initialize empty volume
        vol = np.zeros(SHAPE, dtype=np.float32)

        # Place `tumor_count` random Gaussian hotspots
        for _ in range(sample.tumor_count):
            # pick a random integer center in each dimension
            center = [np.random.randint(0, dim) for dim in SHAPE]

            # create an impulse at the center
            blob = np.zeros(SHAPE, dtype=np.float32)
            blob[tuple(center)] = 1.0

            # smooth it to spread out into a blob
            blob = gaussian_filter(blob, sigma=SIGMA)

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
        print(f"Wrote {out_path}")