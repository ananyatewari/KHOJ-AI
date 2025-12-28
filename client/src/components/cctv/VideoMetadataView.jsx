import React, { useState, useEffect } from "react";
import axios from "axios";
import io from "socket.io-client";

const VideoMetadataView = ({ videoId, user }) => {
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    let pollInterval;
    let socket;

    const initializeMetadata = async () => {
      await fetchVideoMetadata();

      // Setup Socket.IO listener for metadata extraction completion
      socket = io("http://localhost:3000");
      
      socket.on("cctv:metadata_extracted", (data) => {
        if (data.videoId === videoId) {
          console.log("Metadata extraction completed:", data);
          setExtracting(false);
          fetchVideoMetadata(); // Refresh video data
        }
      });
    };

    initializeMetadata();

    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [videoId]);

  const fetchVideoMetadata = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`/api/cctv/${videoId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setVideo(response.data);
      
      // Check if metadata extraction is still in progress
      if (!response.data.videoMetadata?.comprehensive || Object.keys(response.data.videoMetadata.comprehensive).length === 0) {
        setExtracting(true);
      } else {
        setExtracting(false);
      }
      
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load video metadata");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading metadata...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        {error}
      </div>
    );
  }

  // Helper functions
  const getQualityColor = (quality) => {
    switch (quality) {
      case "excellent":
        return "text-green-600 bg-green-100";
      case "good":
        return "text-blue-600 bg-blue-100";
      case "fair":
        return "text-yellow-600 bg-yellow-100";
      case "poor":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "N/A";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  if (!video || !video.videoMetadata) {
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
        <div className="flex items-center">
          {extracting && (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600 mr-3"></div>
          )}
          <div>
            <p className="font-semibold">Metadata Extraction In Progress</p>
            <p className="text-sm mt-1">
              Extracting video metadata. This typically takes a few seconds.
              The page will automatically update when extraction is complete.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const metadata = video.videoMetadata;
  const comprehensive = metadata.comprehensive || {};
  const analysis = comprehensive.analysis || {};

  // Calculate additional metrics
  const calculateBitrate = () => {
    if (metadata.size && metadata.duration) {
      const bitrate = (metadata.size * 8) / metadata.duration; // bits per second
      return (bitrate / 1000000).toFixed(2); // Convert to Mbps
    }
    return 'N/A';
  };

  const getResolutionCategory = () => {
    const pixels = metadata.width * metadata.height;
    if (pixels >= 3840 * 2160) return '4K Ultra HD';
    if (pixels >= 2560 * 1440) return '2K QHD';
    if (pixels >= 1920 * 1080) return 'Full HD 1080p';
    if (pixels >= 1280 * 720) return 'HD 720p';
    if (pixels >= 854 * 480) return 'SD 480p';
    return 'Low Resolution';
  };

  const getCCTVSuitability = () => {
    const pixels = metadata.width * metadata.height;
    const bitrateMbps = calculateBitrate();
    
    if (pixels >= 1920 * 1080 && bitrateMbps >= 4) {
      return { rating: 'Excellent', color: 'text-green-600', message: 'Ideal for CCTV analysis with high detail capture' };
    } else if (pixels >= 1280 * 720 && bitrateMbps >= 2) {
      return { rating: 'Good', color: 'text-blue-600', message: 'Suitable for most CCTV analysis tasks' };
    } else if (pixels >= 854 * 480) {
      return { rating: 'Fair', color: 'text-yellow-600', message: 'Acceptable but may miss fine details' };
    }
    return { rating: 'Poor', color: 'text-red-600', message: 'Low quality may limit analysis accuracy' };
  };

  const suitability = getCCTVSuitability();

  // Check if we have AI-extracted intelligence
  const hasIntelligence = video.intelligence && Object.keys(video.intelligence).length > 0;

  if (hasIntelligence) {
    const intel = video.intelligence;
    
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Threat Level Banner */}
        <div className={`p-4 rounded-lg mb-6 border-l-4 ${
          intel.threatLevel === 'high' ? 'bg-red-50 border-red-500' :
          intel.threatLevel === 'medium' ? 'bg-yellow-50 border-yellow-500' :
          intel.threatLevel === 'low' ? 'bg-blue-50 border-blue-500' :
          'bg-green-50 border-green-500'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-lg font-bold ${
                intel.threatLevel === 'high' ? 'text-red-800' :
                intel.threatLevel === 'medium' ? 'text-yellow-800' :
                intel.threatLevel === 'low' ? 'text-blue-800' :
                'text-green-800'
              }`}>
                {intel.threatLevel?.toUpperCase() || 'UNKNOWN'} THREAT LEVEL
              </h3>
              <p className={`text-sm mt-1 ${
                intel.threatLevel === 'high' ? 'text-red-700' :
                intel.threatLevel === 'medium' ? 'text-yellow-700' :
                intel.threatLevel === 'low' ? 'text-blue-700' :
                'text-green-700'
              }`}>
                {intel.incidentType || 'Incident classification pending'}
              </p>
            </div>
            <div className={`px-4 py-2 rounded-full font-bold ${
              intel.threatLevel === 'high' ? 'bg-red-100 text-red-800' :
              intel.threatLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              intel.threatLevel === 'low' ? 'bg-blue-100 text-blue-800' :
              'bg-green-100 text-green-800'
            }`}>
              {intel.threatLevel?.toUpperCase() || 'NONE'}
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        {intel.summary && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Executive Summary</h3>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
              <p className="text-gray-800">{intel.summary}</p>
            </div>
          </div>
        )}

        {/* Key Findings */}
        {intel.keyFindings && intel.keyFindings.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Findings</h3>
            <div className="space-y-2">
              {intel.keyFindings.map((finding, idx) => (
                <div key={idx} className="flex items-start bg-white border-2 border-gray-200 p-3 rounded-lg">
                  <svg className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <p className="text-sm text-gray-700">{finding}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Entities Detected */}
        {intel.entitiesDetected && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Entities Detected</h3>
            <div className="grid grid-cols-2 gap-4">
              {intel.entitiesDetected.persons && intel.entitiesDetected.persons.length > 0 && (
                <div className="bg-purple-50 border-2 border-purple-200 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <svg className="h-5 w-5 text-purple-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <h4 className="font-semibold text-purple-900">Persons</h4>
                  </div>
                  <ul className="space-y-1">
                    {intel.entitiesDetected.persons.map((person, idx) => (
                      <li key={idx} className="text-sm text-purple-800">• {person}</li>
                    ))}
                  </ul>
                </div>
              )}
              {intel.entitiesDetected.vehicles && intel.entitiesDetected.vehicles.length > 0 && (
                <div className="bg-orange-50 border-2 border-orange-200 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <svg className="h-5 w-5 text-orange-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <h4 className="font-semibold text-orange-900">Vehicles</h4>
                  </div>
                  <ul className="space-y-1">
                    {intel.entitiesDetected.vehicles.map((vehicle, idx) => (
                      <li key={idx} className="text-sm text-orange-800">• {vehicle}</li>
                    ))}
                  </ul>
                </div>
              )}
              {intel.entitiesDetected.objects && intel.entitiesDetected.objects.length > 0 && (
                <div className="bg-green-50 border-2 border-green-200 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <svg className="h-5 w-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <h4 className="font-semibold text-green-900">Objects</h4>
                  </div>
                  <ul className="space-y-1">
                    {intel.entitiesDetected.objects.map((obj, idx) => (
                      <li key={idx} className="text-sm text-green-800">• {obj}</li>
                    ))}
                  </ul>
                </div>
              )}
              {intel.entitiesDetected.locations && intel.entitiesDetected.locations.length > 0 && (
                <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <h4 className="font-semibold text-blue-900">Locations</h4>
                  </div>
                  <ul className="space-y-1">
                    {intel.entitiesDetected.locations.map((loc, idx) => (
                      <li key={idx} className="text-sm text-blue-800">• {loc}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Agency Alerts */}
        {intel.agencyAlerts && intel.agencyAlerts.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Inter-Agency Alerts</h3>
            <div className="space-y-3">
              {intel.agencyAlerts.map((alert, idx) => (
                <div key={idx} className={`p-4 rounded-lg border-l-4 ${
                  alert.priority === 'high' ? 'bg-red-50 border-red-500' :
                  alert.priority === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                  'bg-blue-50 border-blue-500'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`font-bold ${
                      alert.priority === 'high' ? 'text-red-900' :
                      alert.priority === 'medium' ? 'text-yellow-900' :
                      'text-blue-900'
                    }`}>{alert.agency}</h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      alert.priority === 'high' ? 'bg-red-100 text-red-800' :
                      alert.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {alert.priority?.toUpperCase()} PRIORITY
                    </span>
                  </div>
                  <p className={`text-sm ${
                    alert.priority === 'high' ? 'text-red-700' :
                    alert.priority === 'medium' ? 'text-yellow-700' :
                    'text-blue-700'
                  }`}>{alert.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {intel.recommendations && intel.recommendations.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Actionable Recommendations</h3>
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200">
              <ol className="space-y-2">
                {intel.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 mt-0.5">{idx + 1}</span>
                    <p className="text-sm text-gray-800">{rec}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {/* Cross-Reference Opportunities */}
        {intel.crossReferenceOpportunities && intel.crossReferenceOpportunities.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Cross-Reference Opportunities</h3>
            <div className="space-y-2">
              {intel.crossReferenceOpportunities.map((opp, idx) => (
                <div key={idx} className="flex items-start bg-amber-50 border-2 border-amber-200 p-3 rounded-lg">
                  <svg className="h-5 w-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <p className="text-sm text-amber-900">{opp}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detection Statistics */}
        {intel.detectionStats && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Detection Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                <p className="text-sm text-gray-600">Total Frames</p>
                <p className="text-2xl font-bold text-gray-900">{intel.detectionStats.totalFrames || 0}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                <p className="text-sm text-gray-600">Objects Detected</p>
                <p className="text-2xl font-bold text-gray-900">{intel.detectionStats.totalObjects || 0}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                <p className="text-sm text-gray-600">Unique Classes</p>
                <p className="text-2xl font-bold text-gray-900">{intel.detectionStats.uniqueClasses?.length || 0}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                <p className="text-sm text-gray-600">Avg Per Frame</p>
                <p className="text-2xl font-bold text-gray-900">{intel.detectionStats.avgObjectsPerFrame || 0}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fallback: Check if using browser-extracted metadata
  if (comprehensive?.browserExtracted || !comprehensive || Object.keys(comprehensive).length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
          <div className="flex">
            <svg className="h-5 w-5 text-blue-500 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-blue-800 mb-1">
                Browser-Based Analysis
              </h3>
              <p className="text-sm text-blue-700">
                Video metadata extracted instantly in your browser. No server dependencies required.
              </p>
            </div>
          </div>
        </div>

        {/* CCTV Suitability Assessment */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">CCTV Analysis Suitability</h3>
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-5 rounded-lg border-2 border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className={`text-2xl font-bold ${suitability.color}`}>{suitability.rating}</p>
                <p className="text-sm text-gray-600 mt-1">{suitability.message}</p>
              </div>
              <div className={`px-4 py-2 rounded-full ${suitability.rating === 'Excellent' ? 'bg-green-100' : suitability.rating === 'Good' ? 'bg-blue-100' : suitability.rating === 'Fair' ? 'bg-yellow-100' : 'bg-red-100'}`}>
                <span className={`text-sm font-semibold ${suitability.color}`}>
                  {metadata.quality ? metadata.quality.toUpperCase() : 'UNKNOWN'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Video Information Grid */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Technical Specifications</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white border-2 border-gray-200 p-4 rounded-lg hover:border-blue-300 transition-colors">
                <div className="flex items-center mb-2">
                  <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs font-medium text-gray-500">Duration</p>
                </div>
                <p className="text-xl font-bold text-gray-900">{formatDuration(metadata.duration)}</p>
              </div>

              <div className="bg-white border-2 border-gray-200 p-4 rounded-lg hover:border-blue-300 transition-colors">
                <div className="flex items-center mb-2">
                  <svg className="h-5 w-5 text-purple-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-xs font-medium text-gray-500">Resolution</p>
                </div>
                <p className="text-xl font-bold text-gray-900">{metadata.width}x{metadata.height}</p>
                <p className="text-xs text-gray-500 mt-1">{getResolutionCategory()}</p>
              </div>

              <div className="bg-white border-2 border-gray-200 p-4 rounded-lg hover:border-blue-300 transition-colors">
                <div className="flex items-center mb-2">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  <p className="text-xs font-medium text-gray-500">File Size</p>
                </div>
                <p className="text-xl font-bold text-gray-900">{formatFileSize(metadata.size)}</p>
              </div>

              <div className="bg-white border-2 border-gray-200 p-4 rounded-lg hover:border-blue-300 transition-colors">
                <div className="flex items-center mb-2">
                  <svg className="h-5 w-5 text-orange-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <p className="text-xs font-medium text-gray-500">Bitrate</p>
                </div>
                <p className="text-xl font-bold text-gray-900">{calculateBitrate()} Mbps</p>
                <p className="text-xs text-gray-500 mt-1">Average data rate</p>
              </div>

              <div className="bg-white border-2 border-gray-200 p-4 rounded-lg hover:border-blue-300 transition-colors">
                <div className="flex items-center mb-2">
                  <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-xs font-medium text-gray-500">Format</p>
                </div>
                <p className="text-lg font-bold text-gray-900">{metadata.format?.split('/')[1]?.toUpperCase() || 'MP4'}</p>
                <p className="text-xs text-gray-500 mt-1">Container format</p>
              </div>

              <div className="bg-white border-2 border-gray-200 p-4 rounded-lg hover:border-blue-300 transition-colors">
                <div className="flex items-center mb-2">
                  <svg className="h-5 w-5 text-indigo-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <p className="text-xs font-medium text-gray-500">Aspect Ratio</p>
                </div>
                <p className="text-xl font-bold text-gray-900">{(metadata.width / metadata.height).toFixed(2)}:1</p>
                <p className="text-xs text-gray-500 mt-1">{metadata.width > metadata.height ? 'Landscape' : 'Portrait'}</p>
              </div>
            </div>
          </div>

          {/* CCTV Analysis Recommendations */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Analysis Recommendations</h3>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
              <div className="space-y-3">
                {metadata.width >= 1920 && metadata.height >= 1080 ? (
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-gray-700"><strong>High Resolution:</strong> Excellent for facial recognition and license plate detection</p>
                  </div>
                ) : (
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-gray-700"><strong>Consider Higher Resolution:</strong> 1080p or higher recommended for detailed analysis</p>
                  </div>
                )}
                
                {calculateBitrate() >= 3 ? (
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-gray-700"><strong>Good Bitrate:</strong> Sufficient quality for object detection and tracking</p>
                  </div>
                ) : (
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-gray-700"><strong>Low Bitrate:</strong> May affect detection accuracy in complex scenes</p>
                  </div>
                )}

                <div className="flex items-start">
                  <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-gray-700"><strong>Best Practices:</strong> Use well-lit scenes, stable camera mounting, and 30+ FPS for optimal results</p>
                </div>
              </div>
            </div>
          </div>

          {/* File Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">File Information</h3>
            <div className="bg-white border-2 border-gray-200 p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-600">File Name</span>
                <span className="text-sm font-semibold text-gray-900">{video.originalName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-600">Uploaded</span>
                <span className="text-sm font-semibold text-gray-900">{new Date(video.createdAt).toLocaleString()}</span>
              </div>
              {video.cameraInfo?.cameraId && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Camera ID</span>
                  <span className="text-sm font-semibold text-gray-900">{video.cameraInfo.cameraId}</span>
                </div>
              )}
              {video.cameraInfo?.location && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-600">Location</span>
                  <span className="text-sm font-semibold text-gray-900">{video.cameraInfo.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For videos with full comprehensive metadata (FFmpeg-extracted)
  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {video.originalName}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Uploaded on {new Date(video.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${getQualityColor(
                metadata.quality
              )}`}
            >
              {metadata.quality || "unknown"} quality
            </span>
          </div>
        </div>

        {/* Camera Info */}
        {(video.cameraInfo?.location || video.cameraInfo?.cameraId) && (
          <div className="mt-4 flex items-center space-x-4 text-sm text-gray-600">
            {video.cameraInfo.cameraId && (
              <div className="flex items-center">
                <svg
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                {video.cameraInfo.cameraId}
              </div>
            )}
            {video.cameraInfo.location && (
              <div className="flex items-center">
                <svg
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {video.cameraInfo.location}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "overview"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("technical")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "technical"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Technical Details
          </button>
          {comprehensive.embedded && Object.keys(comprehensive.embedded).length > 0 && (
            <button
              onClick={() => setActiveTab("embedded")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "embedded"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Embedded Data
            </button>
          )}
          {analysis && Object.keys(analysis).length > 0 && (
            <button
              onClick={() => setActiveTab("analysis")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "analysis"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              AI Analysis
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Basic Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Duration</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatDuration(metadata.duration)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Resolution</p>
                <p className="text-lg font-semibold text-gray-900">
                  {metadata.width}x{metadata.height}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Frame Rate</p>
                <p className="text-lg font-semibold text-gray-900">
                  {metadata.fps} FPS
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">File Size</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatFileSize(metadata.size)}
                </p>
              </div>
            </div>

            {/* Summary */}
            {analysis.summary && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                  Summary
                </h3>
                <p className="text-sm text-blue-800">{analysis.summary}</p>
              </div>
            )}

            {/* Suitability Assessment */}
            {analysis.suitability && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  CCTV Analysis Suitability
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Rating: {analysis.suitability.rating}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {analysis.suitability.score?.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full ${
                        analysis.suitability.score >= 80
                          ? "bg-green-500"
                          : analysis.suitability.score >= 60
                          ? "bg-blue-500"
                          : analysis.suitability.score >= 40
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${analysis.suitability.score}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {analysis.suitability.message}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "technical" && (
          <div className="space-y-6">
            {/* Video Stream */}
            {comprehensive.video && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Video Stream
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <p className="text-sm text-gray-500">Codec</p>
                    <p className="text-base font-medium text-gray-900">
                      {comprehensive.video.codecLongName || comprehensive.video.codec}
                    </p>
                  </div>
                  <div className="border-l-4 border-blue-500 pl-4">
                    <p className="text-sm text-gray-500">Bitrate</p>
                    <p className="text-base font-medium text-gray-900">
                      {(comprehensive.video.bitrate / 1000000).toFixed(2)} Mbps
                    </p>
                  </div>
                  <div className="border-l-4 border-blue-500 pl-4">
                    <p className="text-sm text-gray-500">Aspect Ratio</p>
                    <p className="text-base font-medium text-gray-900">
                      {comprehensive.video.aspectRatio}
                    </p>
                  </div>
                  <div className="border-l-4 border-blue-500 pl-4">
                    <p className="text-sm text-gray-500">Pixel Format</p>
                    <p className="text-base font-medium text-gray-900">
                      {comprehensive.video.pixelFormat}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Audio Stream */}
            {comprehensive.audio && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Audio Stream
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border-l-4 border-green-500 pl-4">
                    <p className="text-sm text-gray-500">Codec</p>
                    <p className="text-base font-medium text-gray-900">
                      {comprehensive.audio.codecLongName || comprehensive.audio.codec}
                    </p>
                  </div>
                  <div className="border-l-4 border-green-500 pl-4">
                    <p className="text-sm text-gray-500">Sample Rate</p>
                    <p className="text-base font-medium text-gray-900">
                      {comprehensive.audio.sampleRate} Hz
                    </p>
                  </div>
                  <div className="border-l-4 border-green-500 pl-4">
                    <p className="text-sm text-gray-500">Channels</p>
                    <p className="text-base font-medium text-gray-900">
                      {comprehensive.audio.channels}
                    </p>
                  </div>
                  <div className="border-l-4 border-green-500 pl-4">
                    <p className="text-sm text-gray-500">Bitrate</p>
                    <p className="text-base font-medium text-gray-900">
                      {(comprehensive.audio.bitrate / 1000).toFixed(0)} kbps
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Format Info */}
            {comprehensive.basic && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Container Format
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">
                    {comprehensive.basic.formatLongName}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Format: {comprehensive.basic.format}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "embedded" && comprehensive.embedded && (
          <div className="space-y-6">
            {/* Creation Time */}
            {comprehensive.embedded.creationTime && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Recording Time
                </h3>
                <p className="text-base text-gray-700">
                  {new Date(comprehensive.embedded.creationTime).toLocaleString()}
                </p>
              </div>
            )}

            {/* Camera/Device Info */}
            {(comprehensive.embedded.make || comprehensive.embedded.model) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Camera/Device
                </h3>
                <p className="text-base text-gray-700">
                  {comprehensive.embedded.make} {comprehensive.embedded.model}
                </p>
              </div>
            )}

            {/* GPS Location */}
            {comprehensive.embedded.location && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  GPS Location
                </h3>
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                  <p className="text-sm text-gray-700">
                    <strong>Latitude:</strong> {comprehensive.embedded.location.latitude.toFixed(6)}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Longitude:</strong> {comprehensive.embedded.location.longitude.toFixed(6)}
                  </p>
                  <a
                    href={`https://www.google.com/maps?q=${comprehensive.embedded.location.latitude},${comprehensive.embedded.location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block"
                  >
                    View on Google Maps →
                  </a>
                </div>
              </div>
            )}

            {/* Other Metadata */}
            {Object.entries(comprehensive.embedded)
              .filter(([key]) => !['creationTime', 'make', 'model', 'location'].includes(key))
              .map(([key, value]) => (
                <div key={key}>
                  <h3 className="text-sm font-medium text-gray-700 mb-1 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </h3>
                  <p className="text-base text-gray-900">{value}</p>
                </div>
              ))}
          </div>
        )}

        {activeTab === "analysis" && analysis && (
          <div className="space-y-6">
            {/* Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Recommendations
                </h3>
                <ul className="space-y-2">
                  {analysis.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start">
                      <svg
                        className="flex-shrink-0 h-5 w-5 text-blue-500 mr-2 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-gray-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Alerts */}
            {analysis.alerts && analysis.alerts.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Alerts
                </h3>
                <div className="space-y-2">
                  {analysis.alerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border-l-4 ${
                        alert.level === "warning"
                          ? "bg-yellow-50 border-yellow-500"
                          : "bg-blue-50 border-blue-500"
                      }`}
                    >
                      <p
                        className={`text-sm ${
                          alert.level === "warning"
                            ? "text-yellow-800"
                            : "text-blue-800"
                        }`}
                      >
                        {alert.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoMetadataView;
