# Brain Visualizer Data Schemas

This document provides a comprehensive overview of the data schemas used in the Brain Visualizer application, including database models, API structures, and data flow patterns.

## Database Schema

### Core Tables

#### 1. Patients Table (`patients`)

The central table storing patient demographic and clinical information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key, Unique, Not Null | Unique patient identifier |
| `origin_cancer` | String | Not Null | Primary cancer type/site |
| `tumor_count` | Integer | Not Null | Number of tumors present |
| `dob` | Date | Not Null | Date of birth |
| `sex` | String(10) | Not Null | Biological sex ('M' or 'F') |
| `height_cm` | Float | Not Null | Height in centimeters |
| `weight_kg` | Float | Not Null | Weight in kilograms |
| `systolic_bp` | Integer | Not Null | Systolic blood pressure |
| `diastolic_bp` | Integer | Not Null | Diastolic blood pressure |
| `date_of_original_diagnosis` | Date | Not Null | Initial cancer diagnosis date |
| `date_of_metastatic_diagnosis` | Date | Not Null | Metastasis diagnosis date |

**Relationships:**
- One-to-Many with `nifti_data` table
- Cascade delete: Deleting a patient removes all associated NIFTI data

#### 2. NIFTI Data Table (`nifti_data`)

Central table for managing different types of medical imaging data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key, Unique, Not Null | Unique NIFTI data identifier |
| `patient_id` | UUID | Foreign Key, Not Null | Reference to patients.id |
| `series_type` | String | Not Null, Check Constraint | Type of imaging data |

**Series Type Constraints:**
- `tumor_mask`: Tumor segmentation masks
- `dose_mask`: Radiation dose distribution masks  
- `mri_mask`: MRI scan masks

**Relationships:**
- Many-to-One with `patients` table
- One-to-One with specialized mask tables (`tumor_mask`, `dose_mask`, `mri_mask`)
- Cascade delete: Deleting NIFTI data removes associated mask data

#### 3. Tumor Mask Table (`tumor_mask`)

Stores detailed information about tumor segmentation data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key, Foreign Key, Unique | References nifti_data.id |
| `location` | String | Not Null | Anatomical location of tumor |
| `volume_mm3` | Float | Not Null | Tumor volume in cubic millimeters |
| `x_com`, `y_com`, `z_com` | Integer | Not Null | Center of mass coordinates |
| `x_min`, `x_max` | Integer | Not Null | X-axis bounding box |
| `y_min`, `y_max` | Integer | Not Null | Y-axis bounding box |
| `z_min`, `z_max` | Integer | Not Null | Z-axis bounding box |

**Purpose:** Stores spatial and volumetric information extracted from tumor segmentation NIFTI files.

#### 4. Dose Mask Table (`dose_mask`)

Stores radiation therapy dose distribution information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key, Foreign Key, Unique | References nifti_data.id |
| `max_dose` | Integer | Not Null | Maximum radiation dose value |
| `volume_mm3` | Float | Not Null | Volume of tissue receiving dose |
| `x_com`, `y_com`, `z_com` | Integer | Not Null | Center of mass coordinates |
| `x_min`, `x_max` | Integer | Not Null | X-axis bounding box |
| `y_min`, `y_max` | Integer | Not Null | Y-axis bounding box |
| `z_min`, `z_max` | Integer | Not Null | Z-axis bounding box |

**Purpose:** Stores radiation dose distribution data for treatment planning and analysis.

#### 5. MRI Mask Table (`mri_mask`)

Stores MRI scan metadata and timing information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key, Foreign Key, Unique | References nifti_data.id |
| `timepoint` | TIMESTAMP | Nullable | When the MRI scan was acquired |

**Purpose:** Stores temporal information for longitudinal MRI studies.

## File Storage Schema

### Directory Structure

