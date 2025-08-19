'use client';

import React, { useState, useEffect, useRef } from 'react';
import Filter from '@/components/filter';
import DataView from '@/components/DataView';
import PatientSearch from '@/components/PatientSearch';
import LeftSidebar from '@/components/LeftSidebar';
import dynamic from 'next/dynamic';

const DynamicFilter = dynamic(() => import('@/components/filter'), {
  ssr: false
});

const GlassBrainViewer = dynamic(() => import('@/components/GlassBrainViewer'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center">Loading 3D Viewer...</div>,
});

export default function Viewer() {
  const [filterShowing, setFilterShowing] = useState(false);
  const [dataShowing, setDataShowing] = useState(false);
  const [patientSearchShowing, setPatientSearchShowing] = useState(false);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const [filterWidth, setFilterWidth] = useState(25);
  const [dataWidth, setDataWidth] = useState(25);
  const [patientSearchWidth, setPatientSearchWidth] = useState(25);
  const [isFilterFullScreen, setIsFilterFullScreen] = useState(false);
  const [isDataFullScreen, setIsDataFullScreen] = useState(false);
  const [isPatientSearchFullScreen, setIsPatientSearchFullScreen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeViewType, setActiveViewType] = useState<string>('surface');
  const [activeMaskType, setActiveMaskType] = useState<string>('tumor');
  const [isMaskTypeChanging, setIsMaskTypeChanging] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);
  const [iframeTranslateX, setIframeTranslateX] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    fetch(`/api/filters/get_current`, {
      credentials: 'include'  // Include session cookies
    })
      .then(response => response.json())
      .then(data => {
        if (data && Object.keys(data).length > 0) {
          const initialId = Object.keys(data)[0];
          setActiveFilterId(initialId);
        }
      })
      .catch(error => {
        console.error('Error fetching initial current filter:', error);
      });
  }, []);

  const handleFilterChange = async (newFilterId: string, maskType?: string) => {
    if (newFilterId === activeFilterId && (!maskType || maskType === activeMaskType)) {
        return;
    }

    setActiveFilterId(newFilterId);
    
    if (maskType) {
      setActiveMaskType(maskType);
    }

    try {
        const response = await fetch(`/api/filters/set_current/${newFilterId}?maskType=${maskType || activeMaskType}`, {
            method: 'PUT',
            headers: {
                'Accept': 'application/json'
            },
            credentials: 'include'  // Include session cookies
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to set current filter: ${errorData.error || response.statusText}`);
        }

        const result = await response.json();

        // Trigger refresh for both viewers
        setRefreshTrigger(prev => prev + 1);
        
        if (iframeRef.current) {
            iframeRef.current.contentWindow?.location.reload();
        }

    } catch (error) {
        console.error('Error updating current filter:', error);
    }
  };

  const handleMaskTypeChange = async (newMaskType: string) => {
    if (newMaskType !== activeMaskType && !isMaskTypeChanging) {
      setIsMaskTypeChanging(true);
      setActiveMaskType(newMaskType);
      
      try {
        if (activeFilterId) {
          await handleFilterChange(activeFilterId, newMaskType);
        } else {
          // If no active filter, just trigger a refresh
          setRefreshTrigger(prev => prev + 1);
        }
      } catch (error) {
        console.error("Error changing mask type:", error);
      } finally {
        setIsMaskTypeChanging(false);
      }
    }
  };

  const handleViewTypeChange = (newViewType: string) => {
    setActiveViewType(newViewType);
  };

  const toggleFilter = () => {
    if (dataShowing) setDataShowing(false);
    if (patientSearchShowing) setPatientSearchShowing(false);
    setFilterShowing(!filterShowing);
  };

  const toggleData = () => {
    if (filterShowing) setFilterShowing(false);
    if (patientSearchShowing) setPatientSearchShowing(false);
    setDataShowing(!dataShowing);
  };

  const togglePatientSearch = () => {
    if (filterShowing) setFilterShowing(false);
    if (dataShowing) setDataShowing(false);
    setPatientSearchShowing(!patientSearchShowing);
  };

  useEffect(() => {
    let activePanelWidthVw = 0;
    if (filterShowing) {
      activePanelWidthVw = isFilterFullScreen ? 100 : filterWidth;
    } else if (dataShowing) {
      activePanelWidthVw = isDataFullScreen ? 100 : dataWidth;
    } else if (patientSearchShowing) {
      activePanelWidthVw = isPatientSearchFullScreen ? 100 : patientSearchWidth;
    }

    const translateXVw = activePanelWidthVw / 2;
    setIframeTranslateX(translateXVw);
  }, [
    filterShowing, dataShowing, patientSearchShowing,
    filterWidth, dataWidth, patientSearchWidth,
    isFilterFullScreen, isDataFullScreen, isPatientSearchFullScreen
  ]);

  if (!isClient) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const sidebarWidth = sidebarCollapsed ? 80 : 256; 

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <LeftSidebar
        ref={sidebarRef}
        filterShowing={filterShowing}
        dataShowing={dataShowing}
        patientSearchShowing={patientSearchShowing}
        onFilterToggle={toggleFilter}
        onDataToggle={toggleData}
        onPatientSearchToggle={togglePatientSearch}
        activeViewType={activeViewType}
        onViewTypeChange={handleViewTypeChange}
        activeMaskType={activeMaskType}
        onMaskTypeChange={handleMaskTypeChange}
        isMaskTypeChanging={isMaskTypeChanging}
        isCollapsed={sidebarCollapsed}
        onCollapseChange={setSidebarCollapsed}
      />

      <main 
        ref={mainContentRef}
        className="flex-1 flex flex-col relative transition-all duration-300 ease-in-out"
        style={{ marginLeft: sidebarWidth }}
      >
        {activeViewType === 'surface' ? (
          <iframe
            ref={iframeRef}
            src="/api/viewer"
            key={`${activeFilterId}-${activeMaskType}-${refreshTrigger}`}
            className="w-full h-full border-none transition-transform duration-300 ease-in-out"
            title="Brain Viewer"
            style={{ transform: `translateX(${iframeTranslateX}vw)` }}
          />
        ) : (
          <div 
            className="w-full h-full transition-transform duration-300 ease-in-out" 
            style={{ transform: `translateX(${iframeTranslateX}vw)` }}
          >
            <GlassBrainViewer 
              key={`${activeFilterId}-${activeMaskType}-${refreshTrigger}`}
              refreshTrigger={refreshTrigger} 
            />
          </div>
        )}
      </main>

      <div>
        {filterShowing && (
          <DynamicFilter
            filterShowing={filterShowing}
            toggleFilter={setFilterShowing}
            activeFilterId={activeFilterId}
            onFilterChange={handleFilterChange}
            onWidthChange={setFilterWidth}
            onFullScreenChange={setIsFilterFullScreen}
            activeMaskType={activeMaskType}
            sidebarWidth={sidebarWidth}
          />
        )}

        {dataShowing && (
          <DataView
            dataShowing={dataShowing}
            toggleData={setDataShowing}
            onWidthChange={setDataWidth}
            onFullScreenChange={setIsDataFullScreen}
            sidebarWidth={sidebarWidth}
          />
        )}

        {patientSearchShowing && (
          <PatientSearch
            patientSearchShowing={patientSearchShowing}
            togglePatientSearch={setPatientSearchShowing}
            onWidthChange={setPatientSearchWidth}
            onFullScreenChange={setIsPatientSearchFullScreen}
            sidebarWidth={sidebarWidth}
          />
        )}
      </div>
    </div>
  );
} 