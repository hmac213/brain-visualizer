"""
Histogram creator module.
"""
from flask import jsonify
import plotly.graph_objects as go
from .utils import validate_series_data, create_base_layout

def create_histogram(data):
    """Create a histogram from the provided data."""
    try:
        series_list = validate_series_data(data)
        
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
        
        layout = create_base_layout(data)
        # Add histogram-specific settings
        layout.update(barmode='overlay')  # Default to overlay for multiple histograms

        fig = go.Figure(data=traces, layout=layout)
        return fig.to_dict()
    except Exception as e:
        return jsonify({ 'Error': str(e)}), 400 