import React, { useState, useEffect } from 'react';
import { PenTool } from 'lucide-react';

export default function NotesManager() {
  const [note, setNote] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('gemini-notes');
    if (saved) {
      setNote(saved);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
    localStorage.setItem('gemini-notes', e.target.value);
  };

  return (
    <div className="p-8 h-full overflow-hidden flex flex-col">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <PenTool className="text-yellow-400" /> Catatan Ide (Scratchpad)
          </h2>
          <p className="text-gray-400 mt-1">Area corat-coret bebas. Semua teks di sini tersimpan secara otomatis.</p>
        </div>

        <textarea 
          value={note}
          onChange={handleChange}
          className="w-full flex-1 bg-gray-800/30 border border-gray-700 rounded-xl p-6 text-gray-200 focus:outline-none focus:border-yellow-500 resize-none font-mono text-sm leading-relaxed"
          placeholder="Tuliskan draf kasarmu, to-do list, atau nama-nama cadangan di sini..."
        />
      </div>
    </div>
  );
}
