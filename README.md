# Brain-Visualizer

A full‑stack application for visualizing synthetic brain tumor data. This project includes:

* **Database**: PostgreSQL (Docker Compose)
* **Backend**: Flask + SQLAlchemy + Alembic migrations
* **Frontend**: Next.js (React) UI
* **Data Generators**: Python scripts to populate sample tabular data (`sample_data`) and generate synthetic NIfTI files (`.nii.gz`) with tumor “hotspots”

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Getting Started](#getting-started)

   * [Clone the Repo](#clone-the-repo)
   * [Environment Variables](#environment-variables)
3. [Docker Compose Setup](#docker-compose-setup)

   * [1. Start the Database](#1-start-the-database)
   * [2. Run Migrations](#2-run-migrations)
   * [3. Populate Sample Data](#3-populate-sample-data)
   * [4. Generate Synthetic NIfTI Files](#4-generate-synthetic-nifti-files)
   * [5. Launch the Full Stack](#5-launch-the-full-stack)
4. [Project Structure](#project-structure)
5. [Scripts](#scripts)
6. [Troubleshooting](#troubleshooting)
7. [License](#license)

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

### Environment Variables

Copy and configure environment variables for both backend and frontend:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill in any overrides. Key variables include:

* `DATABASE_URL` (e.g. `postgresql://myuser:mypassword@db:5432/brain_dev`)
* `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:5001/api`)

*(The Docker Compose defaults match these values if you don’t override.)*

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

(This will apply your `migrations/versions/6644350424c3_initial_migration.py` and any others.)

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
