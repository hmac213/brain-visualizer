from flask import current_app, request, jsonify
from patches import template_patch
from db_loading.nifti_loading import load_nifti
from flask import Blueprint, send_from_directory
import cortex
import os
import shutil
from app import redis_cache

viewer = Blueprint('viewer', __name__, url_prefix='/api')

@viewer.route('/viewer/<uuid:nifti_id_str>/<path:nifti_dir>')
@viewer.route('/viewer')
def req_visualize_brain(nifti_id_str=None, nifti_dir=None):
    if nifti_id_str and nifti_dir:
        # Check if this is an asset request (contains file extension or starts with common asset paths)
        if ('.' in nifti_dir and nifti_dir.split('.')[-1].lower() in ['json', 'png', 'jpg', 'jpeg', 'gif', 'css', 'js', 'svg', 'ctm']) or \
           nifti_dir.startswith(('resources/', 'data/', 'css/', 'js/', 'images/')):
            # This is an asset request - serve from shared directory
            return serve_pycortex_shared_assets(nifti_dir)
        
        redis_key = f'viewer_cache:{nifti_id_str}'
        
        if redis_cache.path_exists(redis_key):
            out_path = redis_cache.get_path(redis_key)
            # Ensure out_path is a string, not bytes
            if isinstance(out_path, bytes):
                out_path = out_path.decode('utf-8')
            return send_from_directory(out_path, 'index.html') # already cached, so we return

        filestore_path = current_app.config['FILESTORE_PATH']
        out_path = os.path.abspath(os.path.join(
            filestore_path, 'viewer_cache',
            str(nifti_id_str),
        ))
        redis_cache.set_path(redis_key, out_path)

        nifti_file_path = os.path.join(
            filestore_path,
            nifti_dir,
            f'{nifti_id_str}.nii.gz'
        )
        
        # Check if file exists
        if not os.path.exists(nifti_file_path):
            from flask import abort
            abort(404)
            
    else: # no nifti_id_str or nifti_dir, so we use the current filter and mask type
        current_filter = current_app.config['CURRENT_FILTER']
        current_mask_type = current_app.config.get('CURRENT_MASK_TYPE', 'tumor')  # Default to tumor
        current_filter_id = ''
        for id in current_filter:
            current_filter_id = id
        
        current_app.logger.info(f"Using filter ID: {current_filter_id}, mask type: {current_mask_type}")

        redis_key = f'viewer_cache:{current_filter_id}_{current_mask_type}'
        if redis_cache.path_exists(redis_key):
            out_path = redis_cache.get_path(redis_key)
            # Ensure out_path is a string, not bytes
            if isinstance(out_path, bytes):
                out_path = out_path.decode('utf-8')
            return send_from_directory(out_path, 'index.html') # already cached, so we return

        # Map mask types to cache directories
        cache_subdirs = {
            'tumor': 'tumor_mask_cache',
            'mri': 'mri_mask_cache', 
            'dose': 'dose_mask_cache'
        }

        cache_subdir = cache_subdirs.get(current_mask_type, 'tumor_mask_cache')

        filestore_path = current_app.config['FILESTORE_PATH']
        out_path = os.path.abspath(os.path.join(
            filestore_path, 'viewer_cache',
            current_filter_id,
            current_mask_type,
        ))
        redis_cache.set_path(redis_key, out_path)

        # Use the Docker volume path for NIfTI files with mask type subdirectory
        nifti_file_path = os.path.join(
            filestore_path, 
            cache_subdir,
            f"{current_filter_id}.nii.gz"
        )
        
        # Check if file exists before trying to load it
        current_app.logger.info(f"Checking for NIfTI file at: {nifti_file_path}")
        if not os.path.exists(nifti_file_path):
            current_app.logger.error(f"NIfTI file not found at: {nifti_file_path}")
            from flask import abort
            abort(404)

    try:
        current_nii = load_nifti(nifti_file_path)
        current_nii_volume_data = current_nii[0]

        # Use a shared directory for common files and session-specific for index.html
        filestore_path = current_app.config['FILESTORE_PATH']
        shared_out_path = os.path.join(filestore_path, 'viewer_cache', 'pycortex_shared')
        session_out_path = out_path
        
        # Ensure both directories exist
        os.makedirs(shared_out_path, exist_ok=True)
        os.makedirs(session_out_path, exist_ok=True)
        
        current_nii_volume = cortex.Volume(current_nii_volume_data, subject='S1', xfmname='fullhead')

        # Create the static viewer files in shared directory
        cortex.webgl.make_static(outpath=shared_out_path, data={ 'test': current_nii_volume }, recache=True, template='custom_viewer.html')
        
        # Move only the index.html to the session-specific directory
        shared_index = os.path.join(shared_out_path, 'index.html')
        session_index = os.path.join(session_out_path, 'index.html')
        
        if os.path.exists(shared_index):
            shutil.move(shared_index, session_index)
        
        return send_from_directory(session_out_path, 'index.html')
        
    except Exception as e:
        current_app.logger.error(f"Error in /viewer: {e}")
        from flask import abort
        abort(500)

# serve files from shared pycortex directory (catches all resource requests)
@viewer.route('/<path:file_path>')
def serve_pycortex_shared_assets(file_path):
    filestore_path = current_app.config['FILESTORE_PATH']
    shared_directory = os.path.join(filestore_path, 'viewer_cache', 'pycortex_shared')
    
    # Split into directory and filename
    file_directory = os.path.dirname(file_path)
    filename = os.path.basename(file_path)
    
    if file_directory:
        full_directory = os.path.join(shared_directory, file_directory)
    else:
        full_directory = shared_directory
    
    # Security check: ensure we're only serving from the shared directory
    abs_full_dir = os.path.abspath(full_directory)
    abs_shared_dir = os.path.abspath(shared_directory)
    
    if not abs_full_dir.startswith(abs_shared_dir):
        from flask import abort
        abort(404)
    
    # Verify the file exists
    file_full_path = os.path.join(full_directory, filename)
    if not os.path.exists(file_full_path):
        from flask import abort
        abort(404)
    
    return send_from_directory(full_directory, filename)