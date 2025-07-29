import React, { useState, useEffect } from 'react';
import { Search, X, Maximize2, User, Loader2, ArrowLeft, Calendar, Heart, Ruler, Weight, Activity, Eye, Brain, Pill, Play } from 'lucide-react';
import { useResizable } from '../hooks/useResizable';
import BrainViewerModal from './BrainViewerModal';

interface PatientSearchResult {
  id: string;
  data_count: number;
  display_name: string;
}

interface PatientOverview {
  id: string;
  origin_cancer: string;
  tumor_count: number;
  sex: string;
  height_cm: number;
  weight_kg: number;
  systolic_bp: number;
  diastolic_bp: number;
  date_of_original_diagnosis: string;
  date_of_metastatic_diagnosis: string;
  data_summary: {
    tumor_masks: number;
    mri_masks: number;
    dose_masks: number;
    total_data_points: number;
  };
}

interface MRITimelineItem {
  id: string;
  date: string;
  timepoint: string;
}

interface TumorItem {
  id: string;
  location: string;
  volume_mm3: number;
}

interface TreatmentItem {
  id: string;
  type: string;
  dose?: number;
  volume_mm3?: number;
  date?: string;
}

interface PatientSearchProps {
  patientSearchShowing: boolean;
  togglePatientSearch: React.Dispatch<React.SetStateAction<boolean>>;
  onWidthChange?: (width: number) => void;
  onFullScreenChange?: (isFullScreen: boolean) => void;
  sidebarWidth?: number;
}

