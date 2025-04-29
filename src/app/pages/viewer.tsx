import React, { useState, useEffect, useRef } from 'react';
import { SlidersHorizontal, ChartColumn } from 'lucide-react'
import Filter from '@/components/filter';
import DataView from '@/components/data_views';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function Viewer() {
  const [filterShowing, toggleFilter] = useState(false);
  const [dataShowing, toggleData] = useState(false);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    fetch(`${baseURL}/api/filters/get_current`)
      .then(response => response.json())
      .then(data => {
        if (data && Object.keys(data).length > 0) {
          const initialId = Object.keys(data)[0];
          setActiveFilterId(initialId);
          console.log("Initial active filter ID set:", initialId);
        } else {
          setActiveFilterId('default_id');
          console.log("No initial filter found, defaulting to 'default_id'.");
        }
      })
      .catch(error => {
        console.error('Error fetching initial current filter:', error);
        setActiveFilterId('default_id');
      });
  }, []);

  const handleFilterChange = async (newFilterId: string) => {
    if (newFilterId === activeFilterId) {
        console.log("Filter already active:", newFilterId);
        return;
    }

    console.log("Attempting to set active filter to:", newFilterId);
    setActiveFilterId(newFilterId);

    try {
        const response = await fetch(`${baseURL}/api/filters/set_current/${newFilterId}`, {
            method: 'PUT',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to set current filter: ${errorData.error || response.statusText}`);
        }

        const result = await response.json();
        console.log("Backend update successful:", result.message);

        if (iframeRef.current) {
            console.log("Reloading iframe...");
            iframeRef.current.src = iframeRef.current.src;
        }

    } catch (error) {
        console.error('Error updating current filter:', error);
    }
  };

  return (
    <div style={{ display: 'grid', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <iframe
        ref={iframeRef}
        src={`${baseURL}/api/viewer`}
        style={{ gridArea: '1 / 1 / 2 / 2', width: '100%', height: '100%', border: 'none', zIndex: 0, marginTop: '64px' }}
        title="Pycortex WebGL Viewer"
      />
      <div style={{ gridArea: '1 / 1 / 2 / 2', width: '100%', height: '100%', border: 'none', zIndex: 10, pointerEvents: 'none' }}>
        {!filterShowing && !dataShowing && (
          <div className="fixed inset-x-0 top-0 z-20 flex h-16 w-full items-center justify-between bg-white" style={{ pointerEvents: 'auto' }}>
            <div className="flex gap-8 p-8">
              <button
                onClick={() => toggleFilter(prev => !prev)}
                className="cursor-pointer text-gray-800"
                title="Toggle Filters"
              >
                Filters
              </button>
              <button
                onClick={() => toggleData(prev => !prev)}
                className="cursor-pointer text-gray-800"
                title="Toggle Data Visualizations"
              >
                Charts
              </button>
            </div>
            <div className="flex items-center justify-center h-full" style={{ backgroundColor: '#2774AE' }}>
              <img src='/UCLA_logo.svg' style={{ height: '100%', width: 'auto' }} alt="UCLA logo" />
            </div>
          </div>
        )}
        
        <Filter 
          filterShowing={filterShowing} 
          toggleFilter={toggleFilter} 
          activeFilterId={activeFilterId}
          onFilterChange={handleFilterChange}
        />
        <DataView dataShowing={dataShowing} toggleData={toggleData} />
      </div>
    </div>
  );
}