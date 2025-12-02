import React from 'react';

interface ManageAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ManageAccountsModal: React.FC<ManageAccountsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-black border-2 border-nexa-cyan/50 p-6 shadow-[0_0_30px_rgba(41,223,255,0.4)]">
        <h2 className="text-nexa-cyan text-lg font-bold tracking-widest font-mono">USER MANAGEMENT</h2>
        <p className="text-zinc-300 mt-4 font-sans leading-relaxed">
          Sir, user data management is currently handled via local browser storage (for login/logout).
          A more comprehensive user management system would require a dedicated backend infrastructure.
        </p>
        <p className="text-zinc-400 text-sm mt-4 leading-normal">
          For now, individual user data is cleared upon logout.
        </p>
        <div className="flex gap-4 mt-8">
          <button onClick={onClose} className="flex-1 py-3 border border-zinc-700 text-zinc-400 font-mono text-xs tracking-widest hover:bg-zinc-900 hover:text-white transition-colors">OK</button>
        </div>
      </div>
    </div>
  );
};

export default ManageAccountsModal;