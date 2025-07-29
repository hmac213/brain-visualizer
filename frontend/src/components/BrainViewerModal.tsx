import React from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface BrainViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  niftiId: string;
  title: string;
  dataType: 'mri' | 'tumor' | 'dose';
}

export default function BrainViewerModal({ 
  isOpen, 
  onClose, 
  niftiId, 
  title, 
  dataType 
}: BrainViewerModalProps) {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  if (!isOpen) return null;

  // Construct the viewer URL using the refactored endpoint
  // nifti_dir is 'test_db_nifti' where individual patient files are stored
  const viewerUrl = `/api/viewer/${niftiId}/test_db_nifti`;

  const handleFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div 
        className={`bg-white rounded-lg shadow-xl flex flex-col ${
          isFullscreen 
            ? 'w-full h-full' 
            : 'w-[90vw] h-[80vh] max-w-6xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
            <p className="text-sm text-gray-500 capitalize">
              {dataType} visualization
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleFullscreenToggle}
              className="p-2 hover:bg-gray-200 rounded-md transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-md transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Iframe Container */}
        <div className="flex-1 bg-gray-100 rounded-b-lg overflow-hidden">
          <iframe
            src={viewerUrl}
            className="w-full h-full border-0"
            title={`Brain Viewer - ${title}`}
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      </div>
    </div>
  );
} 