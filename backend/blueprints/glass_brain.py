import nibabel as nib
import numpy as np
from flask import Blueprint, jsonify, current_app
from skimage import measure # Using scikit-image for marching cubes
import os
from templateflow import api as tf # Import templateflow

from backend.file_loading.nifti_loading import load_nifti # Reuse existing loader

glass_brain_bp = Blueprint('glass_brain', __name__, url_prefix='/api/glass_brain')

# --- Configuration ---
# TEMPLATE_NII_PATH is now dynamically fetched using templateflow
# TEMPLATE_NII_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../path/to/your/MNI152_T1_1mm_brain.nii.gz'))

# --- Helper Function ---
def create_mesh_from_nifti(nifti_path, level=100, step_size=2):
    """
    Loads a NIfTI file and generates a mesh using marching cubes.

    Args:
        nifti_path (str): Path to the NIfTI file.
        level (float): Iso-value for marching cubes. Adjust based on your template.
        step_size (int): Step size for marching cubes algorithm (downsampling).

    Returns:
        tuple: (vertices, faces) as numpy arrays, or (None, None) on error.
    """
    try:
        img = nib.load(nifti_path)
        data = img.get_fdata()
        affine = img.affine

        # Apply marching cubes
        # Adjust 'level' based on the intensity values in your template NIFTI
        # Adjust 'step_size' for performance vs detail trade-off
        verts, faces, _, _ = measure.marching_cubes(data, level=level, step_size=step_size)

        # Apply affine transformation to vertices
        # Add homogeneous coordinate (1)
        verts_homogeneous = np.hstack((verts, np.ones((verts.shape[0], 1))))
        # Apply affine
        verts_transformed = verts_homogeneous @ affine.T
        # Remove homogeneous coordinate
        verts_final = verts_transformed[:, :3]

        return verts_final, faces
    except FileNotFoundError:
        print(f"Error: NIfTI file not found at {nifti_path}") # More general error now
        return None, None
    except Exception as e:
        print(f"Error generating mesh from {nifti_path}: {e}")
        return None, None

# --- Route ---
@glass_brain_bp.route('/mesh_data')
def get_glass_brain_mesh():
    """
    API endpoint to get the vertex and face data for the glass brain mesh using templateflow.
    """
    try:
        # Fetch the template path using templateflow
        template_path = tf.get(
            "MNI152NLin2009cAsym",
            resolution=1, # Using 1mm resolution for potentially more detail
            desc='brain', # Try fetching the brain-extracted version
            suffix='T1w',
            extension='nii.gz'
        )
        if not template_path or not os.path.exists(str(template_path)):
             # Updated error message to reflect the specific template query
             return jsonify({"error": f"Templateflow could not find the specified template (MNI152NLin2009cAsym, res-1, desc-brain, T1w). Ensure templateflow is configured and the template is downloaded."}), 500

        # Ensure template_path is a string for os.path.exists and create_mesh_from_nifti
        template_path_str = str(template_path)

    except Exception as e:
        return jsonify({"error": f"Error fetching template path from templateflow: {e}"}), 500

    # Adjust level/step_size based on the 1mm template if needed
    # --- Trying lower level=40, step_size=1 for brain-extracted template for detail ---
    verts, faces = create_mesh_from_nifti(template_path_str, level=40, step_size=1)

    if verts is None or faces is None:
        return jsonify({"error": "Failed to generate mesh data from template"}), 500

    # Convert to lists for JSON serialization
    vertices_list = verts.tolist()
    faces_list = faces.tolist()

    return jsonify({
        "vertices": vertices_list,
        "faces": faces_list
    }) 