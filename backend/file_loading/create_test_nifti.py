import numpy as np
import nibabel as nib
import scipy.ndimage as ndimage

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
nib.save(img, 'backend/compressed_nifti_files/test.nii.gz')

print("Wrote synthetic volume to test.nii.gz")