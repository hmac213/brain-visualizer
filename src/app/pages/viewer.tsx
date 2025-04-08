import React, { useState } from 'react';
import { SlidersHorizontal, ChartColumn } from 'lucide-react'
import Filter from '@/components/filter';
import DataView from '@/components/data_views';

export default function Viewer() {
  const [filterShowing, toggleFilter] = useState(false);
  const [dataShowing, toggleData] = useState(false);

  return (
    <div style={{ display: 'grid', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <iframe
        src="http://localhost:5001/api/viewer"  // Adjust the URL/port as needed
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
        
        <Filter filterShowing={filterShowing} toggleFilter={toggleFilter} />
        <DataView dataShowing={dataShowing} toggleData={toggleData} />
      </div>
    </div>
  );
}