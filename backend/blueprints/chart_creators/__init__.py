"""
Chart creator module for different chart types.
This module contains functions to create various chart types using Plotly.
"""

from .line_chart import create_line_chart
from .bar_chart import create_bar_chart
from .histogram import create_histogram
from .box_plot import create_box_plot
from .scatter_plot import create_scatter_plot
from .bubble_chart import create_bubble_chart

# Map of chart types to their creation functions
chart_creation_map = {
    'line_chart': create_line_chart,
    'bar_chart': create_bar_chart,
    'histogram': create_histogram,
    'box_plot': create_box_plot,
    'scatter_plot': create_scatter_plot,
    'bubble_chart': create_bubble_chart
} 