import React, { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react'
import Filter from '@/components/filter';

export default function Viewer() {
  const [filterShowing, toggleFilter] = useState(false);

  return (
    <div style={{ display: 'grid', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <iframe
        src="http://localhost:5001/api/viewer"  // Adjust the URL/port as needed
        style={{ gridArea: '1 / 1 / 2 / 2', width: '100%', height: '100%', border: 'none', zIndex: 0 }}
        title="Pycortex WebGL Viewer"
      />
      <div style={{ gridArea: '1 / 1 / 2 / 2', width: '100%', height: '100%', border: 'none', zIndex: 10, pointerEvents: 'none' }}>
        <button
          onClick={() => toggleFilter(prev => !prev)}
          style={{ pointerEvents: 'auto' }}
          className="m-4 p-1 bg-white rounded shadow"
        >
          <SlidersHorizontal color="#6e6e6e" />
        </button>
        <Filter showFilter={filterShowing} toggleFilter={toggleFilter}  />
      </div>
    </div>
  );
}