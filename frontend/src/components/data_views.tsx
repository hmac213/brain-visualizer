import React, { useState, useEffect } from 'react';
import Chart from './chart';
import { LayoutGrid, StretchHorizontal, Maximize2, X } from 'lucide-react'
import NewChartModal from './NewChartModal';
import { useResizable } from '../hooks/useResizable';

// Remove the baseURL since we're using the proxy
// const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface PlotlyConfig {
  data: any;
  layout: any;
}

interface DataProps {
    dataShowing: boolean;
    toggleData: React.Dispatch<React.SetStateAction<boolean>>;
    onWidthChange?: (width: number) => void;
    onFullScreenChange?: (isFullScreen: boolean) => void;
}

export default function DataView(props: DataProps) {
  const [activeChartConfigs, setActiveChartConfigs] = useState<Record<string, PlotlyConfig>>({});
  const [isGridLayout, setIsGridLayout] = useState(false);
  const [newChartModal, setNewChartModal] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Resizable functionality
  const { width, isResizing, ResizeHandle } = useResizable({
    initialWidth: 25,
    minWidth: 15,
    maxWidth: 60
  });

  // Notify parent component of width changes for brain scaling
  useEffect(() => {
    if (props.onWidthChange && !isFullScreen) {
      props.onWidthChange(width);
    }
  }, [width, isFullScreen, props.onWidthChange]);

  // Notify parent component of fullscreen state changes
  useEffect(() => {
    if (props.onFullScreenChange) {
      props.onFullScreenChange(isFullScreen);
    }
  }, [isFullScreen, props.onFullScreenChange]);

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
        className={`fixed top-0 h-screen bg-white shadow-lg relative ${
          !isFullScreen ? '' : 'w-full'
        }`}
        style={{ 
          zIndex: 50, 
          pointerEvents: 'auto',
          left: isFullScreen ? '0' : '64px', // Account for left sidebar
          width: isFullScreen ? '100%' : `${width}%`,
          maxHeight: '100vh', // Ensure it never exceeds viewport height
          // Disable transition during resize for better performance
          transition: isResizing ? 'none' : 'all 0.3s ease-in-out'
        }}
      >
        {/* Resize handle - only show when not in fullscreen */}
        {!isFullScreen && <ResizeHandle />}

        <div className='bg-white h-full w-full overflow-hidden flex flex-col max-h-screen'>
          {/* Header */}
          <div className='flex justify-between items-center p-3 border-b flex-shrink-0'>
            <h1 className='text-lg font-semibold'>Data Visualizations</h1>
            <div className='flex items-center space-x-1'>
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className='p-1.5 hover:bg-gray-100 rounded-md transition-colors'
                title={isFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                <Maximize2 className='w-4 h-4' />
              </button>
              <button
                onClick={() => props.toggleData(false)}
                className='p-1.5 hover:bg-gray-100 rounded-md transition-colors'
                title='Close'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
          </div>

          {/* Content - Strict height container with scroll */}
          <div className='flex-1 overflow-y-auto p-3 max-h-[calc(100vh-3.5rem)]'>
            {/* Optional Grid/List Toggle for Fullscreen */}
            {isFullScreen && (
              <div className='flex items-center space-x-3 mb-3'>
                <button 
                  className={`px-4 py-2 transition-colors text-sm font-medium rounded-md ${
                    isGridLayout ? 'bg-[#2774AE] text-white' : 'hover:bg-[#2774AE] hover:text-white'
                  }`}
                  onClick={() => setIsGridLayout(true)}
                  title="Grid Layout"
                >
                  <LayoutGrid className='w-4 h-4' />
                </button>
                <button 
                  className={`px-4 py-2 transition-colors text-sm font-medium rounded-md ${
                    !isGridLayout ? 'bg-[#2774AE] text-white' : 'hover:bg-[#2774AE] hover:text-white'
                  }`}
                  onClick={() => setIsGridLayout(false)}
                  title="Vertical Layout"
                >
                  <StretchHorizontal className='w-4 h-4' />
                </button>
              </div>
            )}

            {/* New Chart Button - matching filter component style */}
            <button
              onClick={() => setNewChartModal(true)}
              className='w-full mb-3 px-3 py-2 bg-[#2774AE] text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors'
            >
              New Chart
            </button>

            {/* Charts Content with constrained heights */}
            {Object.keys(activeChartConfigs).length > 0 ? (
              <div className={`${
                (isGridLayout && isFullScreen)
                  ? 'grid grid-cols-2 gap-6' 
                  : 'space-y-6'
              }`}>
                {Object.entries(activeChartConfigs).map(([chartId, config]) => {
                  if (config && config.data && config.layout) {
                    return (
                      <div 
                        key={chartId} 
                        className={`border border-gray-200 rounded-lg overflow-hidden ${
                          (isGridLayout && isFullScreen) 
                            ? 'h-[400px]' 
                            : isFullScreen 
                              ? 'h-[500px]' 
                              : 'h-[300px]'
                        }`}
                      >
                        <Chart plotlyConfig={config} />
                      </div>
                    );
                  } else {
                    console.warn(`Invalid or missing config for chart ID: ${chartId}`);
                    return <div key={chartId}>Error loading chart: {chartId}</div>;
                  }
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-10 text-sm">No chart data available or failed to load charts.</div>
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