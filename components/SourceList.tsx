import React from 'react';
import { ExternalLink } from 'lucide-react';
import { GroundingSource } from '../types';

interface SourceListProps {
  sources: GroundingSource[];
}

const SourceList: React.FC<SourceListProps> = ({ sources }) => {
  if (sources.length === 0) return null;

  return (
    <div className="mt-8 pt-6 border-t border-slate-800">
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Sources & References</h4>
      <div className="flex flex-wrap gap-2">
        {sources.map((source, index) => (
          <a
            key={index}
            href={source.uri}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-indigo-400 px-3 py-1.5 rounded-md text-xs transition-colors border border-slate-700"
          >
            <span className="truncate max-w-[150px]">{source.title}</span>
            <ExternalLink size={10} />
          </a>
        ))}
      </div>
    </div>
  );
};

export default SourceList;
