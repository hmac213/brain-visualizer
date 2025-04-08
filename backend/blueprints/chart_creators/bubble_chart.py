"""
Bubble chart creator module.
"""
from flask import jsonify
import plotly.graph_objects as go
from .utils import validate_series_data, create_base_layout

def create_bubble_chart(data):
    """Create a bubble chart from the provided data."""
    try:
        series_list = validate_series_data(data)
        
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
        
        layout = create_base_layout(data)

        fig = go.Figure(data=traces, layout=layout)
        return fig.to_dict()
    except Exception as e:
        return jsonify({ 'Error': str(e)}), 400 