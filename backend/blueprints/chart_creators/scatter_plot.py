"""
Scatter plot creator module.
"""
from flask import jsonify
import plotly.graph_objects as go
from .utils import validate_series_data, create_base_layout

def create_scatter_plot(data):
    """Create a scatter plot from the provided data."""
    try:
        series_list = validate_series_data(data)
        
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
        
        layout = create_base_layout(data)

        fig = go.Figure(data=traces, layout=layout)
        return fig.to_dict()
    except Exception as e:
        return jsonify({ 'Error': str(e)}), 400 