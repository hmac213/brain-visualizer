'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SlidersHorizontal, ChartColumn } from 'lucide-react'
import Filter from '@/components/filter';
import DataView from '@/components/data_views';
import GlassBrainViewer from '@/components/GlassBrainViewer';
import LeftSidebar from '@/components/LeftSidebar';
import dynamic from 'next/dynamic';

// Use dynamic import for the Filter component to avoid hydration issues
const DynamicFilter = dynamic(() => import('@/components/filter'), {
  ssr: false
});

export default function Viewer() {
  const [filterShowing, setFilterShowing] = useState(false);
  const [dataShowing, setDataShowing] = useState(false);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const [filterWidth, setFilterWidth] = useState(25);
  const [dataWidth, setDataWidth] = useState(25);
  const [isFilterFullScreen, setIsFilterFullScreen] = useState(false);
  const [isDataFullScreen, setIsDataFullScreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [activeViewType, setActiveViewType] = useState<string>('surface');
  const [isClient, setIsClient] = useState(false);

  // Set isClient to true when component mounts - avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

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

  // Toggle functions that ensure only one panel is open at a time
  const toggleFilter = () => {
    if (dataShowing) {
      setDataShowing(false);
      setIsDataFullScreen(false); // Reset data fullscreen when closing
    }
    const newFilterShowing = !filterShowing;
    setFilterShowing(newFilterShowing);
    // If closing filter panel, reset its fullscreen state
    if (!newFilterShowing) {
      setIsFilterFullScreen(false);
    }
  };

  const toggleData = () => {
    if (filterShowing) {
      setFilterShowing(false);
      setIsFilterFullScreen(false); // Reset filter fullscreen when closing
    }
    const newDataShowing = !dataShowing;
    setDataShowing(newDataShowing);
    // If closing data panel, reset its fullscreen state
    if (!newDataShowing) {
      setIsDataFullScreen(false);
    }
  };

  // Early return during server-side rendering
  if (!isClient) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Calculate responsive transforms based on current panel width and left sidebar
  const getResponsiveStyle = () => {
    // In fullscreen mode (panel showing AND fullscreen), no left sidebar offset needed
    if ((filterShowing && isFilterFullScreen) || (dataShowing && isDataFullScreen)) {
      return {
        transition: 'transform 0.3s ease-in-out',
        transformOrigin: 'center center',
        transform: 'translateX(0%)',
      };
    }

    const leftSidebarWidthRem = 4; // 4rem = 64px for the left sidebar
    const leftSidebarWidthPercent = (leftSidebarWidthRem * 16) / window.innerWidth * 100; // Convert to percentage

    if (filterShowing || dataShowing) {
      const currentWidth = filterShowing ? filterWidth : dataWidth;
      // Add half the panel width to the base translate to keep centered
      const totalTranslatePercent = leftSidebarWidthPercent + (currentWidth / 2);
      
      return {
        transition: 'transform 0.3s ease-in-out',
        transformOrigin: 'center center',
        transform: `translateX(${totalTranslatePercent}%)`,
      };
    }
    return {
      transition: 'transform 0.3s ease-in-out',
      transformOrigin: 'center center',
      transform: `translateX(${leftSidebarWidthPercent}%)`,
    };
  };

  const responsiveStyle = getResponsiveStyle();

  return (
    <div style={{ display: 'grid', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Left Sidebar - hide only when any panel is both showing AND in fullscreen */}
      {!(filterShowing && isFilterFullScreen) && !(dataShowing && isDataFullScreen) && (
        <LeftSidebar
          filterShowing={filterShowing}
          dataShowing={dataShowing}
          onFilterToggle={toggleFilter}
          onDataToggle={toggleData}
          activeViewType={activeViewType}
          onViewTypeChange={setActiveViewType}
        />
      )}

      {/* Brain Views */}
      {activeViewType === 'surface' && (
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
              ...responsiveStyle
          }}
          title={`Pycortex WebGL Viewer`}
        />
      )}

      {activeViewType === 'glass' && (
          <div 
            style={{ 
              gridArea: '1 / 1 / 2 / 2', 
              width: '100%', 
              height: '100%', 
              zIndex: 0,
              ...responsiveStyle
            }}
          >
              <GlassBrainViewer />
          </div>
      )}

      {/* Panel Container */}
      <div style={{ gridArea: '1 / 1 / 2 / 2', width: '100%', height: '100%', border: 'none', zIndex: 10, pointerEvents: 'none' }}>
        <DynamicFilter
          filterShowing={filterShowing}
          toggleFilter={setFilterShowing}
          activeFilterId={activeFilterId}
          onFilterChange={handleFilterChange}
          onWidthChange={setFilterWidth}
          onFullScreenChange={setIsFilterFullScreen}
        />
        <DataView 
          dataShowing={dataShowing} 
          toggleData={setDataShowing}
          onWidthChange={setDataWidth}
          onFullScreenChange={setIsDataFullScreen}
        />
      </div>
    </div>
  );
} 