import React from 'react';
import { SlidersHorizontal, BarChart3, Brain, Pill, Stethoscope, Loader2 } from 'lucide-react';

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

  return (
    <div className="fixed left-0 top-0 h-full w-16 bg-[#2774AE] flex flex-col items-center py-4 z-50">
      {/* Navigation Icons */}
      <div className="flex flex-col space-y-4">
        {/* Filters Button */}
        <button
          onClick={handleFilterClick}
          className={`p-3 rounded-lg transition-colors ${
            props.filterShowing 
              ? 'bg-white text-[#2774AE]' 
              : 'text-white hover:bg-white hover:text-[#2774AE]'
          }`}
          title="Toggle Filters"
        >
          <SlidersHorizontal className="w-6 h-6" />
        </button>

        {/* Charts Button */}
        <button
          onClick={handleDataClick}
          className={`p-3 rounded-lg transition-colors ${
            props.dataShowing 
              ? 'bg-white text-[#2774AE]' 
              : 'text-white hover:bg-white hover:text-[#2774AE]'
          }`}
          title="Toggle Charts"
        >
          <BarChart3 className="w-6 h-6" />
        </button>
      </div>

      {/* Mask Type Selection */}
      <div className="flex flex-col items-center space-y-2 mt-6">
        <div className="text-white text-[10px] font-medium text-center px-1 leading-tight">
          MASKS
        </div>
        
        {props.isMaskTypeChanging && (
          <div className="flex items-center justify-center py-1">
            <Loader2 className="w-3 h-3 text-white animate-spin" />
          </div>
        )}
        
        {/* Tumor Mask */}
        <button
          onClick={() => {
            console.log("Tumor mask button clicked");
            props.onMaskTypeChange('tumor');
          }}
          disabled={props.isMaskTypeChanging}
          className={`p-2 rounded-md transition-all duration-200 ${
            props.activeMaskType === 'tumor'
              ? 'bg-white text-[#2774AE] shadow-sm' 
              : props.isMaskTypeChanging
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-white hover:bg-white hover:text-[#2774AE] hover:shadow-sm'
          }`}
          title="Tumor Masks"
        >
          <Brain className="w-4 h-4" />
        </button>

        {/* MRI Mask */}
        <button
          onClick={() => {
            console.log("MRI mask button clicked");
            props.onMaskTypeChange('mri');
          }}
          disabled={props.isMaskTypeChanging}
          className={`p-2 rounded-md transition-all duration-200 ${
            props.activeMaskType === 'mri'
              ? 'bg-white text-[#2774AE] shadow-sm' 
              : props.isMaskTypeChanging
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-white hover:bg-white hover:text-[#2774AE] hover:shadow-sm'
          }`}
          title="MRI Masks"
        >
          <Stethoscope className="w-4 h-4" />
        </button>

        {/* Dose Mask */}
        <button
          onClick={() => {
            console.log("Dose mask button clicked");
            props.onMaskTypeChange('dose');
          }}
          disabled={props.isMaskTypeChanging}
          className={`p-2 rounded-md transition-all duration-200 ${
            props.activeMaskType === 'dose'
              ? 'bg-white text-[#2774AE] shadow-sm' 
              : props.isMaskTypeChanging
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-white hover:bg-white hover:text-[#2774AE] hover:shadow-sm'
          }`}
          title="Dose Masks"
        >
          <Pill className="w-4 h-4" />
        </button>
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