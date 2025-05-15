from flask import Blueprint, jsonify, request, current_app
import os
import sys
from db_loading.generate_display_nifti import generate_display_nifti

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
    
    # Generate the NIfTI file using the generate_display_nifti function
    try:
        # Call the generate_display_nifti function with the filter ID and options
        result_path = generate_display_nifti(id, options)
        
        if result_path:
            print(f"Successfully created NIfTI file at {result_path}")
            # Store the path in the filter data for reference
            active_filters[id]['nifti_path'] = result_path
        else:
            print(f"Failed to create NIfTI file for filter {id}")
            
    except Exception as e:
        print(f"An error occurred while generating the NIfTI file: {e}")
        # We continue the request even if the NIfTI generation fails

    return jsonify({ 'message': 'success: filter added' }), 201

# modify filter
@filters.route('/filters/<id>', methods=['PUT'])
def modify_filter(id):
    name = request.json.get('name')
    options = request.json.get('activeFilters')
    if id in active_filters:
        active_filters[id] = { 'name': name, 'options': options }
        
        # Regenerate the NIfTI file with updated options
        try:
            # Remove existing cached file to force regeneration
            cache_path = os.path.join('/app/filestore/nifti_display_cache', f"{id}.nii.gz")
            if os.path.exists(cache_path):
                os.remove(cache_path)
                
            # Call the generate_display_nifti function with the filter ID and options
            result_path = generate_display_nifti(id, options)
            
            if result_path:
                print(f"Successfully updated NIfTI file at {result_path}")
                # Store the path in the filter data for reference
                active_filters[id]['nifti_path'] = result_path
            else:
                print(f"Failed to update NIfTI file for filter {id}")
                
        except Exception as e:
            print(f"An error occurred while updating the NIfTI file: {e}")
            # We continue the request even if the NIfTI generation fails
            
        return jsonify({ 'message': 'success: filter modified' }), 200
    else:
        return jsonify({ 'error': 'error: filter not found'}), 404

# delete filter
@filters.route('/filters/<id>', methods=['DELETE'])
def delete_filter(id):
    if id in active_filters:
        del active_filters[id]
        
        # Clean up associated NIfTI files
        try:
            # Remove cached file
            cache_path = os.path.join('/app/filestore/nifti_display_cache', f"{id}.nii.gz")
            if os.path.exists(cache_path):
                os.remove(cache_path)
                print(f"Removed cached NIfTI file: {cache_path}")
        except Exception as e:
            print(f"Error cleaning up NIfTI files: {e}")
            
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