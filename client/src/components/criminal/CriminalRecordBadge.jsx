import { AlertTriangle, Gavel } from 'lucide-react';

export default function CriminalRecordBadge({ recordCount, severity, onClick, className = "" }) {
  if (!recordCount || recordCount === 0) return null;

  const severityColors = {
    critical: 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200',
    low: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200'
  };

  const color = severityColors[severity] || severityColors.medium;

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${color} ${className}`}
      title={`${recordCount} court case${recordCount > 1 ? 's' : ''} found`}
    >
      {severity === 'critical' ? (
        <AlertTriangle className="w-3.5 h-3.5" />
      ) : (
        <Gavel className="w-3.5 h-3.5" />
      )}
      <span>{recordCount} case{recordCount > 1 ? 's' : ''}</span>
    </button>
  );
}
