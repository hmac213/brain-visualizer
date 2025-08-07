from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import json
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from redis_cache import RedisCache
import logging

redis_cache = RedisCache()

app = Flask(__name__)
app.logger.setLevel(logging.INFO)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ['DATABASE_URL']

# Configure filestore path from environment variable
app.config['FILESTORE_PATH'] = os.environ.get('FILESTORE_PATH', '/app/filestore')

db = SQLAlchemy(app)
migrate = Migrate(app, db)

import models

@app.route('/', methods=['GET'])
def home():
    return { "message" : "Flask backend is running!" }

app.config['CURRENT_FILTER'] = {
    'default_id': {
        'name': 'Default',
        'criteria': {}
    }
}
app.config['CURRENT_MASK_TYPE'] = 'tumor'  # Default mask type

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