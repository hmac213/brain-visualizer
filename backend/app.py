from flask import Flask
from backend.blueprints.viewer import viewer

app = Flask(__name__)

@app.route('/', methods=['GET'])
def home():
    return { "message" : "Flask backend is running!" }

app.register_blueprint(viewer)

if __name__ == '__main__':
    app.run(debug=True, port=5001)