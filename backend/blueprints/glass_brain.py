import nibabel as nib
import numpy as np
from flask import Blueprint, jsonify, current_app
import os
from templateflow import api as tf

glass_brain_bp = Blueprint('glass_brain', __name__, url_prefix='/api/glass_brain')

def _load_combined_fsaverage_pial():
    """Helper function to load and combine fsaverage pial surfaces."""
    lh_path = tf.get('fsaverage', density='164k', hemi='L', suffix='pial', extension='surf.gii')
    rh_path = tf.get('fsaverage', density='164k', hemi='R', suffix='pial', extension='surf.gii')

    lh_gii = nib.load(lh_path)
    rh_gii = nib.load(rh_path)

    lh_vertices, lh_faces = lh_gii.darrays[0].data, lh_gii.darrays[1].data
    rh_vertices, rh_faces = rh_gii.darrays[0].data, rh_gii.darrays[1].data

    num_lh_verts = lh_vertices.shape[0]
    combined_vertices = np.vstack((lh_vertices, rh_vertices))
    rh_faces_offset = rh_faces + num_lh_verts
    combined_faces = np.vstack((lh_faces, rh_faces_offset))

    return combined_vertices, combined_faces

@glass_brain_bp.route('/brain_surface')
def get_brain_surface_mesh():
    """API endpoint to get the vertex and face data for the brain shell."""
    try:
        vertices, faces = _load_combined_fsaverage_pial()
        return jsonify({
            "vertices": vertices.tolist(),
            "faces": faces.tolist()
        })
    except Exception as e:
        current_app.logger.error(f"Error in /brain_surface: {e}")
        return jsonify({"error": "Failed to load brain surface data."}), 500

@glass_brain_bp.route('/volume_data')
def get_volume_data():
    """API endpoint to load a NIfTI volume and return its data and affine."""
    try:
        current_filter = current_app.config.get('CURRENT_FILTER')
        if not current_filter or not isinstance(current_filter, dict):
            return jsonify({"error": "Current filter not set or invalid."}), 400
        
        current_filter_id = next(iter(current_filter), None)
        if not current_filter_id:
            return jsonify({"error": "No ID found in current filter."}), 400

        # Map mask types to cache directories
        cache_subdirs = {
            'tumor': 'tumor_mask_cache',
            'mri': 'mri_mask_cache', 
            'dose': 'dose_mask_cache'
        }
        
        current_mask_type = current_app.config.get('CURRENT_MASK_TYPE', 'tumor')
        cache_subdir = cache_subdirs.get(current_mask_type, 'tumor_mask_cache')
        
        nifti_file_path = os.path.join(
            '/app/filestore', 
            cache_subdir,
            f"{current_filter_id}.nii.gz"
        )
        if not os.path.exists(nifti_file_path):
            return jsonify({"error": f"Mask file not found at: {nifti_file_path}"}), 404
        
        nii_img = nib.load(nifti_file_path)
        nii_data = nii_img.get_fdata(dtype=np.float32)

        min_val, max_val = np.min(nii_data), np.max(nii_data)
        if max_val > min_val:
             normalized_data = (nii_data - min_val) / (max_val - min_val)
        else:
             normalized_data = np.zeros(nii_data.shape, dtype=np.float32)

        return jsonify({
            "dims": nii_data.shape,
            "rawData": normalized_data.flatten().tolist(),
            "affine": nii_img.affine.tolist(),
        })

    except Exception as e:
        current_app.logger.error(f"Error in /volume_data: {e}")
        return jsonify({"error": "Failed to load volume data."}), 500 