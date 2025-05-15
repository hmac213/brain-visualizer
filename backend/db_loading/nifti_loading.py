import nibabel as nib

def load_nifti(compressed_nifti_path):
    nifti_img = nib.load(compressed_nifti_path)
    volume_data = nifti_img.get_fdata()
    affine = nifti_img.affine

    return volume_data, affine

