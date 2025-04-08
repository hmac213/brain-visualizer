from flask import Blueprint, jsonify, request
import plotly.graph_objects as go

chart = Blueprint('chart', __name__, url_prefix='/api')

active_charts = {
    "1": {
        'type': "line_chart",
        'title': "Patient Data Over Time",
        'data': {
            'xaxis_title': "Time",
            'yaxis_title': "Value",
            'series': [
                {
                    'name': "Series 1",
                    'mode': "lines",
                    'trace': { 'x': [1, 2, 3], 'y': [10, 15, 20] },
                    'traceType': "line_chart_trace"
                }
            ]
        }
    },
    "2": {
        'type': "bar_chart",
        'title': "Patient Data Over Time",
        'data': {
            'xaxis_title': "Time",
            'yaxis_title': "Value",
            'series': [
                {
                    'name': "Series 1",
                    'mode': "stack",
                    'trace': { 'x': ['San Jose', 'San Francisco', 'Los Angeles'], 'y': [10, 15, 20] },
                    'traceType': "bar_chart_trace"
                }
            ]
        }
    },
    "3": {
        'type': "scatter_plot",
        'title': "Patient Measurements",
        'data': {
            'xaxis_title': "Height (cm)",
            'yaxis_title': "Weight (kg)",
            'series': [
                {
                    'name': "Patients",
                    'mode': "markers",
                    'trace': { 'x': [165, 170, 175, 180, 185], 'y': [65, 70, 75, 80, 85] },
                    'traceType': "scatter_plot_trace"
                }
            ]
        }
    },
    "4": {
        'type': "histogram",
        'title': "Age Distribution",
        'data': {
            'xaxis_title': "Age",
            'yaxis_title': "Count",
            'series': [
                {
                    'name': "Patient Ages",
                    'trace': { 'x': [22, 25, 28, 30, 31, 32, 35, 38, 42, 45, 48, 50, 52, 55, 58, 60, 65, 70] },
                    'traceType': "histogram_trace"
                }
            ]
        }
    },
    "5": {
        'type': "box_plot",
        'title': "Blood Pressure Readings",
        'data': {
            'xaxis_title': "Patient Group",
            'yaxis_title': "Blood Pressure",
            'series': [
                {
                    'name': "Control Group",
                    'trace': { 'y': [120, 118, 122, 125, 130, 128, 135, 132, 137, 140] },
                    'traceType': "box_plot_trace"
                },
                {
                    'name': "Test Group",
                    'trace': { 'y': [115, 112, 118, 120, 125, 124, 130, 128, 132, 135] },
                    'traceType': "box_plot_trace"
                }
            ]
        }
    },
    "6": {
        'type': "bubble_chart",
        'title': "Patient Demographics",
        'data': {
            'xaxis_title': "Age",
            'yaxis_title': "BMI",
            'series': [
                {
                    'name': "Female Patients",
                    'trace': { 
                        'x': [25, 30, 35, 40, 45, 50], 
                        'y': [21, 22, 23, 25, 26, 27],
                        'size': [20, 40, 30, 50, 35, 25],
                        'text': ["Patient A", "Patient B", "Patient C", "Patient D", "Patient E", "Patient F"]
                    },
                    'traceType': "bubble_chart_trace"
                }
            ]
        }
    }
}

# Store brain location clicks
brain_clicks = []

