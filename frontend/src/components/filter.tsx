import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Remove the baseURL since we're using the proxy
// const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

// sample filter categories (replace later with real categories)
const data: Record<string, string[]> = {
  origin_cancer: [
    "Lung",
    "Liver",
    "Breast",
    "Colorectal",
    "Melanoma",
    "Renal"
  ],
  tumor_count: [
    "Single",
    "2-3 lesions",
    "4+ lesions"
  ],
  tumor_size: [
    "Small (<1cm)",
    "Medium (1-3cm)",
    "Large (>3cm)"
  ],
  tumor_location: [
    "Frontal Lobe",
    "Parietal Lobe",
    "Temporal Lobe",
    "Occipital Lobe",
    "Cerebellum",
    "Brainstem"
  ],
  patient_age: [
    "<20",
    "21-30",
    "31-40",
    "41-50",
    "51-60",
    "61-70",
    "70+"
  ],
};

interface FilterItem {
  id: string;
  name: string;
  active: boolean;
  activeFilters: string[];
}

interface FilterProps {
  filterShowing: boolean;
  toggleFilter: React.Dispatch<React.SetStateAction<boolean>>;
  activeFilterId: string | null;
  onFilterChange: (filterId: string) => void;
}

export default function Filter(props: FilterProps) {
  // Initialize state with placeholders but use useEffect to set real data
  const [filters, setFilters] = useState<FilterItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Modal states
  const [modalFilter, setModalFilter] = useState<FilterItem | null>(null);
  const [newFilterModal, setNewFilterModal] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  
  // Create an empty initial state without dynamic initialization to prevent hydration issues
  const emptySelections: { [key: string]: string[] } = {};
  Object.keys(data).forEach(category => {
    emptySelections[category] = [];
  });
  
  const [newFilterSelections, setNewFilterSelections] = useState<{ [key: string]: string[] }>(emptySelections);
  const [editFilterModal, setEditFilterModal] = useState<FilterItem | null>(null);
  const [editFilterName, setEditFilterName] = useState('');
  const [editFilterSelections, setEditFilterSelections] = useState<{ [key: string]: string[] }>(emptySelections);

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
          }
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

  // fetch initial filters from the api
  useEffect(() => {
    setLoading(true);
    fetch('/api/filters', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data && typeof data === 'object') {
        const fetchedFilters: FilterItem[] = Object.keys(data).map((id) => {
          return {
            id: id,
            name: data[id].name,
            active: id === props.activeFilterId,
            activeFilters: Array.isArray(data[id].options) ? data[id].options : []
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

  if (!props.filterShowing) {
    return null;
  }

  return (
    <div
      className='absolute inset-0 flex justify-center items-center'
      style={{ pointerEvents: 'auto' }}
      onClick={(e) => { if(e.target === e.currentTarget) props.toggleFilter(false); }}
    >
      <div
        className='bg-white px-96 py-24 flex flex-col h-full w-full overflow-hidden'
      >
        {/* Header with Title, New Filter button, and Close button */}
        <div className='flex justify-between items-center mb-4'>
          <h1 className='text-2xl font-bold'>Manage Filters</h1>
          <div className='flex space-x-2'>
            <button
              onClick={() => setNewFilterModal(true)}
              className='px-3 py-1 bg-[#2774AE] text-white rounded-md hover:bg-blue-700 transition-colors'
            >
              New Filter
            </button>
            <button
              onClick={() => props.toggleFilter(false)}
              className='px-3 py-1 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors'
            >
              Close
            </button>
          </div>
        </div>
        
        {/* Loading state */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">Loading filters...</div>
          </div>
        ) : (
          /* Filter List with scroll if too long */
          <div className='border border-gray-300 rounded-lg bg-gray-100 max-h-[80vh] overflow-y-auto'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='w-[10%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Active</th>
                  <th className='w-[70%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Filter Name</th>
                  <th className='w-[20%] px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>Actions</th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {filters.map((filter, index) => (
                  <tr
                    key={filter.id}
                    onClick={() => handleRadioChange(index)}
                    className='cursor-pointer hover:bg-gray-50'
                  >
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <input
                        type='radio'
                        name='activeFilter'
                        checked={filter.id === props.activeFilterId}
                        onChange={() => handleRadioChange(index)}
                        className='h-5 w-5 accent-[#2774AE]'
                      />
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap font-semibold text-gray-800'>
                      {filter.name}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-right'>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditFilterModal(filter);
                          setEditFilterName(filter.name);
                          
                          const selections: { [key: string]: string[] } = {};
                          Object.keys(data).forEach(category => {
                            selections[category] = data[category].filter(option =>
                              filter.activeFilters.includes(option)
                            );
                          });
                          setEditFilterSelections(selections);
                        }}
                        className='px-2 py-1 mr-2 bg-white border border-gray-300 rounded-md hover:bg-gray-100'
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(index);
                        }}
                        className='px-2 py-1 mr-2 bg-white border border-gray-300 rounded-md hover:bg-gray-100'
                      >
                        Delete
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalFilter(filter);
                        }}
                        className='px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors'
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Popup for Viewing a Filter's Selected Filters */}
      {modalFilter && (
        <div className='fixed inset-0 flex justify-center items-center bg-black bg-opacity-30'>
          <div className='bg-white rounded-lg shadow-lg p-6 max-w-md w-full'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-lg font-semibold'>{modalFilter.name} - Selected Filters</h2>
              <button
                onClick={() => setModalFilter(null)}
                className='text-gray-600 hover:text-gray-800'
              >
                Close
              </button>
            </div>
            <div className='space-y-2'>
              <div className='font-semibold text-gray-800'>Filters:</div>
              <div className='text-gray-600 text-sm'>
                {modalFilter.activeFilters.join(', ')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup for Creating a New Filter */}
      {newFilterModal && (
        <div className='fixed inset-0 flex justify-center items-center bg-black bg-opacity-30'>
          <div className='bg-white rounded-lg shadow-lg p-6 max-w-md w-full overflow-y-auto max-h-[80vh]'>
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
            <div className='mb-4'>
              {Object.keys(data).map(category => (
                <div key={category} className='mb-2'>
                  <div className='font-medium text-gray-800'>{category}</div>
                  <div className='flex flex-wrap gap-2 mt-1'>
                    {data[category].map((option: string) => (
                      <label key={option} className='flex items-center space-x-1'>
                        <input
                          type='checkbox'
                          checked={(newFilterSelections[category] || []).includes(option)}
                          onChange={() => {
                            const current = newFilterSelections[category] || [];
                            const newSelection = current.includes(option)
                              ? current.filter(o => o !== option)
                              : [...current, option];
                            setNewFilterSelections(prev => ({ ...prev, [category]: newSelection }));
                          }}
                          className='h-4 w-4 accent-blue-600'
                        />
                        <span className='text-sm'>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
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
                  const selectedOptions = Object.values(newFilterSelections).flat();
                  if (newFilterName.trim()) {
                    // create a new filter object
                    const newFilter: FilterItem = {
                      id: uuidv4(),
                      name: newFilterName,
                      active: false,
                      activeFilters: selectedOptions
                    }

                    // create a new filter within the backend
                    fetch('/api/filters', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                      },
                      body: JSON.stringify(newFilter)
                    })
                    .then(response => response.json())
                    .then(data => {
                      setFilters(prev => [...prev, newFilter]);
                      setNewFilterName('');
                      
                      const resetSelections: { [key: string]: string[] } = {};
                      Object.keys(data).forEach(category => {
                        resetSelections[category] = [];
                      });
                      setNewFilterSelections(resetSelections);
                      
                      setNewFilterModal(false);
                    })
                    .catch(error => {
                      console.error('error creating filter:', error);
                    });
                  }
                }}
                className='px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors'
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup for Editing a Filter */}
      {editFilterModal && (
        <div className='fixed inset-0 flex justify-center items-center bg-black bg-opacity-30'>
          <div className='bg-white rounded-lg shadow-lg p-6 max-w-md w-full overflow-y-auto max-h-[80vh]'>
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
            <div className='mb-4'>
              {Object.keys(data).map(category => (
                <div key={category} className='mb-2'>
                  <div className='font-medium text-gray-800'>{category}</div>
                  <div className='flex flex-wrap gap-2 mt-1'>
                    {data[category].map((option: string) => (
                      <label key={option} className='flex items-center space-x-1'>
                        <input
                          type='checkbox'
                          checked={(editFilterSelections[category] || []).includes(option)}
                          onChange={() => {
                            const current = editFilterSelections[category] || [];
                            const newSelection = current.includes(option)
                              ? current.filter(o => o !== option)
                              : [...current, option];
                            setEditFilterSelections(prev => ({ ...prev, [category]: newSelection }));
                          }}
                          className='h-4 w-4 accent-blue-600'
                        />
                        <span className='text-sm'>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
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
                  const selectedOptions = Object.values(editFilterSelections).flat();
                  if (editFilterName.trim() && editFilterModal) {
                    // Update the filter on the backend
                    fetch(`/api/filters/${editFilterModal.id}`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                      },
                      body: JSON.stringify({
                        name: editFilterName,
                        activeFilters: selectedOptions
                      })
                    })
                    .then(response => response.json())
                    .then(data => {
                      // Update the local state
                      setFilters(prev => prev.map(filter => 
                        filter.id === editFilterModal.id 
                          ? { ...filter, name: editFilterName, activeFilters: selectedOptions } 
                          : filter
                      ));
                      setEditFilterModal(null);
                    })
                    .catch(error => {
                      console.error('Error updating filter:', error);
                    });
                  }
                }}
                className='px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors'
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}