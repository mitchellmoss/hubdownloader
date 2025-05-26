'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

interface Analytics {
  summary: {
    totalExtractions: number;
    successRate: string;
    failedExtractions: number;
    uniqueUsers: number;
    dateRange: {
      start: string;
      end: string;
      days: number;
    };
  };
  recentExtractions: Array<{
    id: string;
    sourceUrl: string;
    format: string | null;
    videoCount: number;
    success: boolean;
    error: string | null;
    createdAt: string;
    userIp: string;
  }>;
  extractionsByDay: Array<{
    date: string;
    count: number;
    successful: number;
    failed: number;
  }>;
  extractionsByDomain: Array<{
    domain: string;
    count: number;
    successful: number;
  }>;
  extractionsByFormat: Array<{
    format: string;
    count: number;
  }>;
  rateLimitStats: {
    activeRateLimits: number;
    details: Array<{
      key: string;
      count: number;
      expiresAt: string;
    }>;
  };
}

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);
  const router = useRouter();

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/admin/analytics?days=${days}`);
      
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError('Failed to load analytics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading analytics...</div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400">{error || 'Failed to load data'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-gray-800 px-4 py-2 rounded-lg"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-gray-400 text-sm">Total Extractions</h3>
            <p className="text-3xl font-bold mt-2">{analytics.summary.totalExtractions}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-gray-400 text-sm">Success Rate</h3>
            <p className="text-3xl font-bold mt-2">{analytics.summary.successRate}%</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-gray-400 text-sm">Failed Extractions</h3>
            <p className="text-3xl font-bold mt-2 text-red-400">{analytics.summary.failedExtractions}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-gray-400 text-sm">Unique Users</h3>
            <p className="text-3xl font-bold mt-2">{analytics.summary.uniqueUsers}</p>
          </div>
        </div>

        {/* Domain Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Extractions by Domain</h2>
            <div className="space-y-3">
              {analytics.extractionsByDomain.map((domain) => (
                <div key={domain.domain} className="flex justify-between items-center">
                  <span className="font-mono">{domain.domain}</span>
                  <div className="text-right">
                    <span className="text-green-400">{domain.successful}</span>
                    <span className="text-gray-500 mx-2">/</span>
                    <span>{domain.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Format Distribution</h2>
            <div className="space-y-3">
              {analytics.extractionsByFormat.map((format) => (
                <div key={format.format} className="flex justify-between items-center">
                  <span className="font-mono">{format.format || 'unknown'}</span>
                  <span>{format.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Daily Stats */}
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-bold mb-4">Daily Extraction Stats</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Total</th>
                  <th className="pb-2">Successful</th>
                  <th className="pb-2">Failed</th>
                  <th className="pb-2">Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {analytics.extractionsByDay.slice(0, 10).map((day) => {
                  const date = new Date(day.date + 'T00:00:00');
                  const successRate = day.count > 0 ? ((day.successful / day.count) * 100).toFixed(1) : '0';
                  return (
                    <tr key={day.date} className="border-b border-gray-700">
                      <td className="py-2">{format(date, 'MMM dd, yyyy')}</td>
                      <td className="py-2">{day.count}</td>
                      <td className="py-2 text-green-400">{day.successful}</td>
                      <td className="py-2 text-red-400">{day.failed}</td>
                      <td className="py-2">{successRate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Extractions */}
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-bold mb-4">Recent Extractions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="pb-2">Time</th>
                  <th className="pb-2">URL</th>
                  <th className="pb-2">Format</th>
                  <th className="pb-2">Videos</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">IP</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recentExtractions.map((extraction) => (
                  <tr key={extraction.id} className="border-b border-gray-700">
                    <td className="py-2">{format(new Date(extraction.createdAt), 'HH:mm:ss')}</td>
                    <td className="py-2 max-w-xs truncate">{extraction.sourceUrl}</td>
                    <td className="py-2">{extraction.format || '-'}</td>
                    <td className="py-2">{extraction.videoCount}</td>
                    <td className="py-2">
                      {extraction.success ? (
                        <span className="text-green-400">Success</span>
                      ) : (
                        <span className="text-red-400">Failed</span>
                      )}
                    </td>
                    <td className="py-2 font-mono text-xs">{extraction.userIp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rate Limits */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">
            Active Rate Limits ({analytics.rateLimitStats.activeRateLimits})
          </h2>
          {analytics.rateLimitStats.details.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="pb-2">Key</th>
                    <th className="pb-2">Count</th>
                    <th className="pb-2">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.rateLimitStats.details.map((limit) => (
                    <tr key={limit.key} className="border-b border-gray-700">
                      <td className="py-2 font-mono text-xs">{limit.key}</td>
                      <td className="py-2">{limit.count}</td>
                      <td className="py-2">{format(new Date(limit.expiresAt), 'HH:mm:ss')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400">No active rate limits</p>
          )}
        </div>
      </div>
    </div>
  );
}