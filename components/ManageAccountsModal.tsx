import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { getAllUserProfiles, checkUserPenitenceStatus, setUserPenitenceStatus, deleteUser } from '../services/memoryService';

interface ManageAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ManageAccountsModal: React.FC<ManageAccountsModalProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userStatuses, setUserStatuses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      const allUsers = getAllUserProfiles();
      setUsers(allUsers);
      const statuses: Record<string, boolean> = {};
      allUsers.forEach(user => {
        statuses[user.mobile] = checkUserPenitenceStatus(user);
      });
      setUserStatuses(statuses);
    }
  }, [isOpen]);

  const handleForgive = (user: UserProfile) => {
    setUserPenitenceStatus(user, false);
    setUserStatuses(prev => ({...prev, [user.mobile]: false}));
  };

  const handleDelete = (user: UserProfile) => {
    if (window.confirm(`Are you sure you want to permanently delete all data for ${user.name} (${user.mobile})? This cannot be undone.`)) {
        deleteUser(user);
        setUsers(prev => prev.filter(u => u.mobile !== user.mobile));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-black border-2 border-nexa-cyan/50 p-6 shadow-[0_0_30px_rgba(41,223,255,0.4)] max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 border-b border-nexa-cyan/30 pb-2 shrink-0">
          <h2 className="text-nexa-cyan text-lg font-bold tracking-widest font-mono">USER DATA MANAGEMENT</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pr-2">
            {users.length === 0 ? (
                 <p className="text-zinc-500 text-center py-8">No user data found in local storage.</p>
            ) : (
                <div className="space-y-2">
                    {users.map(user => (
                        <div key={user.mobile} className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded">
                           <div>
                               <p className="font-bold text-white">{user.name} <span className="text-xs text-zinc-500 font-mono">({user.gender})</span></p>
                               <p className="text-xs text-zinc-400 font-mono">{user.mobile}</p>
                               {userStatuses[user.mobile] && (
                                   <p className="text-xs text-nexa-red font-bold animate-pulse">STATUS: BLOCKED</p>
                               )}
                           </div>
                           <div className="flex items-center gap-2">
                               {userStatuses[user.mobile] && (
                                   <button onClick={() => handleForgive(user)} className="px-3 py-1 bg-nexa-cyan text-black font-bold text-xs uppercase hover:bg-white transition-colors">
                                       Forgive
                                   </button>
                               )}
                                <button onClick={() => handleDelete(user)} className="px-3 py-1 bg-nexa-red/20 border border-nexa-red/50 text-nexa-red font-bold text-xs uppercase hover:bg-nexa-red hover:text-white transition-colors">
                                   Delete
                               </button>
                           </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
        
        <div className="flex gap-4 mt-8 pt-4 border-t border-nexa-cyan/30 shrink-0">
          <button onClick={onClose} className="w-full py-3 border border-zinc-700 text-zinc-400 font-mono text-xs tracking-widest hover:bg-zinc-900 hover:text-white transition-colors">CLOSE</button>
        </div>
      </div>
    </div>
  );
};

export default ManageAccountsModal;