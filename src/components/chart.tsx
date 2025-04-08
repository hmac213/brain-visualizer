import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

/*
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
*/

// generic interface for chart-dependent traces
interface TemplateChartTrace<T> {
  traceType: string;
  name?: string;
  mode: string;
  trace: T;
}

// types with accepted trace data for each chart type
type LineChartData = { x: number[], y: number[] }
type BarChartData = { x: string[], y: number[] }

// distinguished types for chart-dependent traces
type LineChartTrace = TemplateChartTrace<LineChartData> & { traceType: 'line_chart_trace' }
type BarChartTrace = TemplateChartTrace<BarChartData> & { traceType: 'bar_chart_trace' }

// unified type for trace
type TraceType = LineChartTrace | BarChartTrace;

// interface for chart data used for creation/modification requests
interface ChartDefinitionData {
  xaxis_title?: string;
  yaxis_title?: string;
  series: TraceType[];
}

// interface for chart definition (used by DataView state initially)
export interface ChartDefinition {
  id: string;
  type: string;
  title?: string;
  data: ChartDefinitionData;
}

// interface for Plotly chart configuration (received from GET /charts)
interface PlotlyConfig {
  data: any; // Plotly.js data array
  layout: any; // Plotly.js layout object
}

// Props for the Chart component - now expects the final Plotly config
interface ChartProps {
  plotlyConfig: PlotlyConfig;
}

export default function Chart(props: ChartProps) {
  // Remove internal state and useEffect
  // const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);
  // useEffect(() => { ... fetch logic removed ... }, [props]);
  // if (!chartConfig) return (<div>Loading...</div>);

  // Directly use the passed plotlyConfig
  if (!props.plotlyConfig) {
      console.warn("Chart component rendered without plotlyConfig");
      return <div>Error loading chart configuration.</div>;
  }

  return (
    <div className='w-full border border-gray-300 rounded-lg bg-gray-100 overflow-hidden'>
      <Plot 
        data={props.plotlyConfig.data}
        layout={{ ...props.plotlyConfig.layout, autosize: true }}
        useResizeHandler={true}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}