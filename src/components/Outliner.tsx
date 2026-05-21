import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { generateAIContent } from '../utils/ai';

interface OutlinerProps {
  onChaptersGenerated: (chapters: { title: string; content: string }[]) => void;
}

export default function Outliner({ onChaptersGenerated }: OutlinerProps) {
  const [premise, setPremise] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const generateOutline = async () => {
    if (!premise.trim() || isLoading) return;

    setIsLoading(true);

    try {
      // Build Context
      const savedChars = localStorage.getItem('gemini-characters');
      const savedWorld = localStorage.getItem('gemini-worldview');
      let contextStr = 'Konteks Dunia dan Karakter:\n';
      
      if (savedWorld) {
        const w = JSON.parse(savedWorld);
        contextStr += `ATURAN DUNIA:\nSistem Sihir: ${w.magicSystem}\nGeografi: ${w.geography}\nSejarah: ${w.history}\n\n`;
      }
      
      if (savedChars) {
        const c = JSON.parse(savedChars);
        contextStr += 'KARAKTER:\n';
        c.forEach((char: any) => {
          contextStr += `- ${char.name} (${char.role}): ${char.background}\n`;
        });
        contextStr += '\n';
      }

      const promptText = `Kamu adalah seorang penulis novel jenius. Buatkan kerangka cerita (outline) berdasarkan premis berikut dan konteks dunia yang diberikan.
Premis: "${premise}"

${contextStr}

Tugas:
Pecah cerita ini menjadi 3 sampai 5 bab.
Sertakan ringkasan (summary) apa yang terjadi di setiap bab.
OUTPUT HARUS BERUPA JSON ARRAY murni tanpa markdown backticks (tanpa \`\`\`json), dengan format:
[
  {
    "title": "Judul Bab",
    "summary": "Ringkasan cerita bab ini..."
  }
]`;

      const reply = await generateAIContent([{ role: 'user', text: promptText }]);
      
      // Clean up markdown if AI accidentally includes it
      const cleanedReply = reply.replace(/```json/g, '').replace(/```/g, '').trim();
      const generatedChapters = JSON.parse(cleanedReply);

      if (Array.isArray(generatedChapters)) {
        const mappedChapters = generatedChapters.map(ch => ({
          title: ch.title,
          content: `<h2>Ringkasan Plot Bab:</h2><p><i>${ch.summary}</i></p><p><br></p><p>Mulai ceritamu di sini...</p>`
        }));
        onChaptersGenerated(mappedChapters);
        setPremise('');
      } else {
        throw new Error("Format balasan AI tidak sesuai.");
      }

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
              Tuliskan 1 kalimat ide mentah Anda. Gemini akan merakitnya menjadi kerangka bab yang utuh dan otomatis membuatkan kerangkanya di daftar bab Anda!
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

              <button 
                onClick={generateOutline}
                disabled={isLoading || !premise.trim()}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold tracking-wide shadow-lg shadow-purple-900/50 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 disabled:active:scale-100 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Gemini Sedang Merakit Cerita Anda...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Sihir Kerangka Otomatis</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
