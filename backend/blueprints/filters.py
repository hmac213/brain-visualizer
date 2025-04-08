from flask import Blueprint, jsonify, request

filters = Blueprint('filters', __name__, url_prefix='/api')

# initialize with a default filter
active_filters = {
    'default_id': {
        'name': 'Default',
        'options': []
    }
}

# get all active filters
@filters.route('/filters', methods=['GET'])
def get_filters():
    return jsonify(active_filters)

# create new filter
@filters.route('/filters', methods=['POST'])
def create_filter():
    id = request.json.get('id')
    name = request.json.get('name')
    options = request.json.get('activeFilters')
    
    if not id or not name:
        return jsonify({ 'error': 'error: invalid filter' }), 400

    active_filters[id] = { 'name': name, 'options': options }
    return jsonify({ 'message': 'success: filter added' }), 201

# modify filter
@filters.route('/filters/<id>', methods=['PUT'])
def modify_filter(id):
    name = request.json.get('name')
    options = request.json.get('activeFilters')
    if id in active_filters:
        active_filters[id] = { 'name': name, 'options': options }
        return jsonify({ 'message': 'success: filter modified' }), 200
    else:
        return jsonify({ 'error': 'error: filter not found'}), 404

# delete filter
@filters.route('/filters/<id>', methods=['DELETE'])
def delete_filter(id):
    if id in active_filters:
        del active_filters[id]
        return jsonify({ 'message': 'success: filter deleted' }), 200

    return jsonify({ 'error': 'error: filter not found' }), 404