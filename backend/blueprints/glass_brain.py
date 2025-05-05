import nibabel as nib
import numpy as np
from flask import Blueprint, jsonify, current_app
import os
from templateflow import api as tf
# scipy no longer needed here if we only send raw data
# from scipy.ndimage import map_coordinates

glass_brain_bp = Blueprint('glass_brain', __name__, url_prefix='/api/glass_brain')

# --- Configuration ---
# TEMPLATE_NII_PATH is now dynamically fetched using templateflow
# TEMPLATE_NII_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../path/to/your/MNI152_T1_1mm_brain.nii.gz'))

# --- Helper function to load and combine surfaces ---
def _load_combined_fsaverage_pial():
    lh_path_obj = tf.get('fsaverage', density='164k', hemi='L', suffix='pial', extension='surf.gii')
    if lh_path_obj is None:
        raise FileNotFoundError("Templateflow could not find Left Hemisphere surface (returned None).")

    rh_path_obj = tf.get('fsaverage', density='164k', hemi='R', suffix='pial', extension='surf.gii')
    if rh_path_obj is None:
        raise FileNotFoundError("Templateflow could not find Right Hemisphere surface (returned None).")

    if not os.path.exists(str(lh_path_obj)) or \
       not os.path.exists(str(rh_path_obj)):
        raise FileNotFoundError("Could not find one or both fsaverage pial surface files on disk.")

    lh_gii = nib.load(str(lh_path_obj))
    rh_gii = nib.load(str(rh_path_obj))

    if len(lh_gii.darrays) < 2 or len(rh_gii.darrays) < 2:
        raise ValueError("GIFTI file(s) missing vertex/face data.")

    lh_vertices = lh_gii.darrays[0].data
    lh_faces = lh_gii.darrays[1].data
    rh_vertices = rh_gii.darrays[0].data
    rh_faces = rh_gii.darrays[1].data

    num_lh_verts = lh_vertices.shape[0]
    combined_vertices = np.vstack((lh_vertices, rh_vertices))
    rh_faces_offset = rh_faces + num_lh_verts
    combined_faces = np.vstack((lh_faces, rh_faces_offset))

    if combined_vertices.size == 0 or combined_faces.size == 0:
        raise ValueError("Failed to extract or combine mesh data.")

    return combined_vertices, combined_faces

# --- Mesh Data Route (Re-enabled) ---
@glass_brain_bp.route('/mesh_data')
def get_glass_brain_mesh():
    """
    API endpoint to get the vertex and face data for the combined fsaverage pial surface.
    Used for the transparent glass brain shell.
    """
    try:
        vertices, faces = _load_combined_fsaverage_pial() # Use the helper
        vertices_list = vertices.tolist()
        faces_list = faces.tolist()
        return jsonify({
            "vertices": vertices_list,
            "faces": faces_list
        })
    except Exception as e:
        print(f"Error in /mesh_data: {e}")
        error_message = f"Error loading mesh data: {e}"
        if isinstance(e, FileNotFoundError):
            error_message = str(e)
        return jsonify({"error": error_message}), 500

# --- Heatmap Data Route (Disabled - use /volume/raw for heatmap source) ---
@glass_brain_bp.route('/heatmap/data')
def get_heatmap_data():
    return jsonify({"error": "Heatmap sampling endpoint disabled; use /volume/raw for heatmap source."}), 501

# --- Raw Volume Data Route (Provides data for internal heatmap) ---
@glass_brain_bp.route('/volume/raw')
def get_raw_volume_data():
    """
    API endpoint to load a NIfTI volume and return its dimensions and raw data array.
    Used as the source for the internal heatmap visualization.
    Currently loads the MNI152NLin2009cAsym T1w brain image for demonstration.
    WARNING: Sending large raw data arrays via JSON can be very slow/inefficient.
    """
    try:
        # Load the NIfTI volume (DEMO: Using MNI T1w brain template)
        nifti_path_obj = tf.get(
            "MNI152NLin2009cAsym",
            resolution=1,
            desc='brain',
            suffix='T1w',
            extension='nii.gz'
        )
        if nifti_path_obj is None:
             raise FileNotFoundError("Templateflow could not find the NIfTI file for volume rendering (returned None).")

        if not os.path.exists(str(nifti_path_obj)):
            raise FileNotFoundError("Could not find the template NIfTI file for volume rendering on disk.")

        nii_img = nib.load(str(nifti_path_obj))
        nii_data = nii_img.get_fdata(dtype=np.float32)
        nii_shape = nii_data.shape
        nii_affine = nii_img.affine

        min_val = np.min(nii_data)
        max_val = np.max(nii_data)
        print(f"Raw Volume Data Range (Backend): min={min_val}, max={max_val}")

        if max_val > min_val:
             normalized_data = (nii_data - min_val) / (max_val - min_val)
        else:
             normalized_data = np.zeros(nii_shape, dtype=np.float32)

        return jsonify({
            "dims": nii_shape,
            "rawData": normalized_data.flatten().tolist(),
            "affine": nii_affine.tolist(),
            "originalRange": [float(min_val), float(max_val)]
        })

    except Exception as e:
        print(f"Error in /volume/raw: {e}")
        error_message = f"Error loading or processing volume data: {e}"
        if isinstance(e, FileNotFoundError):
            error_message = str(e)
        return jsonify({"error": error_message}), 500 