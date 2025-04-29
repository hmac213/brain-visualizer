import sys
import os
import numpy as np
import nibabel as nib
import scipy.ndimage as ndimage

# Check if a filename argument is provided
if len(sys.argv) < 2:
    print("Usage: python create_test_nifti.py <output_filename>")
    sys.exit(1)

output_filepath = sys.argv[1]

# Ensure the output directory exists
output_dir = os.path.dirname(output_filepath)
if output_dir and not os.path.exists(output_dir):
    os.makedirs(output_dir)

# 1. Build a random heatmap-like 3D array by smoothing noise
shape = (31, 100, 100)
raw = np.random.rand(*shape)
smooth = ndimage.gaussian_filter(raw, sigma=(3, 3, 3))
# normalize to [0, 1]
norm = (smooth - smooth.min()) / (smooth.max() - smooth.min())
data = norm.astype(np.float32)

# 2. Choose an affine (voxel→world). Here, 1 mm isotropic voxels, origin at (0,0,0)
affine = np.diag([1, 1, 1, 1])

# 3. Wrap in a NIfTI image and save as compressed .nii.gz
img = nib.Nifti1Image(data, affine)
nib.save(img, output_filepath) # Use the provided filepath

print(f"Wrote synthetic volume to {output_filepath}")