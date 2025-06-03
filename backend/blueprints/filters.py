from flask import Blueprint, jsonify, request, current_app
import os
import sys
from db_loading.generate_display_nifti import generate_display_nifti
from models import Patients, TumorMask, DoseMask, MRIMask, NiftiData
from app import db
from sqlalchemy import func, distinct
from datetime import date

filters = Blueprint('filters', __name__, url_prefix='/api')

# initialize with a default filter
active_filters = {
    'default_id': {
        'name': 'Default',
        'criteria': {}
    }
}

def get_filter_options():
    """Generate filter options based on actual database data."""
    try:
        # Patient demographic filters
        origin_cancers = db.session.query(distinct(Patients.origin_cancer)).all()
        origin_cancer_options = [cancer[0] for cancer in origin_cancers if cancer[0]]
        
        sex_options = ['M', 'F']
        
        # Age ranges - calculate from DOB
        current_date = date.today()
        age_ranges = [
            {'label': 'Under 30', 'min': 0, 'max': 29},
            {'label': '30-39', 'min': 30, 'max': 39},
            {'label': '40-49', 'min': 40, 'max': 49},
            {'label': '50-59', 'min': 50, 'max': 59},
            {'label': '60-69', 'min': 60, 'max': 69},
            {'label': '70-79', 'min': 70, 'max': 79},
            {'label': '80+', 'min': 80, 'max': 150}
        ]
        
        # Tumor count ranges
        tumor_count_ranges = [
            {'label': 'Single (1)', 'min': 1, 'max': 1},
            {'label': '2-3 tumors', 'min': 2, 'max': 3},
            {'label': '4-5 tumors', 'min': 4, 'max': 5}
        ]
        
        # Height ranges (cm)
        height_ranges = [
            {'label': 'Under 150cm', 'min': 0, 'max': 149.9},
            {'label': '150-159cm', 'min': 150, 'max': 159.9},
            {'label': '160-169cm', 'min': 160, 'max': 169.9},
            {'label': '170-179cm', 'min': 170, 'max': 179.9},
            {'label': '180-189cm', 'min': 180, 'max': 189.9},
            {'label': '190cm+', 'min': 190, 'max': 250}
        ]
        
        # Weight ranges (kg)
        weight_ranges = [
            {'label': 'Under 50kg', 'min': 0, 'max': 49.9},
            {'label': '50-59kg', 'min': 50, 'max': 59.9},
            {'label': '60-69kg', 'min': 60, 'max': 69.9},
            {'label': '70-79kg', 'min': 70, 'max': 79.9},
            {'label': '80-89kg', 'min': 80, 'max': 89.9},
            {'label': '90kg+', 'min': 90, 'max': 200}
        ]
        
        # Blood pressure ranges
        bp_systolic_ranges = [
            {'label': 'Normal (<120)', 'min': 0, 'max': 119},
            {'label': 'Elevated (120-129)', 'min': 120, 'max': 129},
            {'label': 'Stage 1 (130-139)', 'min': 130, 'max': 139},
            {'label': 'Stage 2 (140-179)', 'min': 140, 'max': 179},
            {'label': 'Crisis (180+)', 'min': 180, 'max': 300}
        ]
        
        bp_diastolic_ranges = [
            {'label': 'Normal (<80)', 'min': 0, 'max': 79},
            {'label': 'Stage 1 (80-89)', 'min': 80, 'max': 89},
            {'label': 'Stage 2 (90-119)', 'min': 90, 'max': 119},
            {'label': 'Crisis (120+)', 'min': 120, 'max': 200}
        ]
        
        # Tumor-specific filters
        tumor_locations = db.session.query(distinct(TumorMask.location)).all()
        tumor_location_options = [location[0] for location in tumor_locations if location[0]]
        
        # Tumor volume ranges (mm³)
        tumor_volume_ranges = [
            {'label': 'Very Small (<20mm³)', 'min': 0, 'max': 19.9},
            {'label': 'Small (20-50mm³)', 'min': 20, 'max': 49.9},
            {'label': 'Medium (50-100mm³)', 'min': 50, 'max': 99.9},
            {'label': 'Large (100-200mm³)', 'min': 100, 'max': 199.9},
            {'label': 'Very Large (200mm³+)', 'min': 200, 'max': 1000}
        ]
        
        # Dose ranges
        dose_ranges = [
            {'label': 'Low dose (<30)', 'min': 0, 'max': 29},
            {'label': 'Medium dose (30-50)', 'min': 30, 'max': 50},
            {'label': 'High dose (51-70)', 'min': 51, 'max': 70}
        ]
        
        return {
            'patient_demographics': {
                'origin_cancer': {'type': 'select', 'options': origin_cancer_options},
                'sex': {'type': 'select', 'options': sex_options},
                'age_range': {'type': 'range', 'options': age_ranges},
                'height_range': {'type': 'range', 'options': height_ranges},
                'weight_range': {'type': 'range', 'options': weight_ranges},
                'tumor_count_range': {'type': 'range', 'options': tumor_count_ranges}
            },
            'clinical_data': {
                'systolic_bp_range': {'type': 'range', 'options': bp_systolic_ranges},
                'diastolic_bp_range': {'type': 'range', 'options': bp_diastolic_ranges}
            },
            'tumor_characteristics': {
                'tumor_location': {'type': 'select', 'options': tumor_location_options},
                'tumor_volume_range': {'type': 'range', 'options': tumor_volume_ranges}
            },
            'treatment_data': {
                'dose_range': {'type': 'range', 'options': dose_ranges}
            }
        }
    except Exception as e:
        print(f"Error getting filter options: {e}")
        return {}

