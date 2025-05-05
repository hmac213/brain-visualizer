import nibabel as nib
import numpy as np # Need numpy for combining arrays
from flask import Blueprint, jsonify, current_app
import os
from templateflow import api as tf # Import templateflow

glass_brain_bp = Blueprint('glass_brain', __name__, url_prefix='/api/glass_brain')

# --- Configuration ---
# TEMPLATE_NII_PATH is now dynamically fetched using templateflow
# TEMPLATE_NII_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../path/to/your/MNI152_T1_1mm_brain.nii.gz'))

# --- Route ---
@glass_brain_bp.route('/mesh_data')
def get_glass_brain_mesh():
    """
    API endpoint to get the vertex and face data for the glass brain mesh
    using pre-computed surface meshes from templateflow.
    Fetches the left and right hemisphere pial surfaces for fsaverage (164k density)
    and combines them.
    """
    try:
        # --- Fetch Left Hemisphere ---
        lh_path_obj = tf.get(
            'fsaverage',
            density='164k',
            hemi='L',
            suffix='pial',
            extension='surf.gii'
        )
        if not lh_path_obj or not os.path.exists(str(lh_path_obj)):
             return jsonify({"error": "Templateflow could not find the Left Hemisphere surface (fsaverage, density-164k, hemi-L, pial, .surf.gii)."}), 500
        lh_path = str(lh_path_obj)

        # --- Fetch Right Hemisphere ---
        rh_path_obj = tf.get(
            'fsaverage',
            density='164k',
            hemi='R', # Fetch Right hemisphere
            suffix='pial',
            extension='surf.gii'
        )
        if not rh_path_obj or not os.path.exists(str(rh_path_obj)):
             return jsonify({"error": "Templateflow could not find the Right Hemisphere surface (fsaverage, density-164k, hemi-R, pial, .surf.gii)."}), 500
        rh_path = str(rh_path_obj)

        # --- Load Meshes using nibabel ---
        lh_gii = nib.load(lh_path)
        rh_gii = nib.load(rh_path)

        if len(lh_gii.darrays) < 2 or len(rh_gii.darrays) < 2:
            return jsonify({"error": "One or both GIFTI files do not contain expected vertex and face data."}), 500

        lh_vertices = lh_gii.darrays[0].data
        lh_faces = lh_gii.darrays[1].data
        rh_vertices = rh_gii.darrays[0].data
        rh_faces = rh_gii.darrays[1].data

        # --- Combine Meshes ---
        num_lh_verts = lh_vertices.shape[0]

        # Combine vertices
        combined_vertices = np.vstack((lh_vertices, rh_vertices))

        # Offset right hemisphere faces and combine
        rh_faces_offset = rh_faces + num_lh_verts
        combined_faces = np.vstack((lh_faces, rh_faces_offset))

    except Exception as e:
        return jsonify({"error": f"Error loading or processing surface meshes: {e}"}), 500

    # Check if data was loaded and combined correctly
    if combined_vertices.size == 0 or combined_faces.size == 0:
        return jsonify({"error": "Failed to extract or combine valid mesh data from GIFTI files"}), 500

    # Convert to lists for JSON serialization
    vertices_list = combined_vertices.tolist()
    faces_list = combined_faces.tolist()

    return jsonify({
        "vertices": vertices_list,
        "faces": faces_list
    }) 