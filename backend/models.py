import uuid
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy import CheckConstraint 
from app import db

class Patients(db.Model):
    __tablename__ = 'patients'

    id = db.Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        unique=True,
        nullable=False
    )
    origin_cancer = db.Column(db.String, nullable=False)
    tumor_count = db.Column(db.Integer, nullable=False)

    dob = db.Column(db.Date, nullable=False)
    sex = db.Column(db.String(10), nullable=False) # 'M' or 'F'
    height_cm = db.Column(db.Float, nullable=False)
    weight_kg = db.Column(db.Float, nullable=False)

    systolic_bp = db.Column(db.Integer, nullable=False)
    diastolic_bp = db.Column(db.Integer, nullable=False)

    date_of_original_diagnosis = db.Column(db.Date, nullable=False)
    date_of_metastatic_diagnosis = db.Column(db.Date, nullable=False)

    nifti_data = db.relationship(
        "NiftiData",
        back_populates="patient",
        cascade="all, delete-orphan"
    )

class NiftiData(db.Model):
    __tablename__ = 'nifti_data'
    id = db.Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        unique=True,
        nullable=False
    )
    patient_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False
    )

    series_type = db.Column(db.String, nullable=False) # tumor_mask, dose_mask, mri_mask

    __table_args__ = (
        CheckConstraint(
            "series_type IN ('tumor_mask', 'dose_mask', 'mri_mask')",
            name="check_nifti_data_type"
        ),
    )

    patient = db.relationship(
        "Patients",
        back_populates="nifti_data"
    )
    tumor_mask = db.relationship(
        "TumorMask",
        uselist=False,
        back_populates="nifti_data"
    )
    dose_mask = db.relationship(
        "DoseMask",
        uselist=False,
        back_populates="nifti_data"
    )
    mri_mask = db.relationship(
        "MRIMask",
        uselist=False,
        back_populates="nifti_data"
    )

class TumorMask(db.Model):
    __table_name__ = 'tumor_mask'

    id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("nifti_data.id", ondelete="CASCADE"),
        primary_key=True,
        unique=True
    )

    location = db.Column(db.String, nullable=False)

    volume_mm3 = db.Column(db.Float, nullable=False)

    x_com = db.Column(db.Integer, nullable=False)
    y_com = db.Column(db.Integer, nullable=False)
    z_com = db.Column(db.Integer, nullable=False)

    x_min = db.Column(db.Integer, nullable=False)
    x_max = db.Column(db.Integer, nullable=False)
    y_min = db.Column(db.Integer, nullable=False)
    y_max = db.Column(db.Integer, nullable=False)
    z_min = db.Column(db.Integer, nullable=False)
    z_max = db.Column(db.Integer, nullable=False)

    nifti_data = db.relationship(
        "NiftiData",
        back_populates="tumor_mask"
    )

class DoseMask(db.Model):
    __table_name__ = 'dose_mask'

    id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("nifti_data.id", ondelete="CASCADE"),
        primary_key=True,
        unique=True
    )

    max_dose = db.Column(db.Integer, nullable=False)

    volume_mm3 = db.Column(db.Float, nullable=False)

    x_com = db.Column(db.Integer, nullable=False)
    y_com = db.Column(db.Integer, nullable=False)
    z_com = db.Column(db.Integer, nullable=False)

    x_min = db.Column(db.Integer, nullable=False)
    x_max = db.Column(db.Integer, nullable=False)
    y_min = db.Column(db.Integer, nullable=False)
    y_max = db.Column(db.Integer, nullable=False)
    z_min = db.Column(db.Integer, nullable=False)
    z_max = db.Column(db.Integer, nullable=False)

    nifti_data = db.relationship(
        "NiftiData",
        back_populates="dose_mask"
    )

class MRIMask(db.Model):
    __table_name__ = 'mri_mask'

    id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("nifti_data.id", ondelete="CASCADE"),
        primary_key=True,
        unique=True
    )

    timepoint = db.Column(db.TIMESTAMP, nullable=True)

    nifti_data = db.relationship(
        "NiftiData",
        back_populates="mri_mask"
    )