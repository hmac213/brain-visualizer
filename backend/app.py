from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import json

app = Flask(__name__)
CORS(app)

@app.route('/', methods=['GET'])
def home():
    return { "message" : "Flask backend is running!" }

app.config['CURRENT_FILTER'] = {
    'default_id': {
        'name': 'Default',
        'options': []
    }
}

from backend.blueprints.viewer import viewer
from backend.blueprints.filters import filters
from backend.blueprints.chart import chart
from backend.blueprints.glass_brain import glass_brain_bp

app.register_blueprint(viewer)
app.register_blueprint(filters)
app.register_blueprint(chart)
app.register_blueprint(glass_brain_bp)

if __name__ == '__main__':
    app.run(debug=True, port=5001)