import React, { useState, useEffect } from "react";
import axios from "axios";

const MetadataAnalysis = ({ metadataId, user }) => {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchMetadata();
  }, [metadataId]);

  const fetchMetadata = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`/api/cctv/metadata/${metadataId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setMetadata(response.data);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load metadata");
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `/api/cctv/metadata/${metadataId}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${metadata.originalName}_analysis.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setDownloading(false);
    } catch (err) {
      setError("Failed to download report");
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading analysis...</span>
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

  if (!metadata) {
    return null;
  }

  const renderEntityBadge = (entity) => {
    const name = typeof entity === "string" ? entity : entity.text;
    return (
      <span
        key={name}
        className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm mr-2 mb-2"
      >
        {name}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {metadata.originalName}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Uploaded on {new Date(metadata.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                metadata.processingStatus === "completed"
                  ? "bg-green-100 text-green-800"
                  : metadata.processingStatus === "processing"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {metadata.processingStatus}
            </span>
            {metadata.processingStatus === "completed" && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 flex items-center"
              >
                {downloading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Downloading...
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download Report
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Camera Info */}
        {(metadata.cameraInfo?.location || metadata.cameraInfo?.cameraId) && (
          <div className="mt-4 flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            {metadata.cameraInfo.cameraId && (
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
                {metadata.cameraInfo.cameraId}
              </div>
            )}
            {metadata.cameraInfo.location && (
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
                {metadata.cameraInfo.location}
              </div>
            )}
          </div>
        )}
      </div>

      {metadata.processingStatus === "processing" && (
        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-gray-600 dark:text-gray-400">
              Processing metadata with AI... This may take a minute.
            </span>
          </div>
        </div>
      )}

      {metadata.processingStatus === "completed" && metadata.aiAnalysis && (
        <div className="p-6 space-y-6">
          {/* Executive Summary */}
          {metadata.aiAnalysis.executiveSummary && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Executive Summary
              </h3>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500 dark:border-blue-400">
                <p className="text-gray-700 dark:text-gray-300">
                  {metadata.aiAnalysis.executiveSummary}
                </p>
              </div>
            </div>
          )}

          {/* Key Findings */}
          {metadata.aiAnalysis.keyFindings?.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Key Findings
              </h3>
              <ul className="space-y-2">
                {metadata.aiAnalysis.keyFindings.map((finding, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center bg-green-100 text-green-800 rounded-full text-xs font-semibold mr-3 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Extracted Entities */}
          {metadata.entities && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Extracted Entities
              </h3>
              <div className="space-y-4">
                {metadata.entities.persons?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Persons
                    </h4>
                    <div className="flex flex-wrap">
                      {metadata.entities.persons.map(renderEntityBadge)}
                    </div>
                  </div>
                )}

                {metadata.entities.places?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Places
                    </h4>
                    <div className="flex flex-wrap">
                      {metadata.entities.places.map(renderEntityBadge)}
                    </div>
                  </div>
                )}

                {metadata.entities.organizations?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Organizations
                    </h4>
                    <div className="flex flex-wrap">
                      {metadata.entities.organizations.map(renderEntityBadge)}
                    </div>
                  </div>
                )}

                {metadata.entities.phones?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone Numbers
                    </h4>
                    <div className="flex flex-wrap">
                      {metadata.entities.phones.map((phone) => (
                        <span
                          key={phone}
                          className="inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm mr-2 mb-2"
                        >
                          {phone}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {metadata.entities.emails?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Addresses
                    </h4>
                    <div className="flex flex-wrap">
                      {metadata.entities.emails.map((email) => (
                        <span
                          key={email}
                          className="inline-block px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm mr-2 mb-2"
                        >
                          {email}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analyst Takeaways */}
          {metadata.aiAnalysis.analystTakeaways?.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Analyst Takeaways
              </h3>
              <ul className="space-y-2">
                {metadata.aiAnalysis.analystTakeaways.map((takeaway, idx) => (
                  <li key={idx} className="flex items-start">
                    <svg
                      className="flex-shrink-0 h-5 w-5 text-yellow-500 mr-2 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-gray-700 dark:text-gray-300">{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      )}

      {metadata.processingStatus === "failed" && (
        <div className="p-6">
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            Processing failed. Please try uploading the file again or contact support.
          </div>
        </div>
      )}
    </div>
  );
};

export default MetadataAnalysis;