```
filestore/
├── dose_mask_cache/          # Radiation dose mask NIFTI files
├── mri_mask_cache/           # MRI scan mask NIFTI files  
├── tumor_mask_cache/         # Tumor segmentation NIFTI files
└── test_db_nifti/           # Test database NIFTI files
```

### File Naming Convention

- **Cache Files**: UUID-based naming for efficient retrieval
- **Default Files**: `default_id.nii.gz` for fallback scenarios
- **Special Collections**: Named collections (e.g., `lung_cancer_tumors.nii.gz`)

## API Data Structures

### Patient Search Response

```json
{
  "id": "uuid-string",
  "data_count": 5,
  "display_name": "Patient abc12345..."
}
```

### Patient Overview Response

```json
{
  "id": "uuid-string",
  "origin_cancer": "lung",
  "tumor_count": 3,
  "sex": "M",
  "height_cm": 175.0,
  "weight_kg": 70.0,
  "systolic_bp": 120,
  "diastolic_bp": 80,
  "data_counts": {
    "tumor_masks": 3,
    "mri_masks": 1,
    "dose_masks": 1
  }
}
```

### Chart Data Structure

All chart types follow a common data structure:

```json
{
  "title": "Chart Title",
  "xaxis_title": "X Axis Label",
  "yaxis_title": "Y Axis Label",
  "series": [
    {
      "name": "Series Name",
      "data": [...],
      "type": "chart_type"
    }
  ]
}
```

**Supported Chart Types:**
- Bar charts
- Line charts
- Scatter plots
- Box plots
- Histograms
- Bubble charts

## Data Flow Architecture

### 1. Data Ingestion
- NIFTI files uploaded to appropriate cache directories
- Metadata extracted and stored in database tables
- Spatial coordinates and volumes calculated from 3D data

### 2. Data Retrieval
- Patient queries filtered by various criteria
- NIFTI data retrieved based on series type
- Spatial data used for 3D visualization

### 3. Data Visualization
- Chart data formatted using common structure
- 3D rendering using extracted spatial coordinates
- Interactive filtering based on patient demographics

## Database Constraints

### Foreign Key Relationships
- `nifti_data.patient_id` → `patients.id` (CASCADE DELETE)
- `tumor_mask.id` → `nifti_data.id` (CASCADE DELETE)
- `dose_mask.id` → `nifti_data.id` (CASCADE DELETE)
- `mri_mask.id` → `nifti_data.id` (CASCADE DELETE)

### Check Constraints
- `series_type` must be one of: 'tumor_mask', 'dose_mask', 'mri_mask'

### Unique Constraints
- All primary keys are UUID-based and unique
- Patient IDs are globally unique across the system

## Data Validation

### Input Validation
- UUID format validation for patient IDs
- Date format validation for temporal fields
- Numeric range validation for physical measurements
- String length limits for text fields

### Business Logic Validation
- Tumor count consistency with actual tumor mask data
- Coordinate system validation for spatial data
- Volume calculations verification

## Performance Considerations

### Indexing Strategy
- Primary keys automatically indexed
- Foreign key relationships indexed for join performance
- Consider adding indexes on frequently queried fields:
  - `patients.origin_cancer`
  - `patients.sex`
  - `nifti_data.series_type`

### Caching Strategy
- Redis cache for frequently accessed patient data
- NIFTI file caching in filesystem
- Session-based user management

## Security Considerations

### Data Access Control
- Session-based authentication
- UUID-based patient identification
- No direct exposure of internal file paths

### Data Privacy
- Patient identifiers use UUIDs for anonymity
- Sensitive medical data stored securely
- Access logging for audit trails

## Future Schema Extensions

### Potential Additions
- Treatment history tracking
- Outcome data integration
- Multi-modal imaging support
- Longitudinal study management
- Advanced analytics metadata

### Migration Strategy
- Alembic-based schema migrations
- Backward compatibility maintenance
- Data validation during migrations
- Rollback capabilities for failed migrations
