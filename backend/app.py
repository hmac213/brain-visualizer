from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import json
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ['DATABASE_URL']

db = SQLAlchemy(app)
migrate = Migrate(app, db)

import models

@app.route('/', methods=['GET'])
def home():
    return { "message" : "Flask backend is running!" }

app.config['CURRENT_FILTER'] = {
    'default_id': {
        'name': 'Default',
        'options': []
    }
}

from blueprints.viewer import viewer
from blueprints.filters import filters
from blueprints.chart import chart
from blueprints.glass_brain import glass_brain_bp

app.register_blueprint(viewer)
app.register_blueprint(filters)
app.register_blueprint(chart)
app.register_blueprint(glass_brain_bp)

if __name__ == '__main__':
    app.run(debug=True, port=5001)