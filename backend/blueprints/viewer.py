from backend.patches import template_patch
from flask import Blueprint, send_from_directory
import cortex
import os

viewer = Blueprint('viewer', __name__)

# path for static viewer files
out_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../static_viewer'))

@viewer.route('/api/viewer')
def req_visualize_brain():
    lung_volume = cortex.Volume.random(subject='S1', xfmname='fullhead', priority=1)
    breast_volume = cortex.Volume.random(subject='S1', xfmname='fullhead', priority=1)
    kidney_volume = cortex.Volume.random(subject='S1', xfmname='fullhead', priority=1)
    melanoma_volume = cortex.Volume.random(subject='S1', xfmname='fullhead', priority=1)
    colorectal_volume = cortex.Volume.random(subject='S1', xfmname='fullhead', priority=1)

    volumes = {
        'Lung' : lung_volume,
        'Breast' : breast_volume,
        'Kidney' : kidney_volume,
        'Melanoma' : melanoma_volume,
        'Colorectal' : colorectal_volume
    }

    cortex.webgl.make_static(outpath=out_path, data=volumes, recache=True, template='static_test.html')

    return send_from_directory(out_path, 'index.html')

# serve files associated with viewer
@viewer.route('/api/<path:filedir>')
def serve_static_viewer_assets(filedir):
    return send_from_directory(out_path, filedir)