import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { generatePlotOutline } from '../utils/novelGenerator';
import type { PlotBab } from '../utils/novelGenerator';

interface OutlinerProps {
  onPlotGenerated: (premise: string, plotInduk: PlotBab[]) => void;
}

const BAB_COUNT_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50];

export default function Outliner({ onPlotGenerated }: OutlinerProps) {
  const [premise, setPremise] = useState('');
  const [babCount, setBabCount] = useState(10);
  const [isLoading, setIsLoading] = useState(false);

  const generatePlot = async () => {
    if (!premise.trim() || isLoading) return;

    setIsLoading(true);

    try {
      const plotInduk = await generatePlotOutline(premise, babCount);
      onPlotGenerated(premise, plotInduk);
      setPremise('');
    } catch (error: any) {
      console.error(error);
      alert('Terjadi kesalahan saat memanggil AI: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 h-full overflow-hidden flex flex-col items-center">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center">
        <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-purple-500/30 rounded-2xl p-8 shadow-2xl backdrop-blur-sm relative overflow-hidden">
          
          <div className="absolute top-0 right-0 -mr-16 -mt-16 text-purple-500/10">
            <Sparkles className="w-64 h-64" />
          </div>

          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 mb-2 flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-purple-400" />
              AI Story Outliner
            </h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Tuliskan 1 kalimat ide mentah Anda dan tentukan jumlah bab. Fictify akan membuat <span className="text-purple-300 font-semibold">Plot Induk</span> untuk seluruh bab, lalu menulisnya satu per satu saat Anda siap!
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Premis Cerita Utama</label>
                <textarea 
                  value={premise}
                  onChange={e => setPremise(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-gray-900/80 border border-purple-500/30 rounded-xl p-4 text-gray-100 focus:outline-none focus:border-purple-500 resize-none h-32 shadow-inner"
                  placeholder="Contoh: Seorang koki jenius yang tidak sengaja menemukan resep masakan dari dunia iblis..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Jumlah Bab</label>
                <div className="flex flex-wrap gap-2">
                  {BAB_COUNT_OPTIONS.map(count => (
                    <button
                      key={count}
                      onClick={() => setBabCount(count)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                        babCount === count
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                      }`}
                    >
                      {count} Bab
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={generatePlot}
                disabled={isLoading || !premise.trim()}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold tracking-wide shadow-lg shadow-purple-900/50 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 disabled:active:scale-100 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Fictify Sedang Merancang Plot...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Generate Plot & Mulai Bab 1</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-6 p-4 bg-gray-900/50 rounded-xl border border-gray-800">
              <p className="text-xs text-gray-400 leading-relaxed">
                <strong className="text-purple-400">Cara Kerja Baru:</strong> AI akan membuat kerangka (plot induk) untuk {babCount} bab terlebih dahulu. 
                Setelah itu, Anda bisa membaca dan mengedit Bab 1, lalu klik <strong className="text-emerald-400">"Generate Bab Selanjutnya"</strong> 
                untuk menulis bab berikutnya satu per satu. Setiap bab akan otomatis diringkas sebagai memori cerita!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
