from flask import Blueprint, jsonify, request, current_app
from models import Patients, TumorMask, DoseMask, MRIMask, NiftiData
from app import db
from sqlalchemy import distinct, func, and_, or_
import uuid

patient_queries = Blueprint('patient_queries', __name__, url_prefix='/api')

def search_patient_ids(search_term, limit=10):
    """
    Search for patient IDs that match the given search term.
    
    Args:
        search_term (str): The search term to match against patient IDs
        limit (int): Maximum number of results to return
    
    Returns:
        list: List of matching patient IDs with additional info
    """
    try:
        if not search_term or len(search_term.strip()) == 0:
            return []
        
        search_term = search_term.strip().lower()
        
        # Query patients with ID matching the search term
        # Convert UUID to string for partial matching
        query = db.session.query(
            Patients.id,
            func.count(NiftiData.id).label('data_count')
        ).outerjoin(
            NiftiData, Patients.id == NiftiData.patient_id
        ).filter(
            func.cast(Patients.id, db.String).ilike(f'%{search_term}%')
        ).group_by(
            Patients.id
        ).order_by(
            func.count(NiftiData.id).desc()  # Order by data availability
        ).limit(limit)
        
        results = query.all()
        
        # Format results
        formatted_results = []
        for patient_id, data_count in results:
            formatted_results.append({
                'id': str(patient_id),
                'data_count': data_count,
                'display_name': f"Patient {str(patient_id)[:8]}..."  # Truncated for display
            })
        
        return formatted_results
        
    except Exception as e:
        current_app.logger.error(f"Error searching patient IDs: {e}")
        return []

def get_patient_overview(patient_id):
    """
    Get basic overview information for a specific patient.
    
    Args:
        patient_id (str): The patient UUID
    
    Returns:
        dict: Patient overview information
    """
    try:
        # Validate UUID format
        try:
            uuid.UUID(patient_id)
        except ValueError:
            return {'error': 'Invalid patient ID format'}
        
        patient = db.session.query(Patients).filter(Patients.id == patient_id).first()
        
        if not patient:
            return {'error': 'Patient not found'}
        
        # Get data counts
        tumor_count = db.session.query(NiftiData).join(
            TumorMask, TumorMask.id == NiftiData.id
        ).filter(NiftiData.patient_id == patient_id).count()
        
        mri_count = db.session.query(NiftiData).join(
            MRIMask, MRIMask.id == NiftiData.id
        ).filter(NiftiData.patient_id == patient_id).count()
        
        dose_count = db.session.query(NiftiData).join(
            DoseMask, DoseMask.id == NiftiData.id
        ).filter(NiftiData.patient_id == patient_id).count()
        
        return {
            'id': str(patient.id),
            'origin_cancer': patient.origin_cancer,
            'tumor_count': patient.tumor_count,
            'sex': patient.sex,
            'height_cm': patient.height_cm,
            'weight_kg': patient.weight_kg,
            'systolic_bp': patient.systolic_bp,
            'diastolic_bp': patient.diastolic_bp,
            'date_of_original_diagnosis': patient.date_of_original_diagnosis.isoformat() if patient.date_of_original_diagnosis else None,
            'date_of_metastatic_diagnosis': patient.date_of_metastatic_diagnosis.isoformat() if patient.date_of_metastatic_diagnosis else None,
            'data_summary': {
                'tumor_masks': tumor_count,
                'mri_masks': mri_count,
                'dose_masks': dose_count,
                'total_data_points': tumor_count + mri_count + dose_count
            }
        }
        
    except Exception as e:
        current_app.logger.error(f"Error getting patient overview: {e}")
        return {'error': 'Failed to retrieve patient information'}

def get_patient_mri_timeline(patient_id):
    """
    Get MRI timeline for a specific patient.
    
    Args:
        patient_id (str): The patient UUID
    
    Returns:
        dict: MRI timeline information
    """
    try:
        # Validate UUID format
        try:
            uuid.UUID(patient_id)
        except ValueError:
            return {'error': 'Invalid patient ID format'}
        
        # Query MRI data for the patient
        mri_scans = db.session.query(
            NiftiData.id,
            MRIMask.timepoint
        ).join(
            MRIMask, MRIMask.id == NiftiData.id
        ).filter(
            NiftiData.patient_id == patient_id,
            NiftiData.series_type == 'mri_mask'
        ).order_by(
            MRIMask.timepoint.asc()
        ).all()
        
        # Format results
        formatted_scans = []
        for scan_id, timepoint in mri_scans:
            formatted_scans.append({
                'id': str(scan_id),
                'date': timepoint.isoformat() if timepoint else None,
                'timepoint': f"Scan {len(formatted_scans) + 1}" if timepoint else "Unknown"
            })
        
        return {
            'patient_id': patient_id,
            'mri_scans': formatted_scans,
            'total_scans': len(formatted_scans)
        }
        
    except Exception as e:
        current_app.logger.error(f"Error getting patient MRI timeline: {e}")
        return {'error': 'Failed to retrieve MRI timeline'}

