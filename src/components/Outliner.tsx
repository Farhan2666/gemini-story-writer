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
      // Build Rich Context
      const savedChars = localStorage.getItem('fictify-characters');
      const savedRels = localStorage.getItem('fictify-relationships');
      const savedWorld = localStorage.getItem('fictify-worldview');

      let characterContext = '';
      if (savedChars) {
        const chars = JSON.parse(savedChars);
        characterContext += 'DAFTAR KARAKTER:\n';
        chars.forEach((char: any) => {
          characterContext += `- ${char.name} (${char.role || 'Figuran'}): ${char.background || 'Tidak ada deskripsi.'}\n`;
        });

        if (savedRels) {
          const rels = JSON.parse(savedRels);
          const activeRels = rels.filter((r: any) =>
            chars.some((c: any) => c.id === r.fromId) && chars.some((c: any) => c.id === r.toId)
          );
          if (activeRels.length > 0) {
            characterContext += '\nHUBUNGAN ANTAR KARAKTER:\n';
            activeRels.forEach((r: any) => {
              const from = chars.find((c: any) => c.id === r.fromId);
              const to = chars.find((c: any) => c.id === r.toId);
              if (from && to) {
                characterContext += `- ${from.name} ↔ ${to.name}: ${r.type}\n`;
              }
            });
          }
        }
      }

      let worldContext = '';
      if (savedWorld) {
        const w = JSON.parse(savedWorld);
        worldContext += 'ATURAN DUNIA:\n';
        if (w.magicSystem) worldContext += `- Sistem Kekuatan/Sihir: ${w.magicSystem}\n`;
        if (w.geography) worldContext += `- Geografi & Lokasi: ${w.geography}\n`;
        if (w.history) worldContext += `- Sejarah & Faksi: ${w.history}\n`;
      }

      const systemPrompt = `Anda adalah seorang novelis dan arsitek cerita jenius. Tugas Anda adalah merancang kerangka novel yang kokoh, berdimensi, dan penuh ketegangan dramatik.

[PRINSIP KERANGKA CERITA]
1. STRUKTUR 3 BABAK: Setiap bab harus punya fungsi naratif — pembukaan (exposition), penanaman konflik (rising action), atau klimaks/resolusi parsial.
2. KARAKTER BERCERITA: Jangan buat bab yang hanya deskripsi dunia. Setiap bab harus dimajukan oleh keputusan atau reaksi karakter.
3. KETEGANGAN BERJENJANG: Konflik tidak harus selesai di satu bab. Biarkan misteri menggantung, tanam pertanyaan yang membuat pembaca ingin lanjut ke bab berikutnya.
4. VARIASI EMOSI: Campur ketegangan, kehangatan, kesedihan, dan kejutan dalam proporsi yang alami — jangan datar.
5. KONSISTENSI LORE: Patuhi aturan dunia dan karakter yang sudah ditetapkan.

${worldContext ? `${worldContext}\n` : ''}${characterContext ? `${characterContext}\n` : ''}

[FORMAT OUTPUT]
RESPON WAJIB BERUPA JSON ARRAY TANPA markdown backticks, dengan format:
[
  {
    "title": "Judul Bab yang Menarik",
    "summary": "Ringkasan naratif 2-3 kalimat tentang apa yang terjadi di bab ini, konflik apa yang muncul, dan bagaimana perasaan/perubahan karakter."
  }
]`;

      const reply = await generateAIContent(
        [{ role: 'user', text: `Buatkan kerangka cerita 3-5 bab berdasarkan premis berikut:\n\nPremis: "${premise}"` }],
        0.7,
        systemPrompt
      );
      
      const cleanedReply = reply.replace(/```json/g, '').replace(/```/g, '').trim();
      const generatedChapters = JSON.parse(cleanedReply);

      if (Array.isArray(generatedChapters)) {
        const mappedChapters = generatedChapters.map((ch: any) => ({
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
              Tuliskan 1 kalimat ide mentah Anda. Fictify akan merakitnya menjadi kerangka bab yang utuh dan otomatis membuatkan kerangkanya di daftar bab Anda!
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
                    <span>Fictify Sedang Merakit Cerita...</span>
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
