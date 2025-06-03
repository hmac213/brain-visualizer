import React from 'react';
import { SlidersHorizontal, BarChart3 } from 'lucide-react';

interface LeftSidebarProps {
  filterShowing: boolean;
  dataShowing: boolean;
  onFilterToggle: () => void;
  onDataToggle: () => void;
  activeViewType: string;
  onViewTypeChange: (viewType: string) => void;
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
    <div className="fixed left-0 top-0 h-full w-16 bg-[#2774AE] flex flex-col items-center py-4 z-30">
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