def get_patient_tumors(patient_id):
    """
    Get tumor list for a specific patient.
    
    Args:
        patient_id (str): The patient UUID
    
    Returns:
        dict: Tumor information
    """
    try:
        # Validate UUID format
        try:
            uuid.UUID(patient_id)
        except ValueError:
            return {'error': 'Invalid patient ID format'}
        
        # Query tumor data for the patient
        tumors = db.session.query(
            NiftiData.id,
            TumorMask.location,
            TumorMask.volume_mm3
        ).join(
            TumorMask, TumorMask.id == NiftiData.id
        ).filter(
            NiftiData.patient_id == patient_id,
            NiftiData.series_type == 'tumor_mask'
        ).order_by(
            TumorMask.volume_mm3.desc()  # Largest tumors first
        ).all()
        
        # Format results
        formatted_tumors = []
        for tumor_id, location, volume in tumors:
            formatted_tumors.append({
                'id': str(tumor_id),
                'location': location,
                'volume_mm3': volume
            })
        
        return {
            'patient_id': patient_id,
            'tumors': formatted_tumors,
            'total_tumors': len(formatted_tumors)
        }
        
    except Exception as e:
        current_app.logger.error(f"Error getting patient tumors: {e}")
        return {'error': 'Failed to retrieve tumor data'}

def get_patient_treatments(patient_id):
    """
    Get treatment information for a specific patient.
    
    Args:
        patient_id (str): The patient UUID
    
    Returns:
        dict: Treatment information (currently empty as treatments aren't tracked)
    """
    try:
        # Validate UUID format
        try:
            uuid.UUID(patient_id)
        except ValueError:
            return {'error': 'Invalid patient ID format'}
        
        # For now, return empty list since treatments aren't tracked in the database
        # This can be expanded when you add treatment tracking
        return {
            'patient_id': patient_id,
            'treatments': [],
            'total_treatments': 0,
            'note': 'Treatment tracking not yet implemented in database'
        }
        
    except Exception as e:
        current_app.logger.error(f"Error getting patient treatments: {e}")
        return {'error': 'Failed to retrieve treatment data'}

# API Endpoints

@patient_queries.route('/patients/search', methods=['GET'])
def search_patients():
    """
    Search for patients by ID with string matching.
    
    Query Parameters:
        q (str): Search term for patient ID
        limit (int, optional): Maximum number of results (default: 10)
    
    Returns:
        JSON response with matching patient IDs and metadata
    """
    try:
        search_term = request.args.get('q', '').strip()
        limit = min(int(request.args.get('limit', 10)), 50)  # Cap at 50 results
        
        if not search_term:
            return jsonify({
                'results': [],
                'total': 0,
                'message': 'No search term provided'
            })
        
        results = search_patient_ids(search_term, limit)
        
        return jsonify({
            'results': results,
            'total': len(results),
            'search_term': search_term,
            'limit': limit
        })
        
    except Exception as e:
        current_app.logger.error(f"Error in patient search endpoint: {e}")
        return jsonify({
            'error': 'Failed to search patients',
            'message': str(e)
        }), 500

@patient_queries.route('/patients/<patient_id>/overview', methods=['GET'])
def get_patient_overview_endpoint(patient_id):
    """
    Get overview information for a specific patient.
    
    Args:
        patient_id (str): The patient UUID
    
    Returns:
        JSON response with patient overview information
    """
    try:
        result = get_patient_overview(patient_id)
        
        if 'error' in result:
            return jsonify(result), 404
        
        return jsonify(result)
        
    except Exception as e:
        current_app.logger.error(f"Error in patient overview endpoint: {e}")
        return jsonify({
            'error': 'Failed to retrieve patient overview',
            'message': str(e)
        }), 500

@patient_queries.route('/patients/count', methods=['GET'])
def get_patient_count():
    """
    Get total count of patients in the database.
    
    Returns:
        JSON response with patient count
    """
    try:
        count = db.session.query(Patients).count()
        
        return jsonify({
            'total_patients': count
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting patient count: {e}")
        return jsonify({
            'error': 'Failed to get patient count',
            'message': str(e)
        }), 500

@patient_queries.route('/patients/<patient_id>/mri-timeline', methods=['GET'])
def get_patient_mri_timeline_endpoint(patient_id):
    """
    Get MRI timeline for a specific patient.
    
    Args:
        patient_id (str): The patient UUID
    
    Returns:
        JSON response with MRI timeline information
    """
    try:
        result = get_patient_mri_timeline(patient_id)
        
        if 'error' in result:
            return jsonify(result), 404
        
        return jsonify(result)
        
    except Exception as e:
        current_app.logger.error(f"Error in patient MRI timeline endpoint: {e}")
        return jsonify({
            'error': 'Failed to retrieve MRI timeline',
            'message': str(e)
        }), 500

@patient_queries.route('/patients/<patient_id>/tumors', methods=['GET'])
def get_patient_tumors_endpoint(patient_id):
    """
    Get tumor list for a specific patient.
    
    Args:
        patient_id (str): The patient UUID
    
    Returns:
        JSON response with tumor information
    """
    try:
        result = get_patient_tumors(patient_id)
        
        if 'error' in result:
            return jsonify(result), 404
        
        return jsonify(result)
        
    except Exception as e:
        current_app.logger.error(f"Error in patient tumors endpoint: {e}")
        return jsonify({
            'error': 'Failed to retrieve tumor data',
            'message': str(e)
        }), 500

@patient_queries.route('/patients/<patient_id>/treatments', methods=['GET'])
def get_patient_treatments_endpoint(patient_id):
    """
    Get treatment information for a specific patient.
    
    Args:
        patient_id (str): The patient UUID
    
    Returns:
        JSON response with treatment information
    """
    try:
        result = get_patient_treatments(patient_id)
        
        if 'error' in result:
            return jsonify(result), 404
        
        return jsonify(result)
        
    except Exception as e:
        current_app.logger.error(f"Error in patient treatments endpoint: {e}")
        return jsonify({
            'error': 'Failed to retrieve treatment data',
            'message': str(e)
        }), 500

