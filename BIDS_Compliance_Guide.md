# Brain Visualizer Data Pipeline Analysis & BIDS Compliance Guide

## Executive Summary

This document provides a comprehensive analysis of the current Brain Visualizer data pipeline and detailed recommendations for achieving BIDS (Brain Imaging Data Structure) compliance. The system currently manages synthetic brain tumor data with NIfTI files, patient demographics, and treatment information through a PostgreSQL database and Flask backend.

---

## Current Data Pipeline Architecture

### Database Schema Overview

The system uses a PostgreSQL database with the following core tables:

| Table | Purpose | Key Fields | Relationships |
|-------|---------|------------|---------------|
| `patients` | Patient demographics and clinical data | `id` (UUID), `origin_cancer`, `tumor_count`, `dob`, `sex`, `height_cm`, `weight_kg`, `systolic_bp`, `diastolic_bp`, `date_of_original_diagnosis`, `date_of_metastatic_diagnosis` | One-to-many with `nifti_data` |
| `nifti_data` | Links patients to NIfTI files | `id` (UUID), `patient_id`, `series_type` | Many-to-one with `patients`, one-to-one with mask tables |
| `tumor_mask` | Tumor segmentation metadata | `id`, `location`, `volume_mm3`, `x_com`, `y_com`, `z_com`, bounding box coordinates | One-to-one with `nifti_data` |
| `dose_mask` | Radiation treatment metadata | `id`, `max_dose`, `volume_mm3`, `x_com`, `y_com`, `z_com`, bounding box coordinates | One-to-one with `nifti_data` |
| `mri_mask` | MRI scan metadata | `id`, `timepoint` | One-to-one with `nifti_data` |

### File Storage Structure

```
filestore/
├── test_db_nifti/           # Raw NIfTI files (UUID-based naming)
│   ├── 9caf75fe-b66b-468f-ab93-f9488ad1c674.nii.gz
│   ├── 4162eb48-3866-413f-b03f-2557869fcef3.nii.gz
│   └── ...
├── tumor_mask_cache/        # Aggregated tumor masks for filters
├── mri_mask_cache/          # Aggregated MRI masks for filters
├── dose_mask_cache/         # Aggregated dose masks for filters
└── viewer_cache/            # Pycortex viewer cache
```

### Data Flow Pipeline

1. **Data Generation**: Synthetic patient data and NIfTI files created via Python scripts
2. **Database Storage**: Patient metadata stored in PostgreSQL with UUID-based relationships
3. **File Management**: NIfTI files stored with UUID filenames matching database records
4. **Filter Processing**: Aggregated masks generated for different filter combinations
5. **Visualization**: Pycortex viewer renders NIfTI data for web interface
6. **API Access**: Flask backend provides RESTful access to data and visualizations

---

## Current Pipeline Usage

### 1. Patient Search & Individual Patient View
- **Purpose**: Browse and view individual patient data
- **Data Used**: `patients`, `nifti_data`, `tumor_mask`, `dose_mask`, `mri_mask`
- **Files Accessed**: Individual NIfTI files from `test_db_nifti/`
- **Current Issues**: Treatment data not properly linked to dose masks

### 2. Filter-Based Aggregation
- **Purpose**: Create population-level visualizations based on criteria
- **Data Used**: All tables with complex filtering logic
- **Files Generated**: Aggregated NIfTI files in cache directories
- **Current Issues**: No metadata preservation in aggregated files

### 3. 3D Visualization (Pycortex & Glass Brain)
- **Purpose**: Interactive 3D brain visualization
- **Data Used**: NIfTI files and metadata
- **Files Accessed**: Both individual and aggregated NIfTI files
- **Current Issues**: No standardized coordinate system metadata

### 4. Data Export & Analysis
- **Purpose**: Statistical analysis and data export
- **Data Used**: All database tables
- **Files Accessed**: NIfTI files for quantitative analysis
- **Current Issues**: No standardized format for external tools

---

## BIDS Compliance Analysis & Recommendations

### What is BIDS?

