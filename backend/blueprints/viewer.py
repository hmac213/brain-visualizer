from flask import current_app
from patches import template_patch
from db_loading.nifti_loading import load_nifti
from flask import Blueprint, send_from_directory
import cortex
import os

viewer = Blueprint('viewer', __name__, url_prefix='/api')

# path for static viewer files
out_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../static_viewer'))

@viewer.route('/viewer')
def req_visualize_brain():
    current_filter = current_app.config['CURRENT_FILTER']
    current_filter_id = ''
    for id in current_filter:
        current_filter_id = id
    
    # Use the Docker volume path for NIfTI files
    nifti_file_path = os.path.join(
        '/app/filestore/nifti_display_cache', 
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