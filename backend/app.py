from flask import Flask
from flask_cors import CORS
from backend.blueprints.viewer import viewer
from backend.blueprints.filters import filters
from backend.blueprints.chart import chart

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE"], "allow_headers": ["Content-Type", "Authorization", "Accept"]}})

@app.route('/', methods=['GET'])
def home():
    return { "message" : "Flask backend is running!" }

app.register_blueprint(viewer)
app.register_blueprint(filters)
app.register_blueprint(chart)

if __name__ == '__main__':
    app.run(debug=True, port=5001)