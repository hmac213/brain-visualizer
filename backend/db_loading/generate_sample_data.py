import random
import uuid
from scipy.stats import truncnorm
from dotenv import load_dotenv
from datetime import date, timedelta

from models import Patients, NiftiData, TumorMask, DoseMask, MRIMask

load_dotenv()

from app import app, db

origin_cancer_choices = [
    "Lung",
    "Liver",
    "Breast",
    "Colorectal",
    "Melanoma",
    "Renal"
]

# count tumors from 1-5 (more common 1 than 5)
tumor_count_choices = [1, 2, 3, 4, 5]
tumor_count_weights = [0.8, 0.1, 0.05, 0.025, 0.025]

# choosing date of birth
dob_mu = date(1960, 1, 1)
years_sigma = 15
min_dob = date(1925, 1, 1)
max_dob = date(2007, 1, 1)

def generate_dob(dob_mu, years_sigma, min_dob, max_dob):
    ordinal_mu = dob_mu.toordinal()
    min_ordinal = min_dob.toordinal()
    max_ordinal = max_dob.toordinal()

    min_z = (min_ordinal - ordinal_mu) / (years_sigma * 365)
    max_z = (max_ordinal - ordinal_mu) / (years_sigma * 365)

    sample_ordinal = truncnorm.rvs(min_z, max_z, loc=ordinal_mu, scale=years_sigma*365, size=1)[0]
    rounded_ordinal = int(round(sample_ordinal))

    return date.fromordinal(rounded_ordinal)

sex_choices = ['M', 'F']

# choosing height
height_stats = {
    'M': {'mu': 176.1, 'sigma': 6.35, 'min': 150, 'max': 210},  # Male height stats
    'F': {'mu': 161.5, 'sigma': 5.59, 'min': 140, 'max': 190}   # Female height stats
}

def generate_height(sex):
    stats = height_stats[sex]
    min_z = (stats['min'] - stats['mu']) / stats['sigma']
    max_z = (stats['max'] - stats['mu']) / stats['sigma']
    
    height = truncnorm.rvs(min_z, max_z, loc=stats['mu'], scale=stats['sigma'], size=1)[0]
    return float(round(height, 1))

# choosing weight
def calculate_bmi(weight_kg, height_cm):
    height_m = height_cm / 100
    return weight_kg / (height_m * height_m)

def generate_weight(height_cm, sex):
    # Target BMI ranges (kg/m²)
    bmi_stats = {
        'M': {'mu': 24.0, 'sigma': 3.0, 'min': 18.5, 'max': 30.0},  # Male BMI stats
        'F': {'mu': 22.0, 'sigma': 2.5, 'min': 18.5, 'max': 30.0}   # Female BMI stats
    }
    
    stats = bmi_stats[sex]
    min_z = (stats['min'] - stats['mu']) / stats['sigma']
    max_z = (stats['max'] - stats['mu']) / stats['sigma']
    
    # Generate BMI
    bmi = truncnorm.rvs(min_z, max_z, loc=stats['mu'], scale=stats['sigma'], size=1)[0]
    
    # Convert BMI to weight
    height_m = height_cm / 100
    weight = bmi * (height_m * height_m)
    
    return float(round(weight, 1))

