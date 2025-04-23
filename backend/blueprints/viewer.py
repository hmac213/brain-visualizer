from backend.patches import template_patch
from backend.file_loading.nifti_loading import load_nifti
from flask import Blueprint, send_from_directory
import cortex
import os

viewer = Blueprint('viewer', __name__, url_prefix='/api')

# path for static viewer files
out_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../static_viewer'))

@viewer.route('/viewer')
def req_visualize_brain():
    lung_volume = cortex.Volume.random(subject='S1', xfmname='fullhead', priority=1)
    breast_volume = cortex.Volume.random(subject='S1', xfmname='fullhead', priority=1)
    kidney_volume = cortex.Volume.random(subject='S1', xfmname='fullhead', priority=1)
    melanoma_volume = cortex.Volume.random(subject='S1', xfmname='fullhead', priority=1)
    colorectal_volume = cortex.Volume.random(subject='S1', xfmname='fullhead', priority=1)

    test_nii = load_nifti('backend/compressed_nifti_files/test.nii.gz')
    test_nii_volume_data = test_nii[0]
    test_nii_volume = cortex.Volume(test_nii_volume_data, subject='S1', xfmname='fullhead')


    volumes = {
        'Lung' : lung_volume,
        'Breast' : breast_volume,
        'Kidney' : kidney_volume,
        'Melanoma' : melanoma_volume,
        'Colorectal' : colorectal_volume
    }

    cortex.webgl.make_static(outpath=out_path, data={ 'test': test_nii_volume }, recache=True, template='custom_viewer.html')

    return send_from_directory(out_path, 'index.html')

# serve files associated with viewer
@viewer.route('/<path:filedir>')
def serve_static_viewer_assets(filedir):
    return send_from_directory(out_path, filedir)