# functions for creating different types of charts
'''
Request data format:
{
  "id": UUID,
  "type": string,
  "title": string | none,
  "data": {
    "xaxis_title": string | none,
    "yaxis_title": string | none,
    "series": [
      {
        "name": string | none,
        "mode": string,
        "trace": type-dependent data
      },
      ...
    ]
  }
}
'''
def create_line_chart(data):
    try:
        series_list = data.get('series')
        if not series_list or not isinstance(series_list, list):
            raise ValueError('Invalid data.')
        
        traces = []

        for series in series_list:
            trace_data = series.get('trace')
            if not trace_data or not isinstance(trace_data, dict):
                raise ValueError('Invalid series entry.')
            
            traces.append(
                go.Scatter(
                    name = series.get('name', None),
                    mode = 'lines', # update with customizable modes later
                    line_color = '#2774AE',
                    **trace_data
                )
            )
        
        layout = go.Layout(
            title = data.get('title', None),
            xaxis = dict(
                title = data.get('xaxis_title', None),
                linecolor = 'red'
            ),
            yaxis = dict(
                title = data.get('yaxis_title', None),
                linecolor = 'red'
            ),
            paper_bgcolor='white',
            plot_bgcolor='white'
        )

        fig = go.Figure(data=traces, layout=layout)
        return fig.to_dict()
    except Exception as e:
        return jsonify({ 'Error': str(e)}), 400

def create_bar_chart(data):
    try:
        series_list = data.get('series')
        if not series_list or not isinstance(series_list, list):
            raise ValueError('Invalid data.')
        
        traces = []

        for series in series_list:
            trace_data = series.get('trace')
            if not trace_data or not isinstance(trace_data, dict):
                raise ValueError('Invalid series entry.')
            
            traces.append(
                go.Bar(
                    name = series.get('name', None),
                    marker_color = '#2774AE',
                    **trace_data
                )
            )
        
        layout = go.Layout(
            barmode='stack', # update with customizable modes later
            title = data.get('title', None),
            xaxis = dict(
                title = data.get('xaxis_title', None),
                linecolor = 'red'
            ),
            yaxis = dict(
                title = data.get('yaxis_title', None),
                linecolor = 'red'
            ),
            paper_bgcolor='white',
            plot_bgcolor='white'
        )

        fig = go.Figure(data=traces, layout=layout)
        return fig.to_dict()
    except Exception as e:
        return jsonify({ 'Error': str(e)}), 400

def create_histogram(data):
    try:
        series_list = data.get('series')
        if not series_list or not isinstance(series_list, list):
            raise ValueError('Invalid data.')
        
        traces = []

        for series in series_list:
            trace_data = series.get('trace')
            if not trace_data or not isinstance(trace_data, dict):
                raise ValueError('Invalid series entry.')
            
            traces.append(
                go.Histogram(
                    name = series.get('name', None),
                    marker_color = '#2774AE',
                    opacity = 0.75,
                    **trace_data
                )
            )
        
        layout = go.Layout(
            title = data.get('title', None),
            xaxis = dict(
                title = data.get('xaxis_title', None),
                linecolor = 'red'
            ),
            yaxis = dict(
                title = data.get('yaxis_title', None),
                linecolor = 'red'
            ),
            barmode = 'overlay',  # Default to overlay for multiple histograms
            paper_bgcolor = 'white',
            plot_bgcolor = 'white'
        )

        fig = go.Figure(data=traces, layout=layout)
        return fig.to_dict()
    except Exception as e:
        return jsonify({ 'Error': str(e)}), 400

def create_box_plot(data):
    try:
        series_list = data.get('series')
        if not series_list or not isinstance(series_list, list):
            raise ValueError('Invalid data.')
        
        traces = []

        for series in series_list:
            trace_data = series.get('trace')
            if not trace_data or not isinstance(trace_data, dict):
                raise ValueError('Invalid series entry.')
            
            traces.append(
                go.Box(
                    name = series.get('name', None),
                    marker_color = '#2774AE',
                    boxmean = True,  # Show mean as a dashed line
                    **trace_data
                )
            )
        
        layout = go.Layout(
            title = data.get('title', None),
            xaxis = dict(
                title = data.get('xaxis_title', None),
                linecolor = 'red'
            ),
            yaxis = dict(
                title = data.get('yaxis_title', None),
                linecolor = 'red'
            ),
            paper_bgcolor = 'white',
            plot_bgcolor = 'white'
        )

        fig = go.Figure(data=traces, layout=layout)
        return fig.to_dict()
    except Exception as e:
        return jsonify({ 'Error': str(e)}), 400

