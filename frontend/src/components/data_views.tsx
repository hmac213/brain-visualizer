import React, { useState, useEffect } from 'react';
import Chart from './chart';
import { LayoutGrid, StretchHorizontal } from 'lucide-react'
import NewChartModal from './NewChartModal';

// Remove the baseURL since we're using the proxy
// const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface PlotlyConfig {
  data: any;
  layout: any;
}

interface DataProps {
    dataShowing: boolean;
    toggleData: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function DataView(props: DataProps) {
  const [activeChartConfigs, setActiveChartConfigs] = useState<Record<string, PlotlyConfig>>({});
  const [isGridLayout, setIsGridLayout] = useState(false);
  const [newChartModal, setNewChartModal] = useState(false);

  useEffect(() => {
    fetch('/api/charts', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`HTTP error! status: ${response.status}, message: ${text}`);
            });
        }
        return response.json();
    })
    .then((data: Record<string, PlotlyConfig>) => {
      setActiveChartConfigs(data);
    })
    .catch(err => {
      console.error('Error fetching chart configurations:', err);
      setActiveChartConfigs({});
    });
  }, []);
  
  // Handle newly created chart
  const handleChartCreated = (chartId: string, config: PlotlyConfig) => {
    setActiveChartConfigs(prev => ({
      ...prev,
      [chartId]: config
    }));
  };

  return props.dataShowing ? (
      <div
        className='absolute inset-0 flex flex-col overflow-auto'
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => { if(e.target === e.currentTarget) props.toggleData(false); }}
      >
        <div
          className={`bg-white py-12 flex flex-col min-h-full w-full overflow-auto ${
            isGridLayout ? 'px-24' : 'px-72'
          }`}
        >
          <div className='flex justify-between items-center mb-6 border-b pb-4'>
            <div className='flex space-x-3 items-center'>
              <h1 className='text-2xl font-semibold'>Data Visualizations</h1>
              <div className='border-l border-gray-300 h-4' />
              <button 
                className={`px-4 py-2 transition-colors text-sm font-medium rounded-md ${
                  isGridLayout ? 'bg-[#2774AE] text-white' : 'hover:bg-[#2774AE] hover:text-white'
                }`}
                onClick={() => setIsGridLayout(true)}
              >
                <LayoutGrid className='w-4 h-4' />
              </button>
              <button 
                className={`px-4 py-2 transition-colors text-sm font-medium rounded-md ${
                  !isGridLayout ? 'bg-[#2774AE] text-white' : 'hover:bg-[#2774AE] hover:text-white'
                }`}
                onClick={() => setIsGridLayout(false)}
              >
                <StretchHorizontal className='w-4 h-4' />
              </button>
            </div>
            <div className='flex space-x-2'>
              <button
                onClick={() => setNewChartModal(true)}
                className='px-4 py-2 bg-[#2774AE] text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium'
              >
                New Chart
              </button>
              <button
                onClick={() => props.toggleData(false)}
                className='px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium'
              >
                Close
              </button>
            </div>
          </div>
          <div className='flex-1'>
            {Object.keys(activeChartConfigs).length > 0 ? (
              <div className={`w-full h-full overflow-auto ${
                isGridLayout 
                  ? 'grid grid-cols-2 gap-6' 
                  : 'flex flex-col space-y-6'
              }`}>
                {Object.entries(activeChartConfigs).map(([chartId, config]) => {
                  if (config && config.data && config.layout) {
                    return (
                      <Chart plotlyConfig={config} key={chartId}/>
                    );
                  } else {
                    console.warn(`Invalid or missing config for chart ID: ${chartId}`);
                    return <div key={chartId}>Error loading chart: {chartId}</div>;
                  }
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-10">No chart data available or failed to load charts.</div>
            )}
          </div>
        </div>
        
        {/* New Chart Modal */}
        <NewChartModal
          isOpen={newChartModal}
          onClose={() => setNewChartModal(false)}
          onChartCreated={handleChartCreated}
        />
      </div>
  ) : null;
}