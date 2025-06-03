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
        className={`fixed top-0 left-0 h-full bg-white shadow-lg transition-all duration-300 ease-in-out w-1/4`}
        style={{ zIndex: 50, pointerEvents: 'auto' }}
      >
        <div className='bg-white h-full w-full overflow-hidden'>
          {/* Header */}
          <div className='flex justify-between items-center p-4 border-b'>
            <h1 className='text-xl font-semibold'>Data Visualizations</h1>
            <div className='flex items-center space-x-2'>
              <button
                onClick={() => props.toggleData(false)}
                className='p-2 hover:bg-gray-100 rounded-md transition-colors'
                title='Close'
              >
                <span className='sr-only'>Close</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* Content area below header, same as Filter panel */}
          <div className='p-4 overflow-y-auto h-[calc(100%-4rem)]'>
            {/* Toolbar for grid/list toggle and New Chart button */}
            <div className='flex items-center space-x-3 mb-4'>
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
              <button
                onClick={() => setNewChartModal(true)}
                className='ml-auto px-4 py-2 bg-[#2774AE] text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium'
              >
                New Chart
              </button>
            </div>

            {/* Charts Content */}
            {Object.keys(activeChartConfigs).length > 0 ? (
              <div className={`w-full h-full overflow-auto ${
                isGridLayout 
                  ? 'grid grid-cols-1 gap-6' 
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