# Get available filter options
@filters.route('/filter-options', methods=['GET'])
def get_filter_options_endpoint():
    return jsonify(get_filter_options())

# get all active filters
@filters.route('/filters', methods=['GET'])
def get_filters():
    return jsonify(active_filters)

# create new filter
@filters.route('/filters', methods=['POST'])
def create_filter():
    id = request.json.get('id')
    name = request.json.get('name')
    criteria = request.json.get('criteria', {})
    
    if not id or not name:
        return jsonify({ 'error': 'error: invalid filter' }), 400

    active_filters[id] = { 'name': name, 'criteria': criteria }
    
    # Generate the NIfTI file using the new criteria format
    try:
        result_path = generate_display_nifti(id, criteria)
        
        if result_path:
            print(f"Successfully created NIfTI file at {result_path}")
            active_filters[id]['nifti_path'] = result_path
        else:
            print(f"Failed to create NIfTI file for filter {id}")
            
    except Exception as e:
        print(f"An error occurred while generating the NIfTI file: {e}")

    return jsonify({ 'message': 'success: filter added' }), 201

# modify filter
@filters.route('/filters/<id>', methods=['PUT'])
def modify_filter(id):
    name = request.json.get('name')
    criteria = request.json.get('criteria', {})
    
    if id in active_filters:
        active_filters[id] = { 'name': name, 'criteria': criteria }
        
        # Regenerate the NIfTI file with updated criteria
        try:
            cache_path = os.path.join('/app/filestore/nifti_display_cache', f"{id}.nii.gz")
            if os.path.exists(cache_path):
                os.remove(cache_path)
                
            result_path = generate_display_nifti(id, criteria)
            
            if result_path:
                print(f"Successfully updated NIfTI file at {result_path}")
                active_filters[id]['nifti_path'] = result_path
            else:
                print(f"Failed to update NIfTI file for filter {id}")
                
        except Exception as e:
            print(f"An error occurred while updating the NIfTI file: {e}")
            
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
    current_filter_data = current_app.config.get('CURRENT_FILTER')
    if current_filter_data: 
        return jsonify(current_filter_data), 200 
    else:
        return jsonify({ 'error': 'current filter not set' }), 404