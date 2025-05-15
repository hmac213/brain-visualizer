import os
import uuid
import numpy as np
import nibabel as nib
from scipy.ndimage import gaussian_filter

from dotenv import load_dotenv
load_dotenv()

from app import app, db
from models import SampleData

"""
origin_cancer: [
    "Lung",
    "Liver",
    "Breast",
    "Colorectal",
    "Melanoma",
    "Renal"
  ],
  tumor_count: [
    "Single",
    "2-3 lesions",
    "4+ lesions"
  ],
  tumor_size: [
    "Small (<1cm)",
    "Medium (1-3cm)",
    "Large (>3cm)"
  ],
  tumor_location: [
    "Frontal Lobe",
    "Parietal Lobe",
    "Temporal Lobe",
    "Occipital Lobe",
    "Cerebellum",
    "Brainstem"
  ],
  patient_age: [
    "<20",
    "21-30",
    "31-40",
    "41-50",
    "51-60",
    "61-70",
    "70+"
  ],
"""

OUT_DIR = '../filestore/nifti_display_cache'

def gen_display_nifti(options):
    """
    Query the database and return an array of IDs that match the filter criteria.
    If a filter category has no options selected, don't filter on that category.
    
    Args:
        options: Flat list of selected filter options
    
    Returns:
        List of UUIDs that match the filter criteria
    """
    # Define categories and their available options
    categories = {
        'origin_cancer': ["Lung", "Liver", "Breast", "Colorectal", "Melanoma", "Renal"],
        'tumor_count': ["Single", "2-3 lesions", "4+ lesions"],
        'tumor_size': ["Small (<1cm)", "Medium (1-3cm)", "Large (>3cm)"],
        'tumor_location': ["Frontal Lobe", "Parietal Lobe", "Temporal Lobe", "Occipital Lobe", "Cerebellum", "Brainstem"],
        'patient_age': ["<20", "21-30", "31-40", "41-50", "51-60", "61-70", "70+"]
    }
    
    # Preprocess options into categories
    categorized_options = {}
    for category, valid_options in categories.items():
        # Find options that belong to this category
        categorized_options[category] = [opt for opt in options if opt in valid_options]
    
    # Create a base query
    query = SampleData.query
    
    # Apply filters for each category if options are provided
    if categorized_options.get('origin_cancer') and len(categorized_options['origin_cancer']) > 0:
        query = query.filter(SampleData.origin_cancer.in_(categorized_options['origin_cancer']))
    
    # Handle tumor_count which is stored as an integer but presented as text ranges
    if categorized_options.get('tumor_count') and len(categorized_options['tumor_count']) > 0:
        tumor_count_filters = []
        for count_option in categorized_options['tumor_count']:
            if count_option == "Single":
                tumor_count_filters.append(SampleData.tumor_count == 1)
            elif count_option == "2-3 lesions":
                tumor_count_filters.append(SampleData.tumor_count.between(2, 3))
            elif count_option == "4+ lesions":
                tumor_count_filters.append(SampleData.tumor_count >= 4)
        
        if tumor_count_filters:
            query = query.filter(db.or_(*tumor_count_filters))
    
    if categorized_options.get('tumor_size') and len(categorized_options['tumor_size']) > 0:
        # Map UI labels to database values
        size_mapping = {
            "Small (<1cm)": "small",
            "Medium (1-3cm)": "medium",
            "Large (>3cm)": "large"
        }
        db_sizes = [size_mapping.get(size, size) for size in categorized_options['tumor_size']]
        query = query.filter(SampleData.tumor_size.in_(db_sizes))
    
    if categorized_options.get('tumor_location') and len(categorized_options['tumor_location']) > 0:
        query = query.filter(SampleData.tumor_location.in_(categorized_options['tumor_location']))
    
    # Handle patient_age which is stored as an integer but presented as text ranges
    if categorized_options.get('patient_age') and len(categorized_options['patient_age']) > 0:
        age_filters = []
        for age_range in categorized_options['patient_age']:
            if age_range == "<20":
                age_filters.append(SampleData.patient_age < 20)
            elif age_range == "21-30":
                age_filters.append(SampleData.patient_age.between(21, 30))
            elif age_range == "31-40":
                age_filters.append(SampleData.patient_age.between(31, 40))
            elif age_range == "41-50":
                age_filters.append(SampleData.patient_age.between(41, 50))
            elif age_range == "51-60":
                age_filters.append(SampleData.patient_age.between(51, 60))
            elif age_range == "61-70":
                age_filters.append(SampleData.patient_age.between(61, 70))
            elif age_range == "70+":
                age_filters.append(SampleData.patient_age > 70)
        
        if age_filters:
            query = query.filter(db.or_(*age_filters))
    
    # Execute the query and extract IDs
    results = query.all()
    
    # Convert the query results to a list of UUIDs
    id_list = [str(result.id) for result in results]
    
    return id_list