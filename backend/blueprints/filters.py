from flask import Blueprint, jsonify, request, current_app
import os
import sys
from db_loading.generate_display_nifti import generate_display_nifti, get_filtered_tumor_ids, get_filtered_mri_ids, get_filtered_dose_ids
from models import Patients, TumorMask, DoseMask, MRIMask, NiftiData
from app import db
from sqlalchemy import distinct
from datetime import date

filters = Blueprint('filters', __name__, url_prefix='/api')

def get_default_filters():
    """Create a fresh copy of default filters for each request."""
    return {
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

def get_filter_statistics(criteria, mask_type='tumor'):
    """Calculate statistics based on current filter criteria."""
    try:
        # Get filtered IDs for each mask type
        tumor_ids = get_filtered_tumor_ids(criteria)
        mri_ids = get_filtered_mri_ids(criteria)
        dose_ids = get_filtered_dose_ids(criteria)
        
        # Get unique patient IDs from each mask type
        tumor_patient_ids = set()
        mri_patient_ids = set()
        dose_patient_ids = set()
        
        if tumor_ids:
            tumor_patients = db.session.query(distinct(NiftiData.patient_id)).join(
                TumorMask, TumorMask.id == NiftiData.id
            ).filter(TumorMask.id.in_(tumor_ids)).all()
            tumor_patient_ids = {p[0] for p in tumor_patients}
        
        if mri_ids:
            mri_patients = db.session.query(distinct(NiftiData.patient_id)).join(
                MRIMask, MRIMask.id == NiftiData.id
            ).filter(MRIMask.id.in_(mri_ids)).all()
            mri_patient_ids = {p[0] for p in mri_patients}
        
        if dose_ids:
            dose_patients = db.session.query(distinct(NiftiData.patient_id)).join(
                DoseMask, DoseMask.id == NiftiData.id
            ).filter(DoseMask.id.in_(dose_ids)).all()
            dose_patient_ids = {p[0] for p in dose_patients}
        
        # Calculate total unique patients across all mask types
        all_patient_ids = tumor_patient_ids.union(mri_patient_ids).union(dose_patient_ids)
        
        return {
            'total_patients': len(all_patient_ids),
            'total_tumors': len(tumor_ids) if tumor_ids else 0,
            'total_mris': len(mri_ids) if mri_ids else 0,
            'total_dose_masks': len(dose_ids) if dose_ids else 0,
            'current_mask_type': mask_type,
            'current_mask_count': {
                'tumor': len(tumor_ids) if tumor_ids else 0,
                'mri': len(mri_ids) if mri_ids else 0,
                'dose': len(dose_ids) if dose_ids else 0
            }.get(mask_type, 0)
        }
        
    except Exception as e:
        print(f"Error calculating filter statistics: {e}")
        return {
            'total_patients': 0,
            'total_tumors': 0,
            'total_mris': 0,
            'total_dose_masks': 0,
            'current_mask_type': mask_type,
            'current_mask_count': 0,
            'error': str(e)
        }

# Get available filter options
@filters.route('/filter-options', methods=['GET'])
def get_filter_options_endpoint():
    return jsonify(get_filter_options())

# Get filter statistics for current or specified filter
@filters.route('/filter-statistics', methods=['GET'])
@filters.route('/filter-statistics/<filter_id>', methods=['GET'])
def get_filter_statistics_endpoint(filter_id=None):
    """Get statistics for the current filter or a specific filter."""
    try:
        # Get mask type from query parameter
        mask_type = request.args.get('maskType', current_app.config.get('CURRENT_MASK_TYPE', 'tumor'))
        
        if filter_id:
            # Get statistics for specific filter
            active_filters = get_default_filters() # Create a fresh copy for this request
            if filter_id in active_filters:
                criteria = active_filters[filter_id]['criteria']
                stats = get_filter_statistics(criteria, mask_type)
                stats['filter_id'] = filter_id
                stats['filter_name'] = active_filters[filter_id]['name']
                return jsonify(stats)
            else:
                return jsonify({'error': 'Filter not found'}), 404
        else:
            # Get statistics for current filter
            current_filter_config = current_app.config.get('CURRENT_FILTER', {})
            current_mask_type = current_app.config.get('CURRENT_MASK_TYPE', 'tumor')
            
            if current_filter_config:
                filter_id = list(current_filter_config.keys())[0]
                criteria = current_filter_config[filter_id]['criteria']
                stats = get_filter_statistics(criteria, current_mask_type)
                stats['filter_id'] = filter_id
                stats['filter_name'] = current_filter_config[filter_id]['name']
                return jsonify(stats)
            else:
                # No current filter, return empty statistics
                return jsonify({
                    'total_patients': 0,
                    'total_tumors': 0,
                    'total_mris': 0,
                    'total_dose_masks': 0,
                    'current_mask_type': current_mask_type,
                    'current_mask_count': 0,
                    'filter_id': None,
                    'filter_name': 'No Filter Active'
                })
                
    except Exception as e:
        print(f"Error getting filter statistics: {e}")
        return jsonify({'error': f'Failed to get statistics: {str(e)}'}), 500

# get all active filters
@filters.route('/filters', methods=['GET'])
def get_filters():
    active_filters = get_default_filters() # Create a fresh copy for this request
    return jsonify(active_filters)

# create new filter
@filters.route('/filters', methods=['POST'])
def create_filter():
    id = request.json.get('id')
    name = request.json.get('name')
    criteria = request.json.get('criteria', {})
    
    if not id or not name:
        return jsonify({ 'error': 'error: invalid filter' }), 400

    active_filters = get_default_filters() # Create a fresh copy for this request
    active_filters[id] = { 'name': name, 'criteria': criteria }
    
    # Generate the NIfTI file using the new criteria format and current mask type
    try:
        current_mask_type = current_app.config.get('CURRENT_MASK_TYPE', 'tumor')
        result_path = generate_display_nifti(id, criteria, current_mask_type)
        
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
    
    active_filters = get_default_filters() # Create a fresh copy for this request
    if id in active_filters:
        active_filters[id] = { 'name': name, 'criteria': criteria }
        
        # Regenerate the NIfTI file with updated criteria and current mask type
        try:
            current_mask_type = current_app.config.get('CURRENT_MASK_TYPE', 'tumor')
            
            # Remove all mask type cache files for this filter
            filestore_path = current_app.config['FILESTORE_PATH']
            cache_dirs = ['tumor_mask_cache', 'mri_mask_cache', 'dose_mask_cache']
            for cache_dir in cache_dirs:
                cache_path = os.path.join(filestore_path, cache_dir, f"{id}.nii.gz")
                if os.path.exists(cache_path):
                    os.remove(cache_path)
                    
            result_path = generate_display_nifti(id, criteria, current_mask_type)
            
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
    active_filters = get_default_filters() # Create a fresh copy for this request
    if id in active_filters:
        del active_filters[id]
        
        # Clean up associated NIfTI files from all mask type caches
        try:
            filestore_path = current_app.config['FILESTORE_PATH']
            cache_dirs = ['tumor_mask_cache', 'mri_mask_cache', 'dose_mask_cache']
            for cache_dir in cache_dirs:
                cache_path = os.path.join(filestore_path, cache_dir, f"{id}.nii.gz")
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
    try:
        mask_type = request.args.get('maskType', 'tumor')  # Default to tumor masks
        print(f"set_current_filter called with id: {id}, maskType: {mask_type}")
        
        active_filters = get_default_filters() # Create a fresh copy for this request
        if id in active_filters:
            # Store current filter and mask type in Redis for this request
            # This is temporary until we implement proper user sessions
            redis_key_filter = f'current_filter:{id}'
            redis_key_mask = f'current_mask_type:{id}'
            
            from app import redis_cache
            redis_cache.set_path(redis_key_filter, str(id))
            redis_cache.set_path(redis_key_mask, mask_type)
            
            print(f"Updated current filter to {id} with mask type {mask_type}")
            
            # Generate NIfTI file for this mask type if it doesn't exist
            try:
                cache_subdirs = {
                    'tumor': 'tumor_mask_cache',
                    'mri': 'mri_mask_cache', 
                    'dose': 'dose_mask_cache'
                }
                filestore_path = current_app.config['FILESTORE_PATH']
                cache_subdir = cache_subdirs.get(mask_type, 'tumor_mask_cache')
                cache_path = os.path.join(filestore_path, cache_subdir, f"{id}.nii.gz")
                
                print(f"Checking cache path: {cache_path}")
                
                if not os.path.exists(cache_path):
                    print(f"Generating {mask_type} mask for filter {id}")
                    criteria = active_filters[id]['criteria']
                    result_path = generate_display_nifti(id, criteria, mask_type)
                    
                    if result_path:
                        print(f"Successfully generated {mask_type} mask at {result_path}")
                    else:
                        print(f"Failed to generate {mask_type} mask for filter {id}")
                        return jsonify({ 'error': f'Failed to generate {mask_type} mask' }), 500
                else:
                    print(f"{mask_type.title()} mask already exists for filter {id}")
                    
            except Exception as e:
                print(f"Error generating {mask_type} mask: {e}")
                import traceback
                traceback.print_exc()
                return jsonify({ 'error': f'Error generating {mask_type} mask: {str(e)}' }), 500
            
            return jsonify({ 'message': 'successfully updated current filter' }), 200
        
        print(f"Filter {id} not found in active_filters")
        return jsonify({ 'error': 'filter not found' }), 404
        
    except Exception as e:
        print(f"Unexpected error in set_current_filter: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({ 'error': f'Internal server error: {str(e)}' }), 500

# get current filter
@filters.route('/filters/get_current', methods=['GET'])
def get_current_filter():
    # For now, return the default filter since we're not tracking per-user state yet
    # This will be updated when we implement proper user sessions
    default_filters = get_default_filters()
    return jsonify(default_filters), 200