import React from 'react';
import { usePadStore } from '../stores/padStore';

interface PadTabProps {
  tabId: string;
  isActive: boolean;
  onClick: () => void;
  onClose: (e: React.MouseEvent) => void;
}

const PadTab: React.FC<PadTabProps> = ({ tabId, isActive, onClick, onClose }) => {
  const { tabContents } = usePadStore();
  const tabContent = tabContents[tabId];

  return (
    <div
      className={`px-1 py-0.5 rounded-t-md cursor-pointer flex items-center space-x-2 text-sm border-t border-l border-r ${isActive
          ? 'bg-bg-theme text-text-primary border-border-tertiary'
          : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover border-transparent'
        }`}
      onClick={onClick}
    >
      <span className="truncate max-w-[100px] text-xs px-1">
        {tabContent?.input?.split('\n')[0]?.slice(0, 20) || 'New Tab'}
      </span>
      <button
        className="text-text-tertiary hover:bg-bg-hover hover:text-text-secondary focus:outline-none"
        onClick={(e) => {
          e.stopPropagation();
          onClose(e);
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};

export default PadTab;
