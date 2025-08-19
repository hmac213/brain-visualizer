import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Maximize2, X, BarChart3, Loader2, Users, Brain, Stethoscope, Pill } from 'lucide-react';
import { useResizable } from '../hooks/useResizable';

// Types based on database models
interface FilterOption {
  label: string;
  min?: number;
  max?: number;
}

interface FilterCategory {
  type: 'select' | 'range';
  options: string[] | FilterOption[];
}

interface FilterOptions {
  patient_demographics: {
    origin_cancer: FilterCategory;
    sex: FilterCategory;
    age_range: FilterCategory;
    height_range: FilterCategory;
    weight_range: FilterCategory;
    tumor_count_range: FilterCategory;
  };
  clinical_data: {
    systolic_bp_range: FilterCategory;
    diastolic_bp_range: FilterCategory;
  };
  tumor_characteristics: {
    tumor_location: FilterCategory;
    tumor_volume_range: FilterCategory;
  };
  treatment_data: {
    dose_range: FilterCategory;
  };
}

interface FilterCriteria {
  patient_demographics?: {
    [key: string]: string[] | FilterOption[];
  };
  clinical_data?: {
    [key: string]: string[] | FilterOption[];
  };
  tumor_characteristics?: {
    [key: string]: string[] | FilterOption[];
  };
  treatment_data?: {
    [key: string]: string[] | FilterOption[];
  };
}

interface FilterItem {
  id: string;
  name: string;
  active: boolean;
  criteria: FilterCriteria;
}

interface FilterProps {
  filterShowing: boolean;
  toggleFilter: React.Dispatch<React.SetStateAction<boolean>>;
  activeFilterId: string | null;
  onFilterChange: (filterId: string) => void;
  onWidthChange?: (width: number) => void;
  onFullScreenChange?: (isFullScreen: boolean) => void;
  activeMaskType: string;
  sidebarWidth?: number;
}