def create_scatter_plot(data):
    try:
        series_list = data.get('series')
        if not series_list or not isinstance(series_list, list):
            raise ValueError('Invalid data.')
        
        traces = []

        for series in series_list:
            trace_data = series.get('trace')
            if not trace_data or not isinstance(trace_data, dict):
                raise ValueError('Invalid series entry.')
            
            traces.append(
                go.Scatter(
                    name = series.get('name', None),
                    mode = 'markers', # Default to markers for scatter plot
                    marker = dict(
                        color = '#2774AE',
                        size = 10
                    ),
                    **trace_data
                )
            )
        
        layout = go.Layout(
            title = data.get('title', None),
            xaxis = dict(
                title = data.get('xaxis_title', None),
                linecolor = 'red'
            ),
            yaxis = dict(
                title = data.get('yaxis_title', None),
                linecolor = 'red'
            ),
            paper_bgcolor='white',
            plot_bgcolor='white'
        )

        fig = go.Figure(data=traces, layout=layout)
        return fig.to_dict()
    except Exception as e:
        return jsonify({ 'Error': str(e)}), 400

def create_bubble_chart(data):
    try:
        series_list = data.get('series')
        if not series_list or not isinstance(series_list, list):
            raise ValueError('Invalid data.')
        
        traces = []

        for series in series_list:
            trace_data = series.get('trace')
            if not trace_data or not isinstance(trace_data, dict):
                raise ValueError('Invalid series entry.')
            
            # For bubble charts, we expect a 'size' array in trace_data
            marker_settings = {
                'color': '#2774AE',
                'opacity': 0.7,
                'line': {
                    'width': 1,
                    'color': 'darkblue'
                }
            }
            
            # If size data is provided, use it
            if 'size' in trace_data:
                size_data = trace_data.pop('size')  # Remove from trace_data to avoid duplicate
                marker_settings['size'] = size_data
                
                # Add sizemode and sizeref if not already provided
                if 'sizemode' not in marker_settings:
                    marker_settings['sizemode'] = 'area'
                if 'sizeref' not in marker_settings and isinstance(size_data, list) and size_data:
                    # Calculate a reasonable sizeref based on max size value
                    # This helps normalize bubble sizes
                    marker_settings['sizeref'] = 2.0 * max(size_data) / (40**2)
            
            traces.append(
                go.Scatter(
                    name = series.get('name', None),
                    mode = 'markers',
                    marker = marker_settings,
                    **trace_data
                )
            )
        
        layout = go.Layout(
            title = data.get('title', None),
            xaxis = dict(
                title = data.get('xaxis_title', None),
                linecolor = 'red'
            ),
            yaxis = dict(
                title = data.get('yaxis_title', None),
                linecolor = 'red'
            ),
            paper_bgcolor = 'white',
            plot_bgcolor = 'white'
        )

        fig = go.Figure(data=traces, layout=layout)
        return fig.to_dict()
    except Exception as e:
        return jsonify({ 'Error': str(e)}), 400


chart_creation_map = {
    'line_chart': create_line_chart,
    'bar_chart': create_bar_chart,
    'histogram': create_histogram,
    'box_plot': create_box_plot,
    'scatter_plot': create_scatter_plot,
    'bubble_chart': create_bubble_chart
}

# access all active charts
@chart.route('/charts', methods=['GET'])
def get_charts():
    processed_charts = {}
    for chart_id, chart_info in active_charts.items():
        chart_type = chart_info.get('type')
        data_payload = chart_info.get('data')
        title = chart_info.get('title')

        if chart_type and data_payload and chart_type in chart_creation_map:
            try:
                # Add title to payload as create_line_chart expects it inside data
                payload_with_title = {**data_payload, 'title': title} 
                plotly_config = chart_creation_map[chart_type](payload_with_title)
                
                # Check if the creation function returned an error tuple (jsonify(), status_code)
                if isinstance(plotly_config, tuple) and len(plotly_config) == 2 and isinstance(plotly_config[1], int):
                     print(f"Error generating config for chart {chart_id}: {plotly_config[0].get_json()}")
                     continue # Skip adding this chart to the response
                
                processed_charts[chart_id] = plotly_config
            except Exception as e:
                print(f"Exception generating config for chart {chart_id}: {str(e)}")
                # Optionally add error info to response, or just skip
        else:
            print(f"Skipping chart {chart_id} due to missing/invalid type or data.")
            
    return jsonify(processed_charts)

