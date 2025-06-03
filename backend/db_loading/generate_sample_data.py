import random
from scipy.stats import truncnorm
from dotenv import load_dotenv
import uuid

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

tumor_size_choices = [
    "small",
    "medium",
    "large"
]

tumor_location_choices = [
    "Frontal Lobe",
    "Parietal Lobe",
    "Temporal Lobe",
    "Occipital Lobe",
    "Cerebellum",
    "Brainstem"
]

# count patient ages from 18-99 with heavier bias toward the 60s
age_mu, age_sigma = 65, 15
age_low, age_high = 18, 99
z_low, z_high = (age_low - age_mu) / age_sigma, (age_high - age_mu) / age_sigma

def generate_sample_data(n):
    samples = []
    for i in range(n):
        raw_age_sample = truncnorm.rvs(z_low, z_high, loc=age_mu, scale=age_sigma, size=1)[0]
        s = SampleData(
            id=uuid.uuid4(),
            origin_cancer=random.choice(origin_cancer_choices),
            tumor_count=random.choices(tumor_count_choices, tumor_count_weights, k=1)[0],
            tumor_size=random.choice(tumor_size_choices),
            tumor_location=random.choice(tumor_location_choices),
            patient_age=int(round(raw_age_sample))
        )
        samples.append(s)
    db.session.add_all(samples)
    db.session.commit()

if __name__ == "__main__":
    with app.app_context():
        generate_sample_data(1000)