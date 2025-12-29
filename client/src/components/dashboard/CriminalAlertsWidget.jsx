import { AlertTriangle, Gavel, TrendingUp, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import CriminalProfileModal from '../criminal/CriminalProfileModal';

export default function CriminalAlertsWidget() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState(null);

  useEffect(() => {
    fetchCriminalStats();
  }, []);

  const fetchCriminalStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/criminals/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching criminal stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'text-red-600',
      high: 'text-orange-600',
      medium: 'text-yellow-600',
      low: 'text-blue-600'
    };
    return colors[severity] || 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Gavel className="w-5 h-5 text-red-600" />
            Criminal Records Alerts
          </h3>
          <a
            href="/app/alerts?type=criminal_match"
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            View All →
          </a>
        </div>

        {stats && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">Critical</p>
                </div>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {stats.criticalAlerts}
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Today</p>
                </div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {stats.todayAlerts}
                </p>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Total</p>
                </div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {stats.totalAlerts}
                </p>
              </div>
            </div>

            {/* Recent Matches */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Recent Matches
              </h4>
              <div className="space-y-2">
                {stats.recentMatches && stats.recentMatches.length > 0 ? (
                  stats.recentMatches.map((match, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      onClick={() => setSelectedPerson(match.personName)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            match.severity === 'critical' ? 'bg-red-500' :
                            match.severity === 'high' ? 'bg-orange-500' :
                            match.severity === 'medium' ? 'bg-yellow-500' :
                            'bg-blue-500'
                          }`}></div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {match.personName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {match.caseCount} court case{match.caseCount > 1 ? 's' : ''} • {' '}
                              {new Date(match.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline">
                          View →
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <Gavel className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No criminal records found yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Unique Persons Tracked */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>{stats.uniquePersons}</strong> unique person{stats.uniquePersons !== 1 ? 's' : ''} with criminal records tracked
              </p>
            </div>
          </>
        )}
      </div>

      {/* Criminal Profile Modal */}
      {selectedPerson && (
        <CriminalProfileModal
          personName={selectedPerson}
          onClose={() => setSelectedPerson(null)}
        />
      )}
    </>
  );
}
