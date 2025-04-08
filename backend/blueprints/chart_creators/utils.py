"""
Utilities for chart creators.
"""
from flask import jsonify
import plotly.graph_objects as go

def validate_series_data(data):
    """Validate series data common to all chart types."""
    series_list = data.get('series')
    if not series_list or not isinstance(series_list, list):
        raise ValueError('Invalid data.')
    return series_list

def create_base_layout(data):
    """Create a base layout common to all chart types."""
    return go.Layout(
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