export default function PatientSearch(props: PatientSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
  const [patientOverview, setPatientOverview] = useState<PatientOverview | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  
  // Placeholder data for demonstration - replace with actual API calls later
  const [mriTimeline, setMriTimeline] = useState<MRITimelineItem[]>([]);
  const [tumorList, setTumorList] = useState<TumorItem[]>([]);
  const [treatmentList, setTreatmentList] = useState<TreatmentItem[]>([]);

  // Brain viewer modal state
  const [brainViewerOpen, setBrainViewerOpen] = useState(false);
  const [viewerData, setViewerData] = useState<{
    niftiId: string;
    title: string;
    dataType: 'mri' | 'tumor' | 'dose';
  } | null>(null);

  // Resizable functionality
  const { width, isResizing, ResizeHandle } = useResizable({
    initialWidth: 25,
    minWidth: 15,
    maxWidth: 60
  });

  // Notify parent component of width changes for brain scaling
  useEffect(() => {
    if (props.onWidthChange && !isFullScreen) {
      props.onWidthChange(width);
    }
  }, [width, isFullScreen, props.onWidthChange]);

  // Notify parent component of fullscreen state changes
  useEffect(() => {
    if (props.onFullScreenChange) {
      props.onFullScreenChange(isFullScreen);
    }
  }, [isFullScreen, props.onFullScreenChange]);

  // Search patients when search term changes
  useEffect(() => {
    const searchPatients = async () => {
      if (!searchTerm.trim()) {
        setSearchResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/patients/search?q=${encodeURIComponent(searchTerm.trim())}&limit=20`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setSearchResults(data.results || []);
      } catch (error) {
        console.error('Error searching patients:', error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(searchPatients, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handlePatientSelect = async (patient: PatientSearchResult) => {
    setSelectedPatient(patient);
    setIsLoadingOverview(true);
    
    try {
      // Fetch patient overview
      const overviewResponse = await fetch(`/api/patients/${patient.id}/overview`);
      
      if (!overviewResponse.ok) {
        throw new Error(`HTTP error! status: ${overviewResponse.status}`);
      }
      
      const overviewData = await overviewResponse.json();
      setPatientOverview(overviewData);
      
      // Fetch MRI timeline data
      const mriResponse = await fetch(`/api/patients/${patient.id}/mri-timeline`);
      if (mriResponse.ok) {
        const mriData = await mriResponse.json();
        setMriTimeline(mriData.mri_scans || []);
      } else {
        setMriTimeline([]);
      }
      
      // Fetch tumor list data
      const tumorResponse = await fetch(`/api/patients/${patient.id}/tumors`);
      if (tumorResponse.ok) {
        const tumorData = await tumorResponse.json();
        setTumorList(tumorData.tumors || []);
      } else {
        setTumorList([]);
      }
      
      // Fetch treatment data (if available)
      const treatmentResponse = await fetch(`/api/patients/${patient.id}/treatments`);
      if (treatmentResponse.ok) {
        const treatmentData = await treatmentResponse.json();
        setTreatmentList(treatmentData.treatments || []);
      } else {
        setTreatmentList([]);
      }
      
    } catch (error) {
      console.error('Error fetching patient data:', error);
      setPatientOverview(null);
      setMriTimeline([]);
      setTumorList([]);
      setTreatmentList([]);
    } finally {
      setIsLoadingOverview(false);
    }
  };

  const handleBackToSearch = () => {
    setSelectedPatient(null);
    setPatientOverview(null);
    setMriTimeline([]);
    setTumorList([]);
    setTreatmentList([]);
  };

  const handleViewMRI = (mriId: string) => {
    // Find the MRI data for the title
    const mriData = mriTimeline.find(mri => mri.id === mriId);
    const title = mriData ? `MRI - ${formatDate(mriData.date)}` : `MRI Scan`;
    
    setViewerData({
      niftiId: mriId,
      title: title,
      dataType: 'mri'
    });
    setBrainViewerOpen(true);
  };

  const handleViewTumor = (tumorId: string) => {
    // Find the tumor data for the title
    const tumorData = tumorList.find(tumor => tumor.id === tumorId);
    const title = tumorData ? `Tumor - ${tumorData.location}` : `Tumor Mask`;
    
    setViewerData({
      niftiId: tumorId,
      title: title,
      dataType: 'tumor'
    });
    setBrainViewerOpen(true);
  };

  const handleViewTreatment = (treatmentId: string) => {
    // Find the treatment data for the title
    const treatmentData = treatmentList.find(treatment => treatment.id === treatmentId);
    const title = treatmentData ? 
      `Treatment - ${treatmentData.type} (${treatmentData.dose} Gy)` : 
      `Dose Mask`;
    
    setViewerData({
      niftiId: treatmentId,
      title: title,
      dataType: 'dose'
    });
    setBrainViewerOpen(true);
  };

  const handleCloseBrainViewer = () => {
    setBrainViewerOpen(false);
    setViewerData(null);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const calculateAge = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const birthDate = new Date(dateString);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  };

  const calculateBMI = (heightCm: number, weightKg: number) => {
    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);
    return bmi.toFixed(1);
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  };

  return props.patientSearchShowing ? (
    <div
      className={`fixed top-0 h-screen bg-white shadow-lg ${
        !isFullScreen ? '' : 'w-full'
      }`}
      style={{ 
        zIndex: 50, 
        pointerEvents: 'auto',
        left: isFullScreen ? '0' : `${props.sidebarWidth || 64}px`,
        width: isFullScreen ? '100%' : `${width}%`,
        maxHeight: '100vh',
        transition: isResizing ? 'none' : 'all 0.3s ease-in-out'
      }}
    >
      {/* Resize handle - only show when not in fullscreen */}
      {!isFullScreen && <ResizeHandle />}

      <div className='bg-white h-full w-full overflow-hidden flex flex-col max-h-screen'>
        {/* Header */}
        <div className='flex justify-between items-center p-3 border-b flex-shrink-0'>
          <div className='flex items-center space-x-2'>
            {selectedPatient && (
              <button
                onClick={handleBackToSearch}
                className='p-1 hover:bg-gray-100 rounded-md transition-colors'
                title='Back to search'
              >
                <ArrowLeft className='w-4 h-4' />
              </button>
            )}
            <h1 className='text-lg font-semibold'>
              {selectedPatient ? `Patient ${selectedPatient.display_name}` : 'Patient Search'}
            </h1>
          </div>
          <div className='flex items-center space-x-1'>
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className='p-1.5 hover:bg-gray-100 rounded-md transition-colors'
              title={isFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              <Maximize2 className='w-4 h-4' />
            </button>
            <button
              onClick={() => props.togglePatientSearch(false)}
              className='p-1.5 hover:bg-gray-100 rounded-md transition-colors'
              title='Close'
            >
              <X className='w-4 h-4' />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-3 max-h-[calc(100vh-3.5rem)]'>
          {!selectedPatient ? (
            // Search View
            <>
              {/* Search Bar */}
              <div className='relative mb-4'>
                <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                  <Search className='h-5 w-5 text-gray-400' />
                </div>
                <input
                  type='text'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder='Search patient IDs...'
                  className='block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#2774AE] focus:border-[#2774AE] sm:text-sm'
                />
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className='flex items-center justify-center py-8'>
                  <Loader2 className='w-6 h-6 text-[#2774AE] animate-spin' />
                  <span className='ml-2 text-gray-600'>Searching patients...</span>
                </div>
              )}

              {/* Search Results */}
              {!isLoading && searchTerm.trim() && (
                <div className='space-y-2'>
                  <div className='text-sm text-gray-500 mb-2'>
                    {searchResults.length > 0 
                      ? `Found ${searchResults.length} patient${searchResults.length !== 1 ? 's' : ''}`
                      : 'No patients found'
                    }
                  </div>
                  
                  {searchResults.map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => handlePatientSelect(patient)}
                      className='p-3 border border-gray-200 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 hover:border-[#2774AE]'
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-3'>
                          <User className='w-5 h-5 text-[#2774AE]' />
                          <div>
                            <div className='font-medium text-gray-900'>{patient.display_name}</div>
                            <div className='text-sm text-gray-500'>ID: {patient.id}</div>
                          </div>
                        </div>
                        <div className='text-right'>
                          <div className='text-sm font-medium text-gray-900'>{patient.data_count}</div>
                          <div className='text-xs text-gray-500'>data points</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!isLoading && !searchTerm.trim() && (
                <div className='text-center text-gray-500 mt-10'>
                  <Search className='w-12 h-12 mx-auto mb-4 text-gray-300' />
                  <p className='text-sm'>Start typing to search for patients</p>
                  <p className='text-xs mt-1'>Search by patient ID (partial matches supported)</p>
                </div>
              )}
            </>
          ) : (
            // Patient Overview View
            <div className='space-y-6'>
              {isLoadingOverview ? (
                <div className='flex items-center justify-center py-8'>
                  <Loader2 className='w-6 h-6 text-[#2774AE] animate-spin' />
                  <span className='ml-2 text-gray-600'>Loading patient data...</span>
                </div>
              ) : patientOverview ? (
                <>
                  {/* Patient ID */}
                  <div className='bg-gray-50 p-4 rounded-lg'>
                    <div className='text-sm text-gray-500 mb-1'>Patient ID</div>
                    <div className='font-mono text-sm'>{patientOverview.id}</div>
                  </div>

                  {/* Demographics */}
                  <div className='space-y-4'>
                    <h3 className='text-lg font-semibold text-gray-900'>Demographics</h3>
                    <div className='grid grid-cols-2 gap-4'>
                      <div className='space-y-2'>
                        <div className='flex items-center space-x-2'>
                          <User className='w-4 h-4 text-[#2774AE]' />
                          <span className='text-sm font-medium'>Sex</span>
                        </div>
                        <div className='text-sm text-gray-600'>{patientOverview.sex}</div>
                      </div>
                      <div className='space-y-2'>
                        <div className='flex items-center space-x-2'>
                          <Ruler className='w-4 h-4 text-[#2774AE]' />
                          <span className='text-sm font-medium'>Height</span>
                        </div>
                        <div className='text-sm text-gray-600'>{patientOverview.height_cm} cm</div>
                      </div>
                      <div className='space-y-2'>
                        <div className='flex items-center space-x-2'>
                          <Weight className='w-4 h-4 text-[#2774AE]' />
                          <span className='text-sm font-medium'>Weight</span>
                        </div>
                        <div className='text-sm text-gray-600'>{patientOverview.weight_kg} kg</div>
                      </div>
                      <div className='space-y-2'>
                        <div className='flex items-center space-x-2'>
                          <Activity className='w-4 h-4 text-[#2774AE]' />
                          <span className='text-sm font-medium'>BMI</span>
                        </div>
                        <div className='text-sm text-gray-600'>
                          {calculateBMI(patientOverview.height_cm, patientOverview.weight_kg)} 
                          <span className='text-xs text-gray-500 ml-1'>
                            ({getBMICategory(parseFloat(calculateBMI(patientOverview.height_cm, patientOverview.weight_kg)))})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Medical Information */}
                  <div className='space-y-4'>
                    <h3 className='text-lg font-semibold text-gray-900'>Medical Information</h3>
                    <div className='space-y-3'>
                      <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                        <span className='text-sm font-medium'>Origin Cancer</span>
                        <span className='text-sm text-gray-600'>{patientOverview.origin_cancer}</span>
                      </div>
                      <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                        <span className='text-sm font-medium'>Tumor Count</span>
                        <span className='text-sm text-gray-600'>{patientOverview.tumor_count}</span>
                      </div>
                      <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                        <span className='text-sm font-medium'>Blood Pressure</span>
                        <span className='text-sm text-gray-600'>
                          {patientOverview.systolic_bp}/{patientOverview.diastolic_bp} mmHg
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Diagnosis Dates */}
                  <div className='space-y-4'>
                    <h3 className='text-lg font-semibold text-gray-900'>Diagnosis Timeline</h3>
                    <div className='space-y-3'>
                      <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                        <div className='flex items-center space-x-2'>
                          <Calendar className='w-4 h-4 text-[#2774AE]' />
                          <span className='text-sm font-medium'>Original Diagnosis</span>
                        </div>
                        <span className='text-sm text-gray-600'>
                          {formatDate(patientOverview.date_of_original_diagnosis)}
                        </span>
                      </div>
                      <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                        <div className='flex items-center space-x-2'>
                          <Calendar className='w-4 h-4 text-[#2774AE]' />
                          <span className='text-sm font-medium'>Metastatic Diagnosis</span>
                        </div>
                        <span className='text-sm text-gray-600'>
                          {formatDate(patientOverview.date_of_metastatic_diagnosis)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* MRI Timeline */}
                  <div className='space-y-4'>
                    <div className="flex justify-between items-center">
                      <h3 className='text-lg font-semibold text-gray-900'>MRI Timeline</h3>
                      <button
                        // onClick={() => handlePlayMRI()} // Add your onClick handler here
                        className='p-2 text-[#2774AE] hover:bg-[#2774AE] hover:text-white rounded-md transition-colors'
                        title='Play MRI Timeline'
                      >
                        <Play className='w-4 h-4' />
                      </button>
                    </div>
                    {mriTimeline.length > 0 ? (
                      <div className='space-y-2'>
                        {mriTimeline.map((mri) => (
                          <div key={mri.id} className='flex items-center justify-between p-3 bg-blue-50 rounded-lg'>
                            <div className='flex items-center space-x-3'>
                              <Calendar className='w-4 h-4 text-[#2774AE]' />
                              <div>
                                <div className='text-sm font-medium text-gray-900'>{formatDate(mri.date)}</div>
                                <div className='text-xs text-gray-500'>{mri.timepoint}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleViewMRI(mri.id)}
                              className='p-2 text-[#2774AE] hover:bg-[#2774AE] hover:text-white rounded-md transition-colors'
                              title='View MRI'
                            >
                              <Eye className='w-4 h-4' />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className='text-center text-gray-500 py-4'>
                        <p className='text-sm'>No MRI data available</p>
                      </div>
                    )}
                  </div>

                  {/* Tumor Summary */}
                  <div className='space-y-4'>
                    <div className="flex justify-between items-center">
                      <h3 className='text-lg font-semibold text-gray-900'>Tumor Summary</h3>
                      <button
                        // onClick={() => handlePlayTumor()} // Add your onClick handler here
                        className='p-2 text-green-600 hover:bg-green-600 hover:text-white rounded-md transition-colors'
                        title='Play Tumor Timeline'
                      >
                        <Play className='w-4 h-4' />
                      </button>
                    </div>
                    {tumorList.length > 0 ? (
                      <div className='space-y-2'>
                        {tumorList.map((tumor) => (
                          <div key={tumor.id} className='flex items-center justify-between p-3 bg-green-50 rounded-lg'>
                            <div className='flex items-center space-x-3'>
                              <Brain className='w-4 h-4 text-green-600' />
                              <div>
                                <div className='text-sm font-medium text-gray-900'>{tumor.location}</div>
                                <div className='text-xs text-gray-500'>{tumor.volume_mm3} mm³</div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleViewTumor(tumor.id)}
                              className='p-2 text-green-600 hover:bg-green-600 hover:text-white rounded-md transition-colors'
                              title='View Tumor'
                            >
                              <Eye className='w-4 h-4' />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className='text-center text-gray-500 py-4'>
                        <p className='text-sm'>No tumor data available</p>
                      </div>
                    )}
                  </div>

                  {/* Treatment Summary */}
                  <div className='space-y-4'>
                    <div className="flex justify-between items-center">
                      <h3 className='text-lg font-semibold text-gray-900'>Treatment Summary</h3>
                      <button
                        // onClick={() => handlePlayTreatment()} // Add your onClick handler here
                        className='p-2 text-purple-600 hover:bg-purple-600 hover:text-white rounded-md transition-colors'
                        title='Play Treatment Timeline'
                      >
                        <Play className='w-4 h-4' />
                      </button>
                    </div>
                    {treatmentList.length > 0 ? (
                      <div className='space-y-2'>
                        {treatmentList.map((treatment) => (
                          <div key={treatment.id} className='flex items-center justify-between p-3 bg-purple-50 rounded-lg'>
                            <div className='flex items-center space-x-3'>
                              <Pill className='w-4 h-4 text-purple-600' />
                              <div>
                                <div className='text-sm font-medium text-gray-900'>{treatment.type}</div>
                                <div className='text-xs text-gray-500'>
                                  {treatment.dose && `${treatment.dose} Gy`}
                                  {treatment.volume_mm3 && ` • ${treatment.volume_mm3.toFixed(1)} mm³`}
                                  {treatment.date && ` • ${formatDate(treatment.date)}`}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleViewTreatment(treatment.id)}
                              className='p-2 text-purple-600 hover:bg-purple-600 hover:text-white rounded-md transition-colors'
                              title='View Treatment'
                            >
                              <Eye className='w-4 h-4' />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className='text-center text-gray-500 py-4'>
                        <p className='text-sm'>No treatment data available</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className='text-center text-gray-500 py-8'>
                  <User className='w-12 h-12 mx-auto mb-4 text-gray-300' />
                  <p className='text-sm'>Failed to load patient data</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Brain Viewer Modal */}
      {viewerData && (
        <BrainViewerModal
          isOpen={brainViewerOpen}
          onClose={handleCloseBrainViewer}
          niftiId={viewerData.niftiId}
          title={viewerData.title}
          dataType={viewerData.dataType}
        />
      )}
    </div>
  ) : null;
} 