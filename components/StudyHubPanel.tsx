import React, { useState, useEffect } from 'react';
import { getStudyHubSchedule } from '../services/geminiService';
import { getUserSchedule, saveUserSchedule } from '../services/memoryService';
import { UserProfile, UserRole, StudyHubSubject } from '../types';

interface StudyHubPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onStartLesson: (subject: StudyHubSubject) => void;
}

const StudyHubPanel: React.FC<StudyHubPanelProps> = ({ isOpen, onClose, user, onStartLesson }) => {
  const [schedule, setSchedule] = useState<StudyHubSubject[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form state for adding new subject (User mode)
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (isOpen) {
        loadSchedule();
    }
  }, [isOpen, user]);

  const loadSchedule = async () => {
    setLoading(true);
    if (user.role === UserRole.ADMIN) {
        // Admin gets the hardcoded full schedule
        setSchedule(getStudyHubSchedule());
    } else {
        // Users get their saved schedule from Firestore
        const userSchedule = await getUserSchedule(user.mobile);
        setSchedule(userSchedule);
    }
    setLoading(false);
  };

  const handleAddSubject = async () => {
    if (!newCode || !newName) return;
    const newSubject: StudyHubSubject = {
        courseCode: newCode.toUpperCase(),
        courseName: newName,
        date: 'Self-Paced',
        time: 'Flexible'
    };
    const updated = [...schedule, newSubject];
    setSchedule(updated);
    await saveUserSchedule(user.mobile, updated);
    setNewCode('');
    setNewName('');
    setIsAdding(false);
  };

  const handleDeleteSubject = async (index: number) => {
    const updated = schedule.filter((_, i) => i !== index);
    setSchedule(updated);
    if (user.role !== UserRole.ADMIN) {
        await saveUserSchedule(user.mobile, updated);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm animate-fade-in">
      {/* Optimized padding for mobile: p-4 instead of p-6 */}
      <div className="w-full max-w-3xl bg-black border-2 border-nexa-blue/50 p-4 sm:p-6 shadow-[0_0_30px_rgba(0,119,255,0.4)] relative max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 border-b border-nexa-blue/30 pb-2 shrink-0">
          <h2 className="text-nexa-blue text-lg sm:text-xl font-bold tracking-widest font-mono">
             {user.role === UserRole.ADMIN ? "IGNOU EXAM SCHEDULE" : "STUDY BUDDY: HALL TICKET"}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <div className="text-zinc-300 mt-2 font-sans leading-relaxed overflow-y-auto no-scrollbar flex-1 pr-2">
          <p className="mb-4 text-nexa-cyan font-mono text-sm">
             {user.role === UserRole.ADMIN 
                ? "Chandan Sir, select a subject to start analyzing Previous 2 Year Questions immediately."
                : `Hello ${user.name}, add your subjects below. Nexa will help you prepare.`}
          </p>

          {loading ? (
             <div className="text-center py-10 text-nexa-blue animate-pulse font-mono">LOADING SCHEDULE DATA...</div>
          ) : (
            <div className="grid gap-3 mb-6">
                {schedule.length === 0 && (
                    <div className="text-zinc-500 text-center py-4 border border-dashed border-zinc-700">
                        No subjects added yet. Add your Hall Ticket details.
                    </div>
                )}
                {schedule.map((subject, index) => (
                  <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-nexa-blue/5 border border-nexa-blue/10 hover:border-nexa-blue/40 transition-all rounded-md group">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                             <span className="text-nexa-cyan font-bold font-mono text-lg">{subject.courseCode}</span>
                             <span className="text-xs text-zinc-500 font-mono border border-zinc-700 px-1 rounded">{subject.date}</span>
                        </div>
                        <div className="text-zinc-300 text-sm">{subject.courseName}</div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 sm:mt-0 w-full sm:w-auto">
                         <button 
                            onClick={() => onStartLesson(subject)}
                            className="flex-1 sm:flex-none px-4 py-2 bg-nexa-blue text-black font-bold text-xs tracking-wider hover:bg-white transition-colors uppercase clip-corner"
                         >
                            Start Class
                         </button>
                         {user.role !== UserRole.ADMIN && (
                             <button onClick={() => handleDeleteSubject(index)} className="p-2 text-zinc-600 hover:text-red-500 transition-colors">
                                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                             </button>
                         )}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* User Add Subject Form */}
          {user.role !== UserRole.ADMIN && (
              <div className="mt-4 p-4 border border-dashed border-zinc-600 rounded bg-black/50">
                  {!isAdding ? (
                      <button onClick={() => setIsAdding(true)} className="w-full py-2 text-zinc-400 hover:text-nexa-cyan border border-transparent hover:border-nexa-cyan/30 text-xs font-mono tracking-widest uppercase transition-all">
                          + Add New Subject
                      </button>
                  ) : (
                      <div className="space-y-3 animate-fade-in">
                          <div className="text-nexa-cyan text-xs font-mono uppercase">New Course Details</div>
                          <div className="flex gap-2">
                              <input 
                                value={newCode}
                                onChange={(e) => setNewCode(e.target.value)}
                                placeholder="Course Code (e.g. MCS012)" 
                                className="w-1/3 bg-zinc-900 border border-zinc-700 text-white px-3 py-2 text-sm focus:border-nexa-cyan outline-none"
                              />
                              <input 
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Course Name" 
                                className="flex-1 bg-zinc-900 border border-zinc-700 text-white px-3 py-2 text-sm focus:border-nexa-cyan outline-none"
                              />
                          </div>
                          <div className="flex gap-2 justify-end">
                              <button onClick={() => setIsAdding(false)} className="px-3 py-1 text-zinc-500 text-xs hover:text-white">Cancel</button>
                              <button onClick={handleAddSubject} className="px-4 py-1 bg-nexa-cyan text-black font-bold text-xs uppercase hover:bg-white">Save</button>
                          </div>
                      </div>
                  )}
              </div>
          )}
        </div>

        <div className="flex justify-end gap-4 mt-4 pt-4 border-t border-nexa-blue/30 shrink-0">
          <button onClick={onClose} className="py-3 px-6 border border-zinc-700 text-zinc-400 font-mono text-xs tracking-widest hover:bg-zinc-900 hover:text-white transition-colors">CLOSE</button>
        </div>
      </div>
      <style>{`.clip-corner { clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px); }`}</style>
    </div>
  );
};

export default StudyHubPanel;