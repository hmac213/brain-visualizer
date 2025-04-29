from flask import Blueprint, jsonify, request, current_app
import subprocess
import os
import sys

filters = Blueprint('filters', __name__, url_prefix='/api')

# initialize with a default filter
active_filters = {
    'default_id': {
        'name': 'Default',
        'options': []
    }
}

# get all active filters
@filters.route('/filters', methods=['GET'])
def get_filters():
    return jsonify(active_filters)

# create new filter
@filters.route('/filters', methods=['POST'])
def create_filter():
    id = request.json.get('id')
    name = request.json.get('name')
    options = request.json.get('activeFilters')
    
    if not id or not name:
        return jsonify({ 'error': 'error: invalid filter' }), 400

    active_filters[id] = { 'name': name, 'options': options }
    
    # Generate the NIfTI file
    try:
        # Sanitize the name to create a valid filename
        safe_filename = f"filter_{id}"
            
        nifti_filename = f"{safe_filename}.nii.gz"
        nifti_filepath = os.path.join('backend', 'compressed_nifti_files', nifti_filename)
        
        # Ensure the target directory exists
        nifti_dir = os.path.dirname(nifti_filepath)
        if not os.path.exists(nifti_dir):
            os.makedirs(nifti_dir)
            
        script_path = os.path.join('backend', 'file_loading', 'create_test_nifti.py')
        
        # Use sys.executable to ensure the correct python interpreter is used
        python_executable = sys.executable if sys.executable else 'python' # Fallback to 'python'
        
        result = subprocess.run([python_executable, script_path, nifti_filepath], capture_output=True, text=True, check=True)
        print(f"NIfTI creation script output: {result.stdout}")
        if result.stderr:
            print(f"NIfTI creation script error: {result.stderr}")
            
    except subprocess.CalledProcessError as e:
        print(f"Error running NIfTI creation script: {e}")
        print(f"Stderr: {e.stderr}")
        # Optionally, you could return an error response here or just log it
        # return jsonify({'error': 'Failed to create NIfTI file'}), 500
    except Exception as e:
        print(f"An unexpected error occurred during NIfTI file creation: {e}")
        # Optionally, return an error response
        # return jsonify({'error': 'An unexpected error occurred'}), 500

    return jsonify({ 'message': 'success: filter added' }), 201

# modify filter
@filters.route('/filters/<id>', methods=['PUT'])
def modify_filter(id):
    name = request.json.get('name')
    options = request.json.get('activeFilters')
    if id in active_filters:
        active_filters[id] = { 'name': name, 'options': options }
        return jsonify({ 'message': 'success: filter modified' }), 200
    else:
        return jsonify({ 'error': 'error: filter not found'}), 404

# delete filter
@filters.route('/filters/<id>', methods=['DELETE'])
def delete_filter(id):
    if id in active_filters:
        del active_filters[id]
        return jsonify({ 'message': 'success: filter deleted' }), 200

    return jsonify({ 'error': 'error: filter not found' }), 404

# set current filter
@filters.route('/filters/set_current/<id>', methods=['PUT'])
def set_current_filter(id):
    if id in active_filters:
        if id in current_app.config['CURRENT_FILTER']:
            return jsonify({ 'message': 'filter already active' }), 200
        current_app.config['CURRENT_FILTER'] = { id: active_filters[id] }
        return jsonify({ 'message': 'successfully updated current filter' }), 200
    
    return jsonify({ 'error': 'filter not found' }), 404

# get current filter
@filters.route('/filters/get_current', methods=['GET'])
def get_current_filter():
    current_filter_data = current_app.config.get('CURRENT_FILTER') # Use .get for safety
    if current_filter_data: 
        # Return the dictionary directly. The frontend expects {"id": {...filter_data...}}
        return jsonify(current_filter_data), 200 
    else:
        return jsonify({ 'error': 'current filter not set' }), 404