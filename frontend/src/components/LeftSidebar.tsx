import React, { forwardRef } from 'react';
import { SlidersHorizontal, BarChart3, Brain, Pill, Stethoscope, Loader2, ChevronLeft, ChevronRight, Users } from 'lucide-react';

interface LeftSidebarProps {
  filterShowing: boolean;
  dataShowing: boolean;
  onFilterToggle: () => void;
  onDataToggle: () => void;
  activeViewType: string;
  onViewTypeChange: (viewType: string) => void;
  activeMaskType: string;
  onMaskTypeChange: (maskType: string) => void;
  isMaskTypeChanging: boolean;
  isCollapsed: boolean;
  onCollapseChange: (collapsed: boolean) => void;
  patientSearchShowing?: boolean;
  onPatientSearchToggle?: () => void;
}

export default forwardRef<HTMLDivElement, LeftSidebarProps>(function LeftSidebar(props, ref) {
  const handleFilterClick = () => {
    if (props.dataShowing) {
      props.onDataToggle();
    }
    props.onFilterToggle();
  };

  const handleDataClick = () => {
    if (props.filterShowing) {
      props.onFilterToggle();
    }
    props.onDataToggle();
  };

  const handlePatientStatsClick = () => {
    if (props.onPatientSearchToggle) {
      props.onPatientSearchToggle();
    }
  };

  const toggleCollapse = () => {
    props.onCollapseChange(!props.isCollapsed);
  };

  return (
    <div ref={ref} className={`fixed left-0 top-0 h-full bg-gradient-to-b from-[#2774AE] to-[#1e5a8a] flex flex-col z-50 transition-all duration-300 ease-in-out shadow-xl ${
      props.isCollapsed ? 'w-20' : 'w-64'
    }`}>
      {/* Header with Logo and Collapse Button */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        {!props.isCollapsed && (
          <div className="flex items-center justify-center flex-1">
            <img 
              src='/UCLA_logo.svg' 
              className="w-16 h-16" 
              alt="UCLA logo" 
            />
          </div>
        )}
        
        {props.isCollapsed && (
          <img 
            src='/UCLA_logo.svg' 
            className="w-10 h-10 mx-auto" 
            alt="UCLA logo" 
          />
        )}
        
        <button
          onClick={toggleCollapse}
          className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-all duration-200 ease-in-out"
          title={props.isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {props.isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation Section */}
      <div className={`flex flex-col space-y-2 ${props.isCollapsed ? 'px-3 py-4' : 'p-4'}`}>
        {!props.isCollapsed && (
          <h3 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2">
            Navigation
          </h3>
        )}
        
        {/* Filters Button */}
        <button
          onClick={handleFilterClick}
          className={`group flex items-center space-x-3 transition-all duration-200 ease-in-out ${
            props.isCollapsed ? 'justify-center p-2.5' : 'justify-start px-3 py-2.5'
          } rounded-xl ${
            props.filterShowing 
              ? 'bg-white/15 text-white border border-white/20 shadow-lg backdrop-blur-sm' 
              : 'text-white/80 hover:text-white hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98]'
          }`}
          title="Toggle Filters"
        >
          <SlidersHorizontal className={`transition-transform group-hover:rotate-3 ${props.isCollapsed ? 'w-6 h-6' : 'w-5 h-5'}`} />
          {!props.isCollapsed && (
            <span className="text-sm font-medium">Filters</span>
          )}
        </button>

        {/* Charts Button */}
        <button
          onClick={handleDataClick}
          className={`group flex items-center space-x-3 transition-all duration-200 ease-in-out ${
            props.isCollapsed ? 'justify-center p-2.5' : 'justify-start px-3 py-2.5'
          } rounded-xl ${
            props.dataShowing 
              ? 'bg-white/15 text-white border border-white/20 shadow-lg backdrop-blur-sm' 
              : 'text-white/80 hover:text-white hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98]'
          }`}
          title="Toggle Charts"
        >
          <BarChart3 className={`transition-transform group-hover:scale-110 ${props.isCollapsed ? 'w-6 h-6' : 'w-5 h-5'}`} />
          {!props.isCollapsed && (
            <span className="text-sm font-medium">Charts</span>
          )}
        </button>

        {/* Patient Statistics Button */}
        <button
          onClick={handlePatientStatsClick}
          className={`group flex items-center space-x-3 transition-all duration-200 ease-in-out ${
            props.isCollapsed ? 'justify-center p-2.5' : 'justify-start px-3 py-2.5'
          } rounded-xl ${
            props.patientSearchShowing
              ? 'bg-white/15 text-white border border-white/20 shadow-lg backdrop-blur-sm'
              : 'text-white/80 hover:text-white hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98]'
          }`}
          title="Patient Statistics"
        >
          <Users className={`transition-transform group-hover:scale-110 ${props.isCollapsed ? 'w-6 h-6' : 'w-5 h-5'}`} />
          {!props.isCollapsed && (
            <span className="text-sm font-medium">Patient Stats</span>
          )}
        </button>
      </div>

      {/* Mask Types Section */}
      <div className={`flex flex-col border-t border-white/10 ${props.isCollapsed ? 'px-3 py-4' : 'p-4'}`}>
        {!props.isCollapsed && (
          <h3 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-3">
            Mask Types
          </h3>
        )}
        
        {props.isCollapsed && (
          <div className="text-white/60 text-[10px] font-medium text-center mb-3 uppercase tracking-wide">
            Masks
          </div>
        )}
        
        {props.isMaskTypeChanging && (
          <div className="flex items-center justify-center py-2 mb-2">
            <Loader2 className="w-4 h-4 text-white/70 animate-spin" />
            {!props.isCollapsed && (
              <span className="ml-2 text-xs text-white/70">Loading...</span>
            )}
          </div>
        )}
        
        <div className="flex flex-col space-y-2">
          {/* Tumor Mask */}
          <button
            onClick={() => props.onMaskTypeChange('tumor')}
            disabled={props.isMaskTypeChanging}
            className={`group flex items-center space-x-2.5 transition-all duration-200 ease-in-out ${
              props.isCollapsed ? 'justify-center p-2' : 'justify-start px-3 py-2'
            } rounded-lg ${
              props.activeMaskType === 'tumor'
                ? 'bg-white/20 text-white border border-white/30 shadow-md' 
                : props.isMaskTypeChanging
                  ? 'text-white/40 cursor-not-allowed'
                  : 'text-white/70 hover:text-white hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98]'
            }`}
            title="Tumor Masks"
          >
            <Brain className={`transition-transform group-hover:scale-110 ${props.isCollapsed ? 'w-6 h-6' : 'w-4 h-4'}`} />
            {!props.isCollapsed && (
              <span className="text-sm font-medium">Tumor</span>
            )}
          </button>

          {/* MRI Mask */}
          <button
            onClick={() => props.onMaskTypeChange('mri')}
            disabled={props.isMaskTypeChanging}
            className={`group flex items-center space-x-2.5 transition-all duration-200 ease-in-out ${
              props.isCollapsed ? 'justify-center p-2' : 'justify-start px-3 py-2'
            } rounded-lg ${
              props.activeMaskType === 'mri'
                ? 'bg-white/20 text-white border border-white/30 shadow-md' 
                : props.isMaskTypeChanging
                  ? 'text-white/40 cursor-not-allowed'
                  : 'text-white/70 hover:text-white hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98]'
            }`}
            title="MRI Masks"
          >
            <Stethoscope className={`transition-transform group-hover:scale-110 ${props.isCollapsed ? 'w-6 h-6' : 'w-4 h-4'}`} />
            {!props.isCollapsed && (
              <span className="text-sm font-medium">MRI</span>
            )}
          </button>

          {/* Dose Mask */}
          <button
            onClick={() => props.onMaskTypeChange('dose')}
            disabled={props.isMaskTypeChanging}
            className={`group flex items-center space-x-2.5 transition-all duration-200 ease-in-out ${
              props.isCollapsed ? 'justify-center p-2' : 'justify-start px-3 py-2'
            } rounded-lg ${
              props.activeMaskType === 'dose'
                ? 'bg-white/20 text-white border border-white/30 shadow-md' 
                : props.isMaskTypeChanging
                  ? 'text-white/40 cursor-not-allowed'
                  : 'text-white/70 hover:text-white hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98]'
            }`}
            title="Dose Masks"
          >
            <Pill className={`transition-transform group-hover:scale-110 ${props.isCollapsed ? 'w-6 h-6' : 'w-4 h-4'}`} />
            {!props.isCollapsed && (
              <span className="text-sm font-medium">Dose</span>
            )}
          </button>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="text-white/40 text-xs text-center">
          {props.isCollapsed ? 'v1.0' : 'Brain Visualizer v1.0'}
        </div>
      </div>
    </div>
  );
}); 