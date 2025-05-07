'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SlidersHorizontal, ChartColumn } from 'lucide-react'
import Filter from '@/components/filter';
import DataView from '@/components/data_views';
import GlassBrainViewer from '@/components/GlassBrainViewer';

export default function Viewer() {
  const [filterShowing, toggleFilter] = useState(false);
  const [dataShowing, toggleData] = useState(false);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [activeViewType, setActiveViewType] = useState<string>('surface');

  useEffect(() => {
    fetch(`/api/filters/get_current`)
      .then(response => response.json())
      .then(data => {
        if (data && Object.keys(data).length > 0) {
          const initialId = Object.keys(data)[0];
          setActiveFilterId(initialId);
          console.log("Initial active filter ID set:", initialId);
        } else {
          console.log("No initial filter found.");
        }
      })
      .catch(error => {
        console.error('Error fetching initial current filter:', error);
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
        const response = await fetch(`/api/filters/set_current/${newFilterId}`, {
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

        if ((activeViewType === 'surface') && iframeRef.current) {
            console.log("Reloading iframe for new filter...");
            iframeRef.current.contentWindow?.location.reload();
        }

    } catch (error) {
        console.error('Error updating current filter:', error);
    }
  };

  return (
    <div style={{ display: 'grid', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <iframe
        ref={iframeRef}
        key={activeFilterId}
        src='/api/viewer'
        style={{
            gridArea: '1 / 1 / 2 / 2',
            width: '100%',
            height: '100%',
            border: 'none',
            zIndex: 0,
            marginTop: '64px',
            display: activeViewType === 'surface' ? 'block' : 'none'
        }}
        title={`Pycortex WebGL Viewer`}
       />

      {activeViewType === 'glass' && (
          <div style={{ gridArea: '1 / 1 / 2 / 2', width: '100%', height: 'calc(100% - 64px)', marginTop: '64px', zIndex: 0 }}>
              <GlassBrainViewer />
          </div>
      )}

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

        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 flex flex-col gap-2 p-2 bg-white rounded-r-lg shadow-md" style={{ pointerEvents: 'auto' }}>
           <button
            onClick={() => setActiveViewType('surface')}
            className={`px-3 py-1 text-sm font-medium transition-colors ${
              activeViewType === 'surface'
                ? 'bg-[#2774AE] text-white rounded-md'
                : 'bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400'
            }`}
           >
             Surface View
           </button>
           <button
              onClick={() => setActiveViewType('glass')}
              className={`px-3 py-1 text-sm font-medium transition-colors ${
                activeViewType === 'glass'
                  ? 'bg-[#2774AE] text-white rounded-md'
                  : 'bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400'
              }`}
            >
              Glass Brain
            </button>
         </div>

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