The Brain Imaging Data Structure (BIDS) is a standard for organizing neuroimaging data that promotes:
- **Interoperability** with major neuroimaging tools
- **Reproducibility** through standardized organization
- **Data sharing** and collaboration
- **Automatic validation** of data quality

### Current BIDS Compliance Status

| Aspect | Current Status | BIDS Requirement | Compliance Level |
|--------|---------------|------------------|------------------|
| File Naming | UUID-based (`9caf75fe-b66b-468f-ab93-f9488ad1c674.nii.gz`) | Structured naming (`sub-001_ses-01_task-tumor_mask.nii.gz`) | ❌ Non-compliant |
| Directory Structure | Flat structure | Hierarchical (`sub-*/ses-*/anat/`) | ❌ Non-compliant |
| Metadata | Database-only | JSON sidecars for each file | ❌ Non-compliant |
| Dataset Description | None | `dataset_description.json` | ❌ Non-compliant |
| Subject IDs | UUIDs | Sequential IDs (`sub-001`) | ⚠️ Needs conversion |
| Data Types | Generic `series_type` | Specific types (`anat`, `func`) | ⚠️ Needs classification |

---

## BIDS Compliance Implementation Plan

### Phase 1: Data Structure Migration (High Priority)

#### 1.1 Create BIDS Directory Structure

**Current Structure:**
```
filestore/test_db_nifti/
├── 9caf75fe-b66b-468f-ab93-f9488ad1c674.nii.gz
└── 4162eb48-3866-413f-b03f-2557869fcef3.nii.gz
```

**BIDS-Compliant Structure:**
```
bids_dataset/
├── dataset_description.json
├── participants.tsv
├── participants.json
├── sub-001/
│   ├── ses-01/
│   │   ├── anat/
│   │   │   ├── sub-001_ses-01_T1w.nii.gz
│   │   │   ├── sub-001_ses-01_T1w.json
│   │   │   ├── sub-001_ses-01_tumor-mask.nii.gz
│   │   │   └── sub-001_ses-01_tumor-mask.json
│   │   └── xnat/
│   │       ├── sub-001_ses-01_dose-mask.nii.gz
│   │       └── sub-001_ses-01_dose-mask.json
│   └── ses-02/
│       └── ...
└── derivatives/
    ├── tumor_analysis/
    └── dose_analysis/
```

#### 1.2 Required Metadata Files

**dataset_description.json:**
- Dataset name and version
- Author information and acknowledgments
- Funding sources and ethics approvals
- References and links

**participants.tsv:**
- Tab-separated values file with participant demographics
- Columns: participant_id, sex, age, origin_cancer, tumor_count, height_cm, weight_kg
- One row per participant

**participants.json:**
- JSON sidecar describing each column in participants.tsv
- Field descriptions, units, and value mappings
- Required for BIDS validation

#### 1.3 NIfTI File JSON Sidecars

**Tumor Mask Metadata:**
- Type and description of the mask
- Tumor location and volume information
- Segmentation method and software used
- Reference to anatomical image

**Dose Mask Metadata:**
- Radiation treatment type and parameters
- Maximum dose and dose units
- Treatment date and target volume
- Clinical treatment information

### Phase 2: Database Schema Updates (Medium Priority)

#### 2.1 Add BIDS-Specific Fields

- **BIDS Subject ID**: Sequential subject identifiers (sub-001, sub-002, etc.)
- **BIDS Session ID**: Session identifiers for longitudinal data
- **BIDS Filename**: Structured filenames following BIDS convention
- **BIDS Datatype**: Classification of data types (anat, func, xnat)
- **BIDS Metadata**: JSON storage for file-specific metadata

#### 2.2 Create BIDS Mapping Tables

- **BIDS Subjects Table**: Maps UUIDs to sequential subject IDs
- **BIDS Sessions Table**: Manages session information for longitudinal studies
- **BIDS Files Table**: Maps database records to BIDS file paths

### Phase 3: Application Updates (Medium Priority)

#### 3.1 Update File Path References

**Current Approach:**
- UUID-based file paths
- Direct database ID references
- Flat directory structure

