from flask import Flask
from flask_cors import CORS
from backend.blueprints.viewer import viewer
from backend.blueprints.filters import filters

app = Flask(__name__)
CORS(app)

@app.route('/', methods=['GET'])
def home():
    return { "message" : "Flask backend is running!" }

app.register_blueprint(viewer)
app.register_blueprint(filters)

if __name__ == '__main__':
    app.run(debug=True, port=5001)