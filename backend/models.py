import uuid
from sqlalchemy.dialects.postgresql import UUID
from app import db

class SampleData(db.Model):
    __tablename__ = 'sample_data'

    id               = db.Column(
                          UUID(as_uuid=True),
                          primary_key=True,
                          default=uuid.uuid4,
                          unique=True,
                          nullable=False
                      )
    origin_cancer    = db.Column(db.String, nullable=False)
    tumor_count      = db.Column(db.Integer, nullable=False)
    tumor_size       = db.Column(db.String, nullable=False)
    tumor_location   = db.Column(db.String, nullable=False)
    patient_age      = db.Column(db.Integer, nullable=False)

    def __repr__(self):
        return f"<SampleData {self.id}>"