**BIDS-Compliant Approach:**
- Structured file paths following BIDS convention
- Subject/session/datatype organization
- Hierarchical directory structure

#### 3.2 Update Cache Directories

**Current Cache Structure:**
- Separate cache directories for each data type
- UUID-based naming in cache files
- No metadata preservation

**BIDS-Compliant Cache Structure:**
- Derivatives directory for processed data
- Subject-specific organization
- Metadata preservation in JSON sidecars

### Phase 4: Validation & Quality Assurance (High Priority)

#### 4.1 BIDS Validation Integration

- **Automated Validation**: Integrate BIDS validator into data pipeline
- **Quality Checks**: Validate file naming, directory structure, and metadata
- **Error Reporting**: Clear error messages for non-compliant data
- **Continuous Validation**: Validate data during processing and storage

#### 4.2 Data Quality Checks

- **Dataset Description**: Verify required metadata files exist
- **Participants File**: Validate participant information format
- **File Naming**: Check BIDS naming convention compliance
- **Metadata Sidecars**: Verify JSON sidecars for all NIfTI files
- **Directory Structure**: Validate hierarchical organization

---

## Implementation Timeline

### Week 1-2: Data Migration
- [ ] Create BIDS conversion script
- [ ] Generate BIDS directory structure
- [ ] Create metadata files
- [ ] Test conversion with sample data

### Week 3-4: Database Updates
- [ ] Update database schema
- [ ] Create BIDS mapping tables
- [ ] Migrate existing data
- [ ] Update API endpoints

### Week 5-6: Application Updates
- [ ] Update file path references
- [ ] Modify cache directories
- [ ] Update visualization components
- [ ] Test end-to-end functionality

### Week 7-8: Validation & Documentation
- [ ] Integrate BIDS validator
- [ ] Create validation pipeline
- [ ] Update documentation
- [ ] Train team on new structure

---

## Benefits of BIDS Compliance

### Immediate Benefits
- ✅ **Tool Compatibility**: Works with FSL, SPM, AFNI, and other major neuroimaging software
- ✅ **Data Sharing**: Easy sharing with collaborators and repositories
- ✅ **Reproducibility**: Standardized format ensures reproducible research
- ✅ **Validation**: Automatic data quality checks

### Long-term Benefits
- 🔬 **Research Impact**: Increased citation potential and collaboration opportunities
- 📊 **Analysis Pipelines**: Access to BIDS-compatible analysis workflows
- 🏛️ **Data Archiving**: Compatible with neuroimaging repositories (OpenNeuro, etc.)
- 🎓 **Training**: Standard format for new team members

---

## Tools and Resources

### BIDS Tools
- [BIDS Validator](https://bids-standard.github.io/bids-validator/) - Official validation tool
- [BIDS Starter Kit](https://github.com/bids-standard/bids-starter-kit) - Templates and examples
- [dcm2bids](https://github.com/UNFmontreal/Dcm2Bids) - DICOM to BIDS conversion

### Documentation
- [BIDS Specification](https://bids-specification.readthedocs.io/) - Official specification
- [BIDS Examples](https://github.com/bids-standard/bids-examples) - Example datasets
- [BIDS Extension Proposals](https://bids.neuroimaging.io/get_involved.html) - Community extensions

### Community Resources
- [BIDS Forum](https://neurostars.org/tags/bids) - Community support
- [BIDS Workshop Materials](https://github.com/bids-standard/bids-starter-kit/wiki) - Training materials

---

## Conclusion

The current Brain Visualizer pipeline has a solid foundation with proper NIfTI file handling and database organization. The transition to BIDS compliance will require systematic changes to file naming, directory structure, and metadata organization, but will significantly enhance the system's interoperability and research impact.

The recommended phased approach ensures minimal disruption to current workflows while achieving full BIDS compliance. This transition will position the Brain Visualizer as a standard-compliant tool for brain tumor research and enable broader collaboration within the neuroimaging community.

**Next Steps:**
1. Begin Phase 1 data migration with a small subset of data
2. Set up BIDS validation in the development pipeline
3. Create automated conversion scripts for ongoing data processing
4. Plan training sessions for team members on BIDS standards 