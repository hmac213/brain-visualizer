import React, { useState, useEffect } from 'react';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface FilterItem {
  id: string;
  name: string;
  active: boolean;
  activeFilters: string[];
}

interface PlotlyConfig {
  data: any;
  layout: any;
}

interface NewChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChartCreated: (chartId: string, config: PlotlyConfig) => void;
}

// Chart type options
const chartTypes = [
  { id: 'line_chart', name: 'Line Chart' },
  { id: 'bar_chart', name: 'Bar Chart' },
  { id: 'scatter_plot', name: 'Scatter Plot' },
  { id: 'histogram', name: 'Histogram' },
  { id: 'box_plot', name: 'Box Plot' },
  { id: 'bubble_chart', name: 'Bubble Chart' }
];

export default function NewChartModal({ isOpen, onClose, onChartCreated }: NewChartModalProps) {
  const [filters, setFilters] = useState<FilterItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('');
  const [selectedChartType, setSelectedChartType] = useState<string>('');
  const [chartSettings, setChartSettings] = useState({
    title: '',
    xaxis_title: '',
    yaxis_title: ''
  });
  
  // For series data in charts
  const [seriesData, setSeriesData] = useState([{
    name: 'Series 1',
    data: { x: [], y: [], size: [] }
  }]);
  
  // Fetch filters on component mount
  useEffect(() => {
    if (isOpen) {
      fetch(`${baseURL}/api/filters`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })
      .then(response => response.json())
      .then(data => {
        const filterItems: FilterItem[] = [];
        Object.keys(data).forEach((id) => {
          const curFilter: FilterItem = {
            id: id,
            name: data[id].name,
            active: (id === 'default_id') ? true : false,
            activeFilters: data[id].options
          };
          filterItems.push(curFilter);
        });
        setFilters(filterItems);
        
        // Set default selected filter to the active one
        const activeFilter = filterItems.find(f => f.active);
        if (activeFilter) {
          setSelectedFilter(activeFilter.id);
        }
      })
      .catch(error => {
        console.error('Error fetching filters:', error);
      });
    }
  }, [isOpen]);
  
  // Reset chart form when chart type changes
  useEffect(() => {
    if (selectedChartType) {
      // Reset series data based on chart type
      const initialData = {
        name: 'Series 1',
        data: { x: [], y: [], size: [] }
      };
      
      setSeriesData([initialData]);
    }
  }, [selectedChartType]);
  
  // Handle form input changes
  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setChartSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle series data changes
  const handleSeriesChange = (index: number, field: string, value: any) => {
    const updatedSeries = [...seriesData];
    if (field === 'name') {
      updatedSeries[index].name = value;
    } else if (field === 'x' || field === 'y' || field === 'size') {
      updatedSeries[index].data[field] = value.split(',').map((item: string) => 
        isNaN(Number(item.trim())) ? item.trim() : Number(item.trim())
      );
    }
    setSeriesData(updatedSeries);
  };
  
  // Add a new series
  const addSeries = () => {
    setSeriesData([...seriesData, {
      name: `Series ${seriesData.length + 1}`,
      data: { x: [], y: [], size: [] }
    }]);
  };
  
  // Remove a series
  const removeSeries = (index: number) => {
    const updated = [...seriesData];
    updated.splice(index, 1);
    setSeriesData(updated);
  };
  
  // Reset the form
  const resetForm = () => {
    setSelectedChartType('');
    setChartSettings({
      title: '',
      xaxis_title: '',
      yaxis_title: ''
    });
    setSeriesData([{
      name: 'Series 1',
      data: { x: [], y: [], size: [] }
    }]);
  };
  
  // Handle chart creation
  const createChart = () => {
    // Format the data for the API
    const chartId = crypto.randomUUID();
    const chartData = {
      id: chartId,
      type: selectedChartType,
      title: chartSettings.title,
      data: {
        xaxis_title: chartSettings.xaxis_title,
        yaxis_title: chartSettings.yaxis_title,
        series: seriesData.map(series => {
          const seriesObj: any = {
            name: series.name,
            trace: {}
          };
          
          // Add x and y data
          if (series.data.x.length > 0) {
            seriesObj.trace.x = series.data.x;
          }
          
          if (series.data.y.length > 0) {
            seriesObj.trace.y = series.data.y;
          }
          
          // Add size for bubble charts
          if (selectedChartType === 'bubble_chart' && series.data.size.length > 0) {
            seriesObj.trace.size = series.data.size;
          }
          
          return seriesObj;
        })
      }
    };
    
    // Submit to API
    fetch(`${baseURL}/api/charts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(chartData)
    })
    .then(response => {
      if (!response.ok) {
        return response.text().then(text => {
          throw new Error(`HTTP error! status: ${response.status}, message: ${text}`);
        });
      }
      return response.json();
    })
    .then(data => {
      // Notify parent component
      onChartCreated(chartId, data);
      
      // Close the modal and reset form
      closeModal();
    })
    .catch(error => {
      console.error('Error creating chart:', error);
    });
  };
  
  // Handle modal close
  const closeModal = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;
  
  return (
    <div className='fixed inset-0 flex justify-center items-center bg-black bg-opacity-30 z-50'>
      <div className='bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full overflow-y-auto max-h-[80vh]'>
        <div className='flex justify-between items-center mb-4'>
          <h2 className='text-lg font-semibold'>Create New Chart</h2>
          <button
            onClick={closeModal}
            className='text-gray-600 hover:text-gray-800'
          >
            Close
          </button>
        </div>
        
        {/* Filter Selection */}
        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-700 mb-1'>Select Filter</label>
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className='w-full border border-gray-300 rounded p-2'
          >
            {filters.map((filter) => (
              <option key={filter.id} value={filter.id}>
                {filter.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Chart Type Selection */}
        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-700 mb-1'>Chart Type</label>
          <select
            value={selectedChartType}
            onChange={(e) => setSelectedChartType(e.target.value)}
            className='w-full border border-gray-300 rounded p-2'
          >
            <option value="">Select Chart Type</option>
            {chartTypes.map((chartType) => (
              <option key={chartType.id} value={chartType.id}>
                {chartType.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Chart Settings (if chart type is selected) */}
        {selectedChartType && (
          <div>
            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Chart Title</label>
              <input
                type='text'
                name='title'
                value={chartSettings.title}
                onChange={handleSettingsChange}
                className='w-full border border-gray-300 rounded p-2'
                placeholder='Enter chart title'
              />
            </div>
            
            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>X-Axis Title</label>
              <input
                type='text'
                name='xaxis_title'
                value={chartSettings.xaxis_title}
                onChange={handleSettingsChange}
                className='w-full border border-gray-300 rounded p-2'
                placeholder='Enter x-axis title'
              />
            </div>
            
            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Y-Axis Title</label>
              <input
                type='text'
                name='yaxis_title'
                value={chartSettings.yaxis_title}
                onChange={handleSettingsChange}
                className='w-full border border-gray-300 rounded p-2'
                placeholder='Enter y-axis title'
              />
            </div>
            
            {/* Series Data */}
            <div className='mb-4'>
              <div className='flex justify-between items-center mb-2'>
                <label className='block text-sm font-medium text-gray-700'>Series Data</label>
                <button
                  onClick={addSeries}
                  className='px-2 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-xs'
                >
                  Add Series
                </button>
              </div>
              
              {seriesData.map((series, index) => (
                <div key={index} className='p-3 border border-gray-300 rounded-md mb-3'>
                  <div className='flex justify-between items-center mb-2'>
                    <h4 className='text-sm font-medium'>Series {index + 1}</h4>
                    {seriesData.length > 1 && (
                      <button
                        onClick={() => removeSeries(index)}
                        className='px-2 py-1 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors text-xs'
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div className='mb-2'>
                    <label className='block text-xs text-gray-600 mb-1'>Series Name</label>
                    <input
                      type='text'
                      value={series.name}
                      onChange={(e) => handleSeriesChange(index, 'name', e.target.value)}
                      className='w-full border border-gray-300 rounded p-2 text-sm'
                      placeholder='Series name'
                    />
                  </div>
                  
                  <div className='mb-2'>
                    <label className='block text-xs text-gray-600 mb-1'>X Values (comma-separated)</label>
                    <input
                      type='text'
                      value={series.data.x.join(', ')}
                      onChange={(e) => handleSeriesChange(index, 'x', e.target.value)}
                      className='w-full border border-gray-300 rounded p-2 text-sm'
                      placeholder='e.g. 10, 20, 30 or Jan, Feb, Mar'
                    />
                  </div>
                  
                  <div className='mb-2'>
                    <label className='block text-xs text-gray-600 mb-1'>Y Values (comma-separated)</label>
                    <input
                      type='text'
                      value={series.data.y.join(', ')}
                      onChange={(e) => handleSeriesChange(index, 'y', e.target.value)}
                      className='w-full border border-gray-300 rounded p-2 text-sm'
                      placeholder='e.g. 5, 15, 25'
                    />
                  </div>
                  
                  {selectedChartType === 'bubble_chart' && (
                    <div className='mb-2'>
                      <label className='block text-xs text-gray-600 mb-1'>Size Values (comma-separated)</label>
                      <input
                        type='text'
                        value={series.data.size.join(', ')}
                        onChange={(e) => handleSeriesChange(index, 'size', e.target.value)}
                        className='w-full border border-gray-300 rounded p-2 text-sm'
                        placeholder='e.g. 20, 40, 60'
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className='flex justify-end space-x-2 mt-4'>
          <button
            onClick={closeModal}
            className='px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm'
          >
            Cancel
          </button>
          <button
            onClick={createChart}
            disabled={!selectedChartType || seriesData.length === 0}
            className={`px-4 py-2 bg-[#2774AE] text-white rounded-md transition-colors text-sm ${
              !selectedChartType || seriesData.length === 0 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-blue-700'
            }`}
          >
            Create Chart
          </button>
        </div>
      </div>
    </div>
  );
} 