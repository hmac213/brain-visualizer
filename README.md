# Brain-Visualizer

A full‑stack application for visualizing synthetic brain tumor data. This project includes:

* **Database**: PostgreSQL (Docker Compose)
* **Backend**: Flask + SQLAlchemy + Alembic migrations
* **Frontend**: Next.js (React) UI
* **Data Generators**: Python scripts to populate sample data (`sample_data`) and generate synthetic NIfTI files (`.nii.gz`) with tumor “hotspots”

---

## Table of Contents

1. [TODO][#todo]
2. [Prerequisites](#prerequisites)
3. [Getting Started](#getting-started)

   * [Clone the Repo](#clone-the-repo)
   * [Environment Variables](#environment-variables)
4. [Docker Compose Setup](#docker-compose-setup)

   * [1. Start the Database](#1-start-the-database)
   * [2. Run Migrations](#2-run-migrations)
   * [3. Populate Sample Data](#3-populate-sample-data)
   * [4. Generate Synthetic NIfTI Files](#4-generate-synthetic-nifti-files)
   * [5. Launch the Full Stack](#5-launch-the-full-stack)
5. [Scripts](#scripts)
6. [Troubleshooting](#troubleshooting)

---

## Todo
- [x] Migrate codebase to run on Docker for more robust development
  - [x] Change file structure
  - [x] Create Postgres image + table
  - [x] Migrate filestore to bind mounts
- [x] implement filtered pycortex render logic
  - [x] Update render logic to use filestore
  - [x] Create filter aggregation + database query scripts
- [ ] Implement data visualizations from clicked location
  - [ ] Pivot from nifti filestore to database storage
    - [ ] Find solution for storing voxel data in entries efficiently (allows for faster location pinpointing)
    - [ ] modify filter aggregation scripts to use this format
  - [ ] create additional table or modify current table to hold extra data for graph data visualizations
  - [ ] Add support for more visualization types

---

## Prerequisites

* **Docker** & **Docker Compose**
* **Python 3.8+** (for local scripts)
* A Unix‑style terminal (bash, zsh, etc.)

---

## Getting Started

### Clone the Repo

```bash
git clone <repository-url> brain-visualizer
cd brain-visualizer
```

### Install Requirements

If you plan on accessing the database or running the application from your local machine, ensure to install the necessary requirements:

```bash
cd backend
pip install -r requirements.txt
```
and
```bash
cd frontend
npm install
```
We also recommend you configure a virtual environment of your choice in the backend folder. This project was developed using venv:
```bash
cd backend
python3 -m venv <venv_name>
```
for creation and
```bash
cd backend
source <venv_name>/bin/activate
```
for activation (on Mac).

### Environment Variables

Create `.env` files in both the frontend and backend folders, including the following:

Backend:
* `DATABASE_URL` (e.g. `postgresql://myuser:mypassword@db:5432/brain_dev`)
> **Note**: replace 'db' with 'localhost' if you plan on accessing the database from your own terminal. The URL for the docker environment is configured in `docker-compse.yml`

Frontend:
* `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:5001`)

---

## Docker Compose Setup

The project uses Docker Compose to orchestrate:

* **db**: PostgreSQL database
* **backend**: Flask API
* **frontend**: Next.js application

> **Note**: Ensure you’re in the project root where `docker-compose.yml` lives.

### 1. Start the Database

```bash
docker-compose up -d db
```

This spins up the `db` service with default credentials:

```yaml
POSTGRES_USER:     myuser
POSTGRES_PASSWORD: mypassword
POSTGRES_DB:       brain_dev
```

### 2. Run Migrations

Apply Alembic migrations to create the schema in `brain_dev`:

```bash
docker-compose exec db bash -c "alembic upgrade head"
```

(This will populate the database with the necessary table and rows.)

### 3. Populate Sample Data

Generate and insert data into the `sample_data` table:

```bash
cd backend
python3 -m file_loading.generate_sample_data
```

### 4. Generate Synthetic NIfTI Files

Create a local filestore of `.nii.gz` volumes in `filestore/test_db_nifti/`:

```bash
cd backend
python3 -m file_loading.generate_sample_nifti
```

Each file will be named `<uuid>.nii.gz` matching entries in `sample_data`.

### 5. Launch the Full Stack

Once the database is prepared and data is in place, bring up all services:

```bash
docker-compose up --build -d
```

* **Backend API**: [http://localhost:5001](http://localhost:5001)
* **Frontend UI**: [http://localhost:3000](http://localhost:3000)

---

## Scripts

| Script                              | Description                                                  |
| ----------------------------------- | ------------------------------------------------------------ |
| `generate_sample_data.py`           | Inserts random records into the `sample_data` table.         |
| `generate_sample_nifti.py`          | Builds synthetic `.nii.gz` volumes for each `sample_data.id` |
| `alembic upgrade head` (via Docker) | Applies DB migrations                                        |

---

## Troubleshooting

* **`DATABASE_URL` missing**: Ensure `.env` files are populated or export the var manually.
* **Migrations fail**: Verify `migrations/` folder and `alembic.ini` are present, then rerun.
* **Scripts can’t connect**: Confirm `db` service is running and credentials match.
* **Permission errors** writing to `filestore/`: `mkdir -p filestore/test_db_nifti && chmod u+w ...`
