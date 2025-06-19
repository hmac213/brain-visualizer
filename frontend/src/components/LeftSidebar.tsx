import React from 'react';
import { SlidersHorizontal, BarChart3, Brain, Pill, Stethoscope, Loader2, PanelRightClose, PanelRightOpen, Users } from 'lucide-react';

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
}

export default function LeftSidebar(props: LeftSidebarProps) {
  const handleFilterClick = () => {
    if (props.dataShowing) {
      // Close data panel first, then open filter
      props.onDataToggle();
    }
    props.onFilterToggle();
  };

  const handleDataClick = () => {
    if (props.filterShowing) {
      // Close filter panel first, then open data
      props.onFilterToggle();
    }
    props.onDataToggle();
  };

  const handlePatientStatsClick = () => {
    // TODO: Implement patient statistics functionality
    console.log("Patient statistics button clicked");
  };

  const toggleCollapse = () => {
    props.onCollapseChange(!props.isCollapsed);
  };

  return (
    <div className={`fixed left-0 top-0 h-full bg-[#2774AE] flex flex-col items-center py-4 z-50 transition-all duration-300 ${
      props.isCollapsed ? 'w-16' : 'w-48'
    }`}>
      {/* Collapse Toggle Button */}
      <button
        onClick={toggleCollapse}
        className="absolute left-full top-8 ml-4 bg-white text-[#2774AE] rounded-full px-3 py-2 shadow transition-colors z-10 border border-[#2774AE] hover:bg-[#e3eef8]"
        title={props.isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        style={{ borderRadius: '9999px' }}
      >
        {props.isCollapsed ? (
          <PanelRightOpen className="w-5 h-5" />
        ) : (
          <PanelRightClose className="w-5 h-5" />
        )}
      </button>

      {/* Navigation Icons */}
      <div className="flex flex-col space-y-4 w-full px-3">
        {/* Filters Button */}
        <button
          onClick={handleFilterClick}
          className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
            props.isCollapsed ? 'justify-center' : 'justify-start text-left'
          } ${
            props.filterShowing 
              ? 'bg-white text-[#2774AE] shadow' 
              : 'text-white hover:bg-white hover:text-[#2774AE] hover:shadow'
          }`}
          style={{ transition: 'background 0.2s, color 0.2s' }}
          title="Toggle Filters"
        >
          <SlidersHorizontal className="w-6 h-6" />
          {!props.isCollapsed && <span className="text-sm font-medium">Filters</span>}
        </button>

        {/* Charts Button */}
        <button
          onClick={handleDataClick}
          className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
            props.isCollapsed ? 'justify-center' : 'justify-start text-left'
          } ${
            props.dataShowing 
              ? 'bg-white text-[#2774AE] shadow' 
              : 'text-white hover:bg-white hover:text-[#2774AE] hover:shadow'
          }`}
          style={{ transition: 'background 0.2s, color 0.2s' }}
          title="Toggle Charts"
        >
          <BarChart3 className="w-6 h-6" />
          {!props.isCollapsed && <span className="text-sm font-medium">Charts</span>}
        </button>

        {/* Patient Statistics Button */}
        <button
          onClick={handlePatientStatsClick}
          className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
            props.isCollapsed ? 'justify-center' : 'justify-start text-left'
          } text-white hover:bg-white hover:text-[#2774AE] hover:shadow`}
          style={{ transition: 'background 0.2s, color 0.2s' }}
          title="Patient Statistics"
        >
          <Users className="w-6 h-6" />
          {!props.isCollapsed && <span className="text-sm font-medium">Patient Stats</span>}
        </button>
      </div>

      {/* Mask Type Selection */}
      <div className="flex flex-col items-center space-y-3 mt-8 w-full px-3">
        {/* Section Header */}
        <div className="w-full">
          {props.isCollapsed ? (
            <div className="text-white text-[10px] font-medium text-center px-1 leading-tight">
              MASKS
            </div>
          ) : (
            <div className="text-white text-xs font-semibold uppercase tracking-wide border-b border-white/20 pb-2">
              Mask Types
            </div>
          )}
        </div>
        
        {props.isMaskTypeChanging && (
          <div className="flex items-center justify-center py-1">
            <Loader2 className="w-3 h-3 text-white animate-spin" />
          </div>
        )}
        
        {/* Mask Buttons Container */}
        <div className="flex flex-col space-y-2 w-full">
          {/* Tumor Mask */}
          <button
            onClick={() => {
              console.log("Tumor mask button clicked");
              props.onMaskTypeChange('tumor');
            }}
            disabled={props.isMaskTypeChanging}
            className={`flex items-center space-x-3 p-2 rounded-md transition-all duration-200 ${
              props.isCollapsed ? 'justify-center' : 'justify-start text-left'
            } ${
              props.activeMaskType === 'tumor'
                ? 'bg-white text-[#2774AE] shadow-sm' 
                : props.isMaskTypeChanging
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-white hover:bg-white hover:text-[#2774AE] hover:shadow-sm'
            }`}
            style={{ transition: 'background 0.2s, color 0.2s' }}
            title="Tumor Masks"
          >
            <Brain className="w-4 h-4" />
            {!props.isCollapsed && <span className="text-sm">Tumor</span>}
          </button>

          {/* MRI Mask */}
          <button
            onClick={() => {
              console.log("MRI mask button clicked");
              props.onMaskTypeChange('mri');
            }}
            disabled={props.isMaskTypeChanging}
            className={`flex items-center space-x-3 p-2 rounded-md transition-all duration-200 ${
              props.isCollapsed ? 'justify-center' : 'justify-start text-left'
            } ${
              props.activeMaskType === 'mri'
                ? 'bg-white text-[#2774AE] shadow-sm' 
                : props.isMaskTypeChanging
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-white hover:bg-white hover:text-[#2774AE] hover:shadow-sm'
            }`}
            style={{ transition: 'background 0.2s, color 0.2s' }}
            title="MRI Masks"
          >
            <Stethoscope className="w-4 h-4" />
            {!props.isCollapsed && <span className="text-sm">MRI</span>}
          </button>

          {/* Dose Mask */}
          <button
            onClick={() => {
              console.log("Dose mask button clicked");
              props.onMaskTypeChange('dose');
            }}
            disabled={props.isMaskTypeChanging}
            className={`flex items-center space-x-3 p-2 rounded-md transition-all duration-200 ${
              props.isCollapsed ? 'justify-center' : 'justify-start text-left'
            } ${
              props.activeMaskType === 'dose'
                ? 'bg-white text-[#2774AE] shadow-sm' 
                : props.isMaskTypeChanging
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-white hover:bg-white hover:text-[#2774AE] hover:shadow-sm'
            }`}
            style={{ transition: 'background 0.2s, color 0.2s' }}
            title="Dose Masks"
          >
            <Pill className="w-4 h-4" />
            {!props.isCollapsed && <span className="text-sm">Dose</span>}
          </button>
        </div>
      </div>

      {/* Spacer to push logo to bottom */}
      <div className="flex-1"></div>

      {/* UCLA Logo at bottom */}
      <div className="mb-4">
        <img 
          src='/UCLA_logo.svg' 
          className="w-10 h-10 filter brightness-0 invert" 
          alt="UCLA logo" 
        />
      </div>
    </div>
  );
} 