# choosing blood pressure
def generate_blood_pressure():
    # Systolic BP stats (mmHg)
    systolic_stats = {
        'mu': 120,
        'sigma': 12,
        'min': 90,
        'max': 160
    }
    
    # Diastolic BP stats (mmHg)
    diastolic_stats = {
        'mu': 80,
        'sigma': 8,
        'min': 60,
        'max': 100
    }
    
    # Generate systolic BP
    min_z_sys = (systolic_stats['min'] - systolic_stats['mu']) / systolic_stats['sigma']
    max_z_sys = (systolic_stats['max'] - systolic_stats['mu']) / systolic_stats['sigma']
    systolic = truncnorm.rvs(min_z_sys, max_z_sys, 
                           loc=systolic_stats['mu'], 
                           scale=systolic_stats['sigma'], 
                           size=1)[0]
    
    # Generate diastolic BP
    min_z_dia = (diastolic_stats['min'] - diastolic_stats['mu']) / diastolic_stats['sigma']
    max_z_dia = (diastolic_stats['max'] - diastolic_stats['mu']) / diastolic_stats['sigma']
    diastolic = truncnorm.rvs(min_z_dia, max_z_dia, 
                            loc=diastolic_stats['mu'], 
                            scale=diastolic_stats['sigma'], 
                            size=1)[0]
    
    # Ensure diastolic is not higher than systolic
    while diastolic >= systolic:
        diastolic = truncnorm.rvs(min_z_dia, max_z_dia, 
                                loc=diastolic_stats['mu'], 
                                scale=diastolic_stats['sigma'], 
                                size=1)[0]
    
    return int(round(systolic)), int(round(diastolic))

# choosing cancer diagnosis dates
def generate_cancer_dates(dob):
    current_date = date(2025, 6, 3)
    
    # Calculate age at current date
    age = (current_date - dob).days / 365.25
    
    # Original cancer diagnosis stats
    # Most common age range for cancer diagnosis is 50-70
    min_original = date(dob.year + 30, 1, 1)  # Minimum age 30
    max_original = current_date  # Maximum is current date
    
    # Ensure min_original is not after max_original
    if min_original > max_original:
        min_original = max_original
    
    # Generate original diagnosis date using uniform distribution
    min_ordinal = min_original.toordinal()
    max_ordinal = max_original.toordinal()
    
    original_diagnosis_ordinal = random.randint(min_ordinal, max_ordinal)
    original_diagnosis = date.fromordinal(original_diagnosis_ordinal)
    
    # Ensure original diagnosis is not after current date
    if original_diagnosis > current_date:
        original_diagnosis = current_date
    
    # Metastatic diagnosis stats
    # Can occur from 1 month before to 5 years after original diagnosis
    min_metastatic = original_diagnosis - timedelta(days=30)  # 1 month before
    max_metastatic = min(current_date, date(original_diagnosis.year + 5, 1, 1))  # Maximum 5 years after or current date
    
    # Generate metastatic diagnosis date using uniform distribution
    min_ordinal_meta = min_metastatic.toordinal()
    max_ordinal_meta = max_metastatic.toordinal()
    
    # Ensure we have at least a month's range
    if max_ordinal_meta - min_ordinal_meta < 30:
        max_ordinal_meta = min_ordinal_meta + 30
    
    metastatic_ordinal = random.randint(min_ordinal_meta, max_ordinal_meta)
    metastatic_diagnosis = date.fromordinal(metastatic_ordinal)
    
    # Final safety check to ensure no dates are after current_date
    if metastatic_diagnosis > current_date:
        metastatic_diagnosis = current_date
    
    return original_diagnosis, metastatic_diagnosis

def generate_sample_data(n):
    patient_samples = []

    for i in range(n):
        dob = generate_dob(dob_mu, years_sigma, min_dob, max_dob)
        sex = random.choice(sex_choices)
        height = generate_height(sex)
        weight = generate_weight(height, sex)
        systolic, diastolic = generate_blood_pressure()
        original_diagnosis, metastatic_diagnosis = generate_cancer_dates(dob)
        patient = Patients(
            id=uuid.uuid4(),
            origin_cancer=random.choice(origin_cancer_choices),
            tumor_count=random.choices(tumor_count_choices, tumor_count_weights, k=1)[0],
            dob=dob,
            sex=sex,
            height_cm=height,
            weight_kg=weight,
            systolic_bp=systolic,
            diastolic_bp=diastolic,
            date_of_original_diagnosis=original_diagnosis,
            date_of_metastatic_diagnosis=metastatic_diagnosis
        )
        patient_samples.append(patient)
    db.session.add_all(patient_samples)
    db.session.commit()

if __name__ == "__main__":
    with app.app_context():
        generate_sample_data(1500)
