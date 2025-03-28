import React from 'react'

// sample filter categories (replace later with real categories)
const data = {
  origin_cancer: [
    "Lung",
    "Liver",
    "Breast",
    "Colorectal",
    "Melanoma",
    "Renal"
  ],
  tumor_count: [
    "Single",
    "2-3 lesions",
    "4+ lesions"
  ],
  tumor_size: [
    "Small (<1cm)",
    "Medium (1-3cm)",
    "Large (>3cm)"
  ],
  tumor_location: [
    "Frontal Lobe",
    "Parietal Lobe",
    "Temporal Lobe",
    "Occipital Lobe",
    "Cerebellum",
    "Brainstem"
  ],
  patient_age: [
    "<20",
    "21-30",
    "31-40",
    "41-50",
    "51-60",
    "61-70",
    "70+"
  ],
}

interface filterProps {
  showFilter: boolean;
  toggleFilter: React.Dispatch<React.SetStateAction<boolean>>;
  selectedfilters?: any[]; // possible change type; this is so we can display the selected filters
}

export default function Filter(props: filterProps) {
  return (props.showFilter) ? (
    <div className='absolute inset-0'>
      <div className='flex items-center bg-gray-200 m-32 p-4 rounded'>
        <div className='items-center'>
          <h2 className='text-center'>Filter</h2>
        </div>
        <div>
          <h3 className='text-center'>Primary Tumor Origin</h3>
        </div>
        <div>
          <h3 className='text-center'>Tumor Count</h3>
        </div>
        <div>
          <h3 className='text-center'>Tumor Size</h3>
        </div>
        <div>
          <h3 className='text-center'>Tumor Location</h3>
        </div>
        <div>
          <h3 className='text-center'>Patient Age</h3>
        </div>
      </div>
    </div>
  ) : "";
}