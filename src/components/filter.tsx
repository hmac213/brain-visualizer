import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

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
}

export default function Filter(props: FilterProps) {
  // initialize as empty (populate from api after useState declarations)
  const initialFilters: FilterItem[] = [];

  // Manage local state for filters and modals
  const [filters, setFilters] = useState<FilterItem[]>(initialFilters);
  // Modal for viewing a filter
  const [modalFilter, setModalFilter] = useState<FilterItem | null>(null);
  
  // State for New Filter Modal
  const [newFilterModal, setNewFilterModal] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const [newFilterSelections, setNewFilterSelections] = useState<{ [key: string]: string[] }>(() => {
    const initial: { [key: string]: string[] } = {};
    Object.keys(data).forEach(category => {
      initial[category] = [];
    });
    return initial;
  });

  // State for Edit Filter Modal
  const [editFilterModal, setEditFilterModal] = useState<FilterItem | null>(null);
  const [editFilterName, setEditFilterName] = useState('');
  const [editFilterSelections, setEditFilterSelections] = useState<{ [key: string]: string[] }>(() => {
    const initial: { [key: string]: string[] } = {};
    Object.keys(data).forEach(category => {
      initial[category] = [];
    });
    return initial;
  });

  const handleRadioChange = (index: number) => {
    const updatedFilters = filters.map((filter, i) => ({
      ...filter,
      active: i === index
    }));
    setFilters(updatedFilters);
  };

  const handleDelete = (absoluteIndex: number) => {
    setFilters(prev => prev.filter((_, i) => i !== absoluteIndex));
  };

  // fetch initial filters from the api
  useEffect(() => {
    fetch(`${baseURL}/api/filters`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })
    .then(response => response.json())
    .then(data => {
      Object.keys(data).forEach((id) => {
        const curFilter: FilterItem = {
          id: id,
          name: data[id].name,
          active: (id === 'default_id') ? true : false,
          activeFilters: data[id].options
        }
        setFilters(prev => [...prev, curFilter]);
      })
    })
    .catch(error => {
      console.error('Error fetching filters:', error);
    });
  }, []);

  return props.filterShowing ? (
    <div
      className='absolute inset-0 flex justify-center items-center'
      style={{ pointerEvents: 'auto' }}
      onClick={(e) => { if(e.target === e.currentTarget) props.toggleFilter(false); }}
    >
      <div
        className='bg-white px-100 py-24 flex flex-col h-full w-full overflow-hidden'
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
        {/* Filter List with scroll if too long */}
        <div className='border border-gray-300 rounded-lg bg-gray-100 max-h-[80vh] overflow-y-auto'>
          <table className='min-w-full divide-y divide-gray-200'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='w-1/10 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Active</th>
                <th className='w-7/10 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Filter Name</th>
                <th className='w-1/5 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>Actions</th>
              </tr>
            </thead>
            <tbody className='bg-white divide-y divide-gray-200'>
              {filters.map((filter, index) => {
                return (
                  <tr
                    key={index}
                    onClick={() => handleRadioChange(index)}
                    className='cursor-pointer hover:bg-gray-50'
                  >
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <input
                        type='radio'
                        name='activeFilter'
                        checked={filter.active}
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
                          setEditFilterSelections(() => {
                            const selections: { [key: string]: string[] } = {};
                            Object.keys(data).forEach(category => {
                              selections[category] = data[category].filter(option =>
                                filter.activeFilters.includes(option)
                              );
                            });
                            return selections;
                          });
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
                );
              })}
            </tbody>
          </table>
        </div>
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
                    fetch(`${baseURL}/api/filters`, {
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
                      setNewFilterSelections(() => {
                        const initial: { [key: string]: string[] } = {};
                        Object.keys(data).forEach(category => {
                          initial[category] = [];
                        });
                        return initial;
                      });
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
                          checked={editFilterSelections[category].includes(option)}
                          onChange={() => {
                            const current = editFilterSelections[category];
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
                    setFilters(prev => prev.map(filter => filter === editFilterModal ? { ...filter, name: editFilterName, activeFilters: selectedOptions } : filter));
                    setEditFilterModal(null);
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
  ) : null;
}