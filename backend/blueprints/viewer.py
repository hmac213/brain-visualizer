from flask import current_app
from patches import template_patch
from db_loading.nifti_loading import load_nifti
from flask import Blueprint, send_from_directory
import cortex
import os

viewer = Blueprint('viewer', __name__, url_prefix='/api')

# path for static viewer files
out_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../static_viewer'))

@viewer.route('/viewer/<uuid:nifti_id_str>/<path:nifti_file_path>')
@viewer.route('/viewer')
def req_visualize_brain(nifti_id_str=None, nifti_file_path=None):
    if nifti_id_str and nifti_file_path:
        nifti_file_path = os.path.join(
            '/app/filestore',
            nifti_file_path,
            f'/{nifti_id_str}.nii.gz'
        )
    else:
        # Use the Docker volume path for NIfTI files with mask type subdirectory
        current_filter = current_app.config['CURRENT_FILTER']
        current_mask_type = current_app.config.get('CURRENT_MASK_TYPE', 'tumor')  # Default to tumor
        current_filter_id = ''
        for id in current_filter:
            current_filter_id = id

        # Map mask types to cache directories
        cache_subdirs = {
            'tumor': 'tumor_mask_cache',
            'mri': 'mri_mask_cache', 
            'dose': 'dose_mask_cache'
        }

        cache_subdir = cache_subdirs.get(current_mask_type, 'tumor_mask_cache')

        # Use the Docker volume path for NIfTI files with mask type subdirectory
        nifti_file_path = os.path.join(
            '/app/filestore', 
            cache_subdir,
            f"{current_filter_id}.nii.gz"
        )

    current_nii = load_nifti(nifti_file_path)
    current_nii_volume_data = current_nii[0]
    current_nii_volume = cortex.Volume(current_nii_volume_data, subject='S1', xfmname='fullhead')

    # Ensure the output directory exists
    os.makedirs(out_path, exist_ok=True)

    # Create the static viewer files
    cortex.webgl.make_static(outpath=out_path, data={ 'test': current_nii_volume }, recache=True, template='custom_viewer.html')
    return send_from_directory(out_path, 'index.html')

# serve files associated with viewer
@viewer.route('/<path:filedir>')
def serve_static_viewer_assets(filedir):
    return send_from_directory(out_path, filedir)