# create chart api endpoint
@chart.route('/charts', methods=['POST'])
def create_chart():
    type = request.json.get('type')
    id = request.json.get('id')
    data = request.json.get('data')
    return_chart = chart_creation_map[type](data)
    active_charts[id] = return_chart
    return jsonify(return_chart)

# modify chart
@chart.route('/charts/<id>', methods=['PUT'])
def modify_chart(id):
    type = request.json.get('type')
    data = request.json.get('data')
    title = request.json.get('title') # Also get title for modification

    if id not in active_charts:
        return jsonify({ 'error': 'invalid chart id' }), 404 # Use 404 for not found
    
    if not type or type not in chart_creation_map:
        return jsonify({ 'error': 'invalid chart type' }), 400

    if not data:
         return jsonify({ 'error': 'missing chart data' }), 400

    try:
        # Prepare payload, similar to GET
        payload_with_title = {**data, 'title': title}
        modified_chart_config = chart_creation_map[type](payload_with_title)

        # Check for error response from creation function
        if isinstance(modified_chart_config, tuple) and len(modified_chart_config) == 2 and isinstance(modified_chart_config[1], int):
            return modified_chart_config # Return the error response directly

        # Update active_charts with the new config AND the original type/title/data structure
        # Storing raw data allows re-generation if needed, but GET now returns config.
        # Let's store both the config and the input structure for consistency.
        active_charts[id] = {
            'type': type,
            'title': title,
            'data': data,
            # Maybe store the generated config too? Or rely on GET to generate?
            # Let's stick to storing the input definition for now.
            # Revert the previous change: We need the raw data definition to call create_* function
        }
        # We need to update active_charts with the NEW definition, not the config
        active_charts[id] = {'type': type, 'title': title, 'data': data}

        # Re-generate the config using the new data for the response
        # (Or we could store the config in active_charts if preferred)
        final_config = chart_creation_map[type](payload_with_title)
        # We already checked for errors above, assume final_config is good here

        return jsonify(final_config) # Return the newly generated config
    except Exception as e:
        print(f"Error modifying chart {id}: {str(e)}")
        return jsonify({'error': 'Failed to modify chart'}), 500

# delete chart
@chart.route('/charts/<id>', methods=['DELETE']) # Ensure plural 'charts' for consistency
def delete_chart(id):
    if id in active_charts:
        del active_charts[id]
        return jsonify({ 'message': 'chart successfully deleted' }), 200
    
    return jsonify({ 'error': 'no such chart exists' }), 404 # Use 404

# Brain location click endpoint
@chart.route('/brain-clicks', methods=['POST'])
def store_brain_click():
    """Store a brain location click from pycortex viewer.
    
    Expected JSON format:
    {
        "hemi": "left|right",
        "vertex": 12345,  # Vertex index
        "coords": [x, y, z],  # 3D coordinates
        "timestamp": 1234567890  # Optional
    }
    """
    try:
        click_data = request.json
        if not click_data or not isinstance(click_data, dict):
            return jsonify({"error": "Invalid data format"}), 400
            
        # Validate required fields
        required_fields = ["hemi", "vertex", "coords"]
        for field in required_fields:
            if field not in click_data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
                
        # Add timestamp if not provided
        if "timestamp" not in click_data:
            from datetime import datetime
            click_data["timestamp"] = datetime.now().timestamp()
            
        # Store the click data
        brain_clicks.append(click_data)
        
        return jsonify({
            "status": "success", 
            "message": "Brain click stored",
            "total_clicks": len(brain_clicks)
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get all brain clicks
@chart.route('/brain-clicks', methods=['GET'])
def get_brain_clicks():
    """Retrieve all stored brain location clicks."""
    return jsonify(brain_clicks)