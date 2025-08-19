from flask import Flask, jsonify, request, session
from flask_cors import CORS
import os
import json
import uuid
import threading
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from redis_cache import RedisCache
import logging

redis_cache = RedisCache()

app = Flask(__name__)
app.logger.setLevel(logging.INFO)
CORS(app, supports_credentials=True)  # Enable credentials for session cookies

# Configure session secret key
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

# Configure database URL with fallback
database_url = os.environ.get('DATABASE_URL', 'postgresql://myuser:mypassword@db:5432/brain_dev')
app.config['SQLALCHEMY_DATABASE_URI'] = database_url

# Configure filestore path from environment variable
app.config['FILESTORE_PATH'] = os.environ.get('FILESTORE_PATH', '/app/filestore')

# Log configuration (without sensitive data)
app.logger.info(f"Database URL: {database_url.split('@')[1] if '@' in database_url else 'Invalid format'}")
app.logger.info(f"Filestore path: {app.config['FILESTORE_PATH']}")

db = SQLAlchemy(app)
migrate = Migrate(app, db)

import models

# Thread-safe startup management
# Using a lock to prevent race conditions when multiple requests
# simultaneously try to execute startup tasks
_startup_lock = threading.Lock()
_startup_completed = False

@app.before_request
def before_request():
    """Ensure each user has a unique ID for session management and handle startup tasks."""
    global _startup_completed
    
    # Handle startup tasks only once using thread-safe double-check pattern
    if not _startup_completed:
        with _startup_lock:
            # Double-check pattern to prevent race conditions
            if not _startup_completed:
                try:
                    # Ensure pycortex config directory exists
                    import os
                    pycortex_dir = os.path.expanduser('~/.config/pycortex')
                    if not os.path.exists(pycortex_dir):
                        os.makedirs(pycortex_dir, exist_ok=True)
                        app.logger.info(f"Created pycortex config directory: {pycortex_dir}")
                    else:
                        app.logger.debug(f"Pycortex config directory already exists: {pycortex_dir}")
                except Exception as e:
                    app.logger.warning(f"Could not create pycortex directory: {e}")
                    # This is not critical for basic functionality
                
                _startup_completed = True
                app.logger.info("Startup tasks completed successfully")
    
    # Ensure each user has a unique ID for session management
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
        app.logger.info(f"Generated new user ID: {session['user_id']}")

@app.route('/', methods=['GET'])
def home():
    return { "message" : "Flask backend is running!" }

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring."""
    try:
        # Test database connection
        db.session.execute('SELECT 1')
        db_status = 'healthy'
    except Exception as e:
        db_status = f'unhealthy: {str(e)}'
    
    try:
        # Test Redis connection
        from app import redis_cache
        redis_cache.r.ping()
        redis_status = 'healthy'
    except Exception as e:
        redis_status = f'unhealthy: {str(e)}'
    
    return {
        'status': 'healthy',
        'database': db_status,
        'redis': redis_status,
        'filestore_path': app.config['FILESTORE_PATH']
    }

# Remove global state - will be managed locally per request
# app.config['CURRENT_FILTER'] = {
#     'default_id': {
#         'name': 'Default',
#         'criteria': {}
#     }
# }
# app.config['CURRENT_MASK_TYPE'] = 'tumor'  # Default mask type

from blueprints.viewer import viewer
from blueprints.filters import filters
from blueprints.chart import chart
from blueprints.glass_brain import glass_brain_bp
from blueprints.patient_queries import patient_queries

app.register_blueprint(viewer)
app.register_blueprint(filters)
app.register_blueprint(chart)
app.register_blueprint(glass_brain_bp)
app.register_blueprint(patient_queries)

if __name__ == '__main__':
    app.run(debug=True, port=5001)