export default function Filter(props: FilterProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [filters, setFilters] = useState<FilterItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  
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

  // Modal states
  const [modalFilter, setModalFilter] = useState<FilterItem | null>(null);
  const [modalStats, setModalStats] = useState<any>(null);
  const [modalStatsLoading, setModalStatsLoading] = useState(false);
  const [newFilterModal, setNewFilterModal] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const [newFilterCriteria, setNewFilterCriteria] = useState<FilterCriteria>({});
  const [editFilterModal, setEditFilterModal] = useState<FilterItem | null>(null);
  const [editFilterName, setEditFilterName] = useState('');
  const [editFilterCriteria, setEditFilterCriteria] = useState<FilterCriteria>({});

  // Fetch filter options from backend
  useEffect(() => {
    fetch('/api/filter-options', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      credentials: 'include'  // Include session cookies
    })
    .then(response => response.json())
    .then(data => {
      setFilterOptions(data);
    })
    .catch(error => {
      console.error('Error fetching filter options:', error);
    });
  }, []);

  const handleRadioChange = (index: number) => {
    if (filters && filters[index]) {
      const selectedFilter = filters[index];
      if (selectedFilter && selectedFilter.id !== props.activeFilterId) {
        props.onFilterChange(selectedFilter.id);
      }

      const updatedFilters = filters.map((filter, i) => ({
        ...filter,
        active: i === index
      }));
      setFilters(updatedFilters);
    }
  };

  const handleDelete = async (absoluteIndex: number) => {
    if (filters && filters[absoluteIndex]) {
      const filterToDelete = filters[absoluteIndex];
      
      try {
        const response = await fetch(`/api/filters/${filterToDelete.id}`, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json'
          },
          credentials: 'include'  // Include session cookies
        });
        
        if (response.ok) {
          setFilters(prev => prev.filter((_, i) => i !== absoluteIndex));
        } else {
          console.error('Failed to delete filter');
        }
      } catch (error) {
        console.error('Error deleting filter:', error);
      }
    }
  };

  const handleCriteriaChange = (category: string, filterType: string, option: string | FilterOption, isSelected: boolean, setCriteria: React.Dispatch<React.SetStateAction<FilterCriteria>>) => {
    setCriteria(prev => {
      const updated = { ...prev };
      if (!updated[category as keyof FilterCriteria]) {
        updated[category as keyof FilterCriteria] = {};
      }
      
      const categoryData = updated[category as keyof FilterCriteria] as { [key: string]: (string | FilterOption)[] };
      
      if (!categoryData[filterType]) {
        categoryData[filterType] = [];
      }
      
      if (isSelected) {
        categoryData[filterType] = [...categoryData[filterType], option];
      } else {
        categoryData[filterType] = categoryData[filterType].filter(item => 
          typeof item === 'string' && typeof option === 'string' 
            ? item !== option 
            : JSON.stringify(item) !== JSON.stringify(option)
        );
      }
      
      return updated;
    });
  };

  const renderFilterSection = (
    categoryKey: string, 
    categoryData: { [key: string]: FilterCategory }, 
    selectedCriteria: FilterCriteria, 
    setCriteria: React.Dispatch<React.SetStateAction<FilterCriteria>>
  ) => {
    return (
      <div key={categoryKey} className='mb-4'>
        <h3 className='font-medium text-gray-800 mb-2 capitalize'>
          {categoryKey.replace(/_/g, ' ')}
        </h3>
        
        {Object.entries(categoryData).map(([filterKey, filterData]) => (
          <div key={filterKey} className='mb-3 pl-2'>
            <div className='font-medium text-gray-700 text-sm mb-1'>
              {filterKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </div>
            
            <div className='flex flex-wrap gap-2'>
              {filterData.options.map((option: string | FilterOption) => {
                const optionLabel = typeof option === 'string' ? option : option.label;
                const isSelected = selectedCriteria[categoryKey as keyof FilterCriteria]?.[filterKey]?.some(
                  item => typeof item === 'string' && typeof option === 'string' 
                    ? item === option 
                    : JSON.stringify(item) === JSON.stringify(option)
                ) || false;
                
                return (
                  <label key={optionLabel} className='flex items-center space-x-1 text-xs'>
                    <input
                      type='checkbox'
                      checked={isSelected}
                      onChange={(e) => handleCriteriaChange(
                        categoryKey, 
                        filterKey, 
                        option, 
                        e.target.checked, 
                        setCriteria
                      )}
                      className='h-3 w-3 accent-blue-600'
                    />
                    <span>{optionLabel}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };
 
  const formatCriteriaForDisplay = (criteria: FilterCriteria): string => {
    const items: string[] = [];
    
    Object.entries(criteria).forEach(([category, filters]) => {
      if (filters && typeof filters === 'object') {
        Object.entries(filters).forEach(([filterType, values]) => {
          if (values && Array.isArray(values) && values.length > 0) {
            const valueStrings = values.map((v: string | FilterOption) => 
              typeof v === 'string' ? v : v.label
            );
            items.push(`${filterType.replace(/_/g, ' ')}: ${valueStrings.join(', ')}`);
          }
        });
      }
    });
    
    return items.join('; ') || 'No filters applied';
  };
  
  // fetch initial filters from the api
  useEffect(() => {
    setLoading(true);
    fetch('/api/filters', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      credentials: 'include'  // Include session cookies
    })
    .then(response => response.json())
    .then(data => {
      if (data && typeof data === 'object') {
        const fetchedFilters: FilterItem[] = Object.keys(data).map((id) => {
          return {
            id: id,
            name: data[id].name,
            active: id === props.activeFilterId,
            criteria: data[id].criteria || {}
          };
        });
        setFilters(fetchedFilters);
      } else {
        console.error('Invalid data format received from API');
        setFilters([]);
      }
    })
    .catch(error => {
      console.error('Error fetching filters:', error);
      setFilters([]);
    })
    .finally(() => {
      setLoading(false);
    });
  }, [props.activeFilterId]);

  // Function to fetch statistics for a specific filter
  const fetchFilterStatistics = async (filterId: string, criteria: FilterCriteria) => {
    setModalStatsLoading(true);
    try {
      const response = await fetch(`/api/filter-statistics/${filterId}?maskType=${props.activeMaskType}`, {
        credentials: 'include'  // Include session cookies
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setModalStats(data);
    } catch (err) {
      console.error('Error fetching filter statistics:', err);
      setModalStats({ error: err instanceof Error ? err.message : 'Failed to fetch statistics' });
    } finally {
      setModalStatsLoading(false);
    }
  };

  if (!props.filterShowing) {
    return null;
  }
  
  return (
      <div
        className={`fixed top-0 h-screen bg-white shadow-lg ${
          !isFullScreen ? '' : 'w-full'
        }`}
        style={{ 
          zIndex: 50, 
          pointerEvents: 'auto',
          left: isFullScreen ? '0' : `${props.sidebarWidth || 64}px`, // Account for left sidebar
          width: isFullScreen ? '100%' : `${width}%`,
          maxHeight: '100vh', // Ensure it never exceeds viewport height
          // Disable transition during resize for better performance
          transition: isResizing ? 'none' : 'all 0.3s ease-in-out'
        }}
      >
        {/* Resize handle - only show when not in fullscreen */}
        {!isFullScreen && <ResizeHandle />}
  
        <div className='bg-white h-full w-full overflow-hidden'>
          {/* Header */}
          <div className='flex justify-between items-center p-3 border-b'>
            <h1 className='text-lg font-semibold'>Filters</h1>
            <div className='flex items-center space-x-1'>
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className='p-1.5 hover:bg-gray-100 rounded-md transition-colors'
                title={isFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                <Maximize2 className='w-4 h-4' />
              </button>
              <button
                onClick={() => props.toggleFilter(false)}
                className='p-1.5 hover:bg-gray-100 rounded-md transition-colors'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className='p-3 overflow-y-auto h-[calc(100%-3.5rem)]'>
            {/* New Filter Button */}
            <button
              onClick={() => {
                setNewFilterModal(true);
                setNewFilterCriteria({});
              }}
              className='w-full mb-3 px-3 py-2 bg-[#2774AE] text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors'
            >
              New Filter
            </button>

            {/* Loading state */}
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="text-base">Loading filters...</div>
              </div>
            ) : (
              /* Filter List */
              <div className='border border-gray-300 rounded-lg bg-gray-100 max-h-[75vh] overflow-y-auto'>
                {/* Optimized layout for dynamic width */}
                <div className='divide-y divide-gray-200'>
                  {/* Header */}
                  <div className='bg-gray-50 px-3 py-2'>
                    <div className='grid grid-cols-12 gap-2 items-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      <div className='col-span-2'>Active</div>
                      <div className='col-span-10'>Filter Name</div>
                    </div>
                  </div>
                  
                  {/* Filter rows */}
                  <div className='bg-white divide-y divide-gray-200'>
                    {filters.map((filter, index) => (
                      <div
                        key={filter.id}
                        className={`cursor-pointer hover:bg-gray-50 px-3 py-3 ${filter.active ? 'bg-blue-50' : ''}`}
                        onClick={() => handleRadioChange(index)}
                      >
                        {isFullScreen ? (
                          /* Fullscreen mode: single row with inline buttons */
                          <div className='grid grid-cols-12 gap-2 items-center'>
                            <div className='col-span-1'>
                              <input
                                type='radio'
                                checked={filter.active}
                                onChange={() => handleRadioChange(index)}
                                className='h-4 w-4 accent-blue-600'
                              />
                            </div>
                            <div className='col-span-8'>
                              <div className="text-sm font-medium text-gray-900 truncate" title={filter.name}>
                                {filter.name}
                              </div>
                            </div>
                            <div className='col-span-3 flex gap-2 justify-end'>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditFilterModal(filter);
                                  setEditFilterName(filter.name);
                                  setEditFilterCriteria(filter.criteria);
                                }}
                                className='px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors'
                                title="Edit filter"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setModalFilter(filter);
                                  fetchFilterStatistics(filter.id, filter.criteria);
                                }}
                                className='px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors'
                                title="View filter details"
                              >
                                View
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(index);
                                }}
                                className='px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors'
                                title="Delete filter"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Sidepanel mode: adaptive layout based on width */
                          <>
                            {/* Main row with radio and name */}
                            <div className='grid grid-cols-12 gap-2 items-center mb-2'>
                              <div className='col-span-2'>
                                <input
                                  type='radio'
                                  checked={filter.active}
                                  onChange={() => handleRadioChange(index)}
                                  className='h-4 w-4 accent-blue-600'
                                />
                              </div>
                              <div className='col-span-10'>
                                <div className="text-sm font-medium text-gray-900 truncate" title={filter.name}>
                                  {filter.name}
                                </div>
                              </div>
                            </div>
                            
                            {/* Action buttons row - always centered */}
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditFilterModal(filter);
                                  setEditFilterName(filter.name);
                                  setEditFilterCriteria(filter.criteria);
                                }}
                                className={`${width > 20 ? 'flex-1 max-w-[80px]' : 'px-2'} py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors`}
                                title="Edit filter"
                              >
                                {width > 15 ? 'Edit' : 'E'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setModalFilter(filter);
                                  fetchFilterStatistics(filter.id, filter.criteria);
                                }}
                                className={`${width > 20 ? 'flex-1 max-w-[80px]' : 'px-2'} py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors`}
                                title="View filter details"
                              >
                                {width > 15 ? 'View' : 'V'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(index);
                                }}
                                className={`${width > 20 ? 'flex-1 max-w-[80px]' : 'px-2'} py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors`}
                                title="Delete filter"
                              >
                                {width > 15 ? 'Delete' : 'D'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Popup for Viewing a Filter's Criteria */}
        {modalFilter && (
          <div className='fixed inset-0 flex justify-center items-center bg-black bg-opacity-30' style={{ zIndex: 100 }}>
            <div className='bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto'>
              <div className='flex justify-between items-center mb-6'>
                <h2 className='text-xl font-semibold text-gray-900'>{modalFilter.name}</h2>
                <button
                  onClick={() => {
                    setModalFilter(null);
                    setModalStats(null);
                  }}
                  className='text-gray-600 hover:text-gray-800 p-1'
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filter Statistics Section */}
              <div className='mb-6'>
                <div className='flex items-center gap-2 mb-4'>
                  <BarChart3 className="w-5 h-5 text-[#2774AE]" />
                  <h3 className='text-lg font-semibold text-gray-800'>Filter Impact</h3>
                </div>

                {modalStatsLoading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-[#2774AE]" />
                    <span className="ml-3 text-gray-600">Loading statistics...</span>
                  </div>
                )}

                {modalStats && !modalStatsLoading && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    {modalStats.error ? (
                      <div className="text-red-600 text-sm">
                        Error loading statistics: {modalStats.error}
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          {/* Total Patients */}
                          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                            <Users className="w-6 h-6 text-blue-600" />
                            <div>
                              <div className="text-2xl font-bold text-blue-800">
                                {modalStats.total_patients?.toLocaleString() || '0'}
                              </div>
                              <div className="text-sm text-blue-600">Total Patients</div>
                            </div>
                          </div>

                          {/* Current Mask Type (highlighted) */}
                          <div className={`flex items-center gap-3 p-3 rounded-lg ${
                            props.activeMaskType === 'tumor' ? 'bg-green-50' :
                            props.activeMaskType === 'mri' ? 'bg-purple-50' : 'bg-orange-50'
                          }`}>
                            {props.activeMaskType === 'tumor' && <Brain className="w-6 h-6 text-green-600" />}
                            {props.activeMaskType === 'mri' && <Stethoscope className="w-6 h-6 text-purple-600" />}
                            {props.activeMaskType === 'dose' && <Pill className="w-6 h-6 text-orange-600" />}
                            <div>
                              <div className={`text-2xl font-bold ${
                                props.activeMaskType === 'tumor' ? 'text-green-800' :
                                props.activeMaskType === 'mri' ? 'text-purple-800' : 'text-orange-800'
                              }`}>
                                {modalStats.current_mask_count?.toLocaleString() || '0'}
                              </div>
                              <div className={`text-sm ${
                                props.activeMaskType === 'tumor' ? 'text-green-600' :
                                props.activeMaskType === 'mri' ? 'text-purple-600' : 'text-orange-600'
                              }`}>
                                {props.activeMaskType === 'tumor' ? 'Tumors' :
                                 props.activeMaskType === 'mri' ? 'MRI Scans' : 'Dose Masks'} (Active)
                              </div>
                            </div>
                          </div>

                          {/* Other Data Types */}
                          {props.activeMaskType !== 'tumor' && (
                            <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
                              <Brain className="w-6 h-6 text-gray-500" />
                              <div>
                                <div className="text-xl font-semibold text-gray-700">
                                  {modalStats.total_tumors?.toLocaleString() || '0'}
                                </div>
                                <div className="text-sm text-gray-600">Tumor Masks</div>
                              </div>
                            </div>
                          )}

                          {props.activeMaskType !== 'mri' && (
                            <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
                              <Stethoscope className="w-6 h-6 text-gray-500" />
                              <div>
                                <div className="text-xl font-semibold text-gray-700">
                                  {modalStats.total_mris?.toLocaleString() || '0'}
                                </div>
                                <div className="text-sm text-gray-600">MRI Scans</div>
                              </div>
                            </div>
                          )}

                          {props.activeMaskType !== 'dose' && (
                            <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
                              <Pill className="w-6 h-6 text-gray-500" />
                              <div>
                                <div className="text-xl font-semibold text-gray-700">
                                  {modalStats.total_dose_masks?.toLocaleString() || '0'}
                                </div>
                                <div className="text-sm text-gray-600">Dose Masks</div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 text-xs text-gray-500 text-center">
                          Statistics based on current mask type: {props.activeMaskType}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Filter Criteria Section */}
              <div>
                <h3 className='text-lg font-semibold text-gray-800 mb-3'>Applied Filters</h3>
                <div className='bg-gray-50 rounded-lg p-4'>
                  <div className='text-gray-700 text-sm leading-relaxed'>
                    {formatCriteriaForDisplay(modalFilter.criteria)}
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setModalFilter(null);
                    setModalStats(null);
                  }}
                  className='px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors'
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Popup for Creating a New Filter */}
        {newFilterModal && filterOptions && (
          <div className='fixed inset-0 flex justify-center items-center bg-black bg-opacity-30' style={{ zIndex: 100 }}>
            <div className='bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full mx-4 overflow-y-auto max-h-[80vh]'>
              <div className='flex justify-between items-center mb-4'>
                <h2 className='text-lg font-semibold'>Create New Filter</h2>
                <button
                  onClick={() => setNewFilterModal(false)}
                  className='text-gray-600 hover:text-gray-800'
                >
                  Close
                </button>
              </div>
              
              <div className='mb-4'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Filter Name</label>
                <input
                  type='text'
                  value={newFilterName}
                  onChange={(e) => setNewFilterName(e.target.value)}
                  className='w-full border border-gray-300 rounded p-2'
                />
              </div>
              
              <div className='mb-4 max-h-96 overflow-y-auto'>
                {Object.entries(filterOptions).map(([categoryKey, categoryData]) =>
                  renderFilterSection(categoryKey, categoryData, newFilterCriteria, setNewFilterCriteria)
                )}
              </div>
              
              <div className='flex justify-end space-x-2'>
                <button
                  onClick={() => setNewFilterModal(false)}
                  className='px-3 py-1 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors'
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (newFilterName.trim()) {
                      const newFilter: FilterItem = {
                        id: uuidv4(),
                        name: newFilterName,
                        active: false,
                        criteria: newFilterCriteria
                      }

                      fetch('/api/filters', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Accept': 'application/json'
                        },
                        credentials: 'include',  // Include session cookies
                        body: JSON.stringify(newFilter)
                      })
                      .then(response => response.json())
                      .then(data => {
                        setFilters(prev => [...prev, newFilter]);
                        setNewFilterName('');
                        setNewFilterCriteria({});
                        setNewFilterModal(false);
                      })
                      .catch(error => {
                        console.error('error creating filter:', error);
                      });
                    }
                  }}
                  className='px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Popup for Editing a Filter */}
        {editFilterModal && filterOptions && (
          <div className='fixed inset-0 flex justify-center items-center bg-black bg-opacity-30' style={{ zIndex: 100 }}>
            <div className='bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full mx-4 overflow-y-auto max-h-[80vh]'>
              <div className='flex justify-between items-center mb-4'>
                <h2 className='text-lg font-semibold'>Edit Filter</h2>
                <button
                  onClick={() => setEditFilterModal(null)}
                  className='text-gray-600 hover:text-gray-800'
                >
                  Close
                </button>
              </div>
              
              <div className='mb-4'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Filter Name</label>
                <input
                  type='text'
                  value={editFilterName}
                  onChange={(e) => setEditFilterName(e.target.value)}
                  className='w-full border border-gray-300 rounded p-2'
                />
              </div>
              
              <div className='mb-4 max-h-96 overflow-y-auto'>
                {Object.entries(filterOptions).map(([categoryKey, categoryData]) =>
                  renderFilterSection(categoryKey, categoryData, editFilterCriteria, setEditFilterCriteria)
                )}
              </div>
              
              <div className='flex justify-end space-x-2'>
                <button
                  onClick={() => setEditFilterModal(null)}
                  className='px-3 py-1 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors'
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (editFilterModal && editFilterName.trim()) {
                      fetch(`/api/filters/${editFilterModal.id}`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          'Accept': 'application/json'
                        },
                        credentials: 'include',  // Include session cookies
                        body: JSON.stringify({
                          name: editFilterName,
                          criteria: editFilterCriteria
                        })
                      })
                      .then(response => response.json())
                      .then(data => {
                        setFilters(prev => prev.map(f => 
                          f.id === editFilterModal.id 
                            ? { ...f, name: editFilterName, criteria: editFilterCriteria }
                            : f
                        ));
                        setEditFilterModal(null);
                      })
                      .catch(error => {
                        console.error('error updating filter:', error);
                      });
                    }
                  }}
                  className='px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }