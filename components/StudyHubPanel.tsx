import React from 'react';
import { getStudyHubSchedule } from '../services/geminiService';

interface StudyHubPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const StudyHubPanel: React.FC<StudyHubPanelProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const schedule = getStudyHubSchedule();

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-black border-2 border-nexa-blue/50 p-6 shadow-[0_0_30px_rgba(0,119,255,0.4)] relative">
        <div className="flex justify-between items-center mb-4 border-b border-nexa-blue/30 pb-2">
          <h2 className="text-nexa-blue text-xl font-bold tracking-widest font-mono">NEXA AI TUTOR: STUDY HUB</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <div className="text-zinc-300 mt-4 font-sans leading-relaxed max-h-[70vh] overflow-y-auto no-scrollbar">
          <p className="mb-4 text-nexa-cyan font-mono text-sm">
            <span className="font-bold">Chandan Sir, yeh raha aapka IGNOU BCA Exam Schedule (December 2025 - January 2026):</span>
          </p>

          <div className="overflow-x-auto mb-6">
            <table className="min-w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-nexa-blue/20 text-nexa-cyan border-b border-nexa-blue/50">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3">Course Code</th>
                  <th className="py-2 px-3">Course Name</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((subject, index) => (
                  <tr key={index} className={`border-b border-nexa-blue/10 ${index % 2 === 0 ? 'bg-nexa-blue/5' : ''} hover:bg-nexa-blue/15 transition-colors`}>
                    <td className="py-2 px-3">{subject.date}</td>
                    <td className="py-2 px-3">{subject.time}</td>
                    <td className="py-2 px-3 text-nexa-cyan">{subject.courseCode}</td>
                    <td className="py-2 px-3">{subject.courseName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-zinc-300 mb-4">
            Aapki padhai ke liye, main NEXA, aapki personal AI Tutor hoon.
            Mujhe bas bataiye ki aapko kaunsa subject padhna hai, jaise "Nexa, mujhe <span className="text-nexa-cyan font-mono">MCS201</span> padhao."
          </p>
          <p className="text-zinc-300 mb-4">
            Main aapke liye previous year papers aur online resources se research karke,
            wohi questions padhaungi jinke <span className="text-nexa-blue font-bold">90-95% chances</span> hain exam mein aane ke.
            Aapko bas focus karna hai aur main sab kuch aasan Hinglish mein samjhaungi, bol kar aur likh kar!
          </p>
          <p className="text-nexa-yellow text-sm font-mono italic">
            "Your exams are my priority, Sir. Let's conquer them together!"
          </p>
        </div>

        <div className="flex justify-end gap-4 mt-8 pt-4 border-t border-nexa-blue/30">
          <button onClick={onClose} className="py-3 px-6 border border-zinc-700 text-zinc-400 font-mono text-xs tracking-widest hover:bg-zinc-900 hover:text-white transition-colors">CLOSE STUDY HUB</button>
        </div>
      </div>
    </div>
  );
};

export default StudyHubPanel;