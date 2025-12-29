import { X, AlertTriangle, Gavel, MapPin, Calendar, FileText, Building2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function CriminalProfileModal({ personName, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCriminalProfile();
  }, [personName]);

  const fetchCriminalProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:3000/api/criminals/profile/${encodeURIComponent(personName)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProfile(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load criminal profile');
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level) => {
    const colors = {
      critical: 'text-red-600 bg-red-100 border-red-300',
      high: 'text-orange-600 bg-orange-100 border-orange-300',
      medium: 'text-yellow-600 bg-yellow-100 border-yellow-300',
      low: 'text-blue-600 bg-blue-100 border-blue-300',
      none: 'text-gray-600 bg-gray-100 border-gray-300'
    };
    return colors[level] || colors.none;
  };

  const getSeverityIcon = (severity) => {
    if (severity === 'critical') return <AlertTriangle className="w-4 h-4 text-red-600" />;
    return <Gavel className="w-4 h-4 text-orange-600" />;
  };

  const getStatusColor = (status) => {
    const colors = {
      'Trial Ongoing': 'bg-red-100 text-red-800',
      'Under Investigation': 'bg-yellow-100 text-yellow-800',
      'Pending': 'bg-blue-100 text-blue-800',
      'Convicted': 'bg-purple-100 text-purple-800',
      'Acquitted': 'bg-green-100 text-green-800',
      'Closed': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-purple-600">
          <div className="flex items-center gap-3">
            <Gavel className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Criminal Background Report</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
              {error}
            </div>
          )}

          {profile && (
            <div className="space-y-6">
              {/* Person Info */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {profile.profile.name}
                    </h3>
                    {profile.profile.aliases && profile.profile.aliases.length > 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Also known as: {profile.profile.aliases.join(', ')}
                      </p>
                    )}
                  </div>
                  <div className={`px-4 py-2 rounded-lg border-2 font-bold ${getRiskLevelColor(profile.profile.riskLevel)}`}>
                    {profile.profile.riskLevel?.toUpperCase() || 'UNKNOWN'} RISK
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Court Cases</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {profile.profile.courtCases?.length || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Convictions</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {profile.profile.convictionCount || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Active Warrants</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {profile.profile.activeWarrants ? 'YES' : 'NO'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Last Checked</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(profile.profile.lastChecked).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {profile.profile.lastKnownLocation && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="w-4 h-4" />
                    <span>Last Known Location: {profile.profile.lastKnownLocation}</span>
                  </div>
                )}
              </div>

              {/* Court Cases */}
              <div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Gavel className="w-5 h-5" />
                  Court Cases
                </h4>
                <div className="space-y-4">
                  {profile.profile.courtCases && profile.profile.courtCases.length > 0 ? (
                    profile.profile.courtCases.map((courtCase, idx) => (
                      <div key={idx} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getSeverityIcon(courtCase.severity)}
                            <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                              {courtCase.caseNumber}
                            </span>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(courtCase.status)}`}>
                            {courtCase.status}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Charges:</p>
                            <div className="flex flex-wrap gap-2">
                              {courtCase.charges.map((charge, i) => (
                                <span key={i} className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-2 py-1 rounded text-xs">
                                  {charge}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600 dark:text-gray-400">{courtCase.court}</span>
                            </div>
                            {courtCase.filedDate && (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600 dark:text-gray-400">
                                  Filed: {new Date(courtCase.filedDate).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>

                          {courtCase.nextHearing && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-2 text-sm">
                              <span className="text-yellow-800 dark:text-yellow-200">
                                Next Hearing: {new Date(courtCase.nextHearing).toLocaleDateString()}
                              </span>
                            </div>
                          )}

                          {courtCase.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                              {courtCase.description}
                            </p>
                          )}

                          {courtCase.amountInvolved && (
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              Amount Involved: {courtCase.amountInvolved}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">No court cases found</p>
                  )}
                </div>
              </div>

              {/* Related Documents */}
              {profile.relatedDocuments && profile.relatedDocuments.length > 0 && (
                <div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Related Documents in KHOJ-AI
                  </h4>
                  <div className="space-y-2">
                    {profile.relatedDocuments.map((doc) => (
                      <div key={doc._id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{doc.filename}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {doc.agency} • {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded">
                          {doc.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Source */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Data Source:</strong> {profile.profile.source || 'CrimeCheck.in'} • 
                  Last updated: {new Date(profile.profile.lastChecked).toLocaleString()} • 
                  Checked {profile.profile.checkCount} time(s)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
          {profile && (
            <button
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              onClick={() => window.open(`/app/document/${profile.relatedDocuments[0]?._id}`, '_blank')}
            >
              View Related Documents
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
