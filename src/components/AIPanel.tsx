import { Wand2, Play } from 'lucide-react';
import { Editor } from '@tiptap/react';
import { generateAIContent } from '../utils/ai';
import { useRef, useEffect } from 'react';

interface AIPanelProps {
  editor: Editor | null;
  isGenerating: boolean;
  setIsGenerating: (val: boolean) => void;
  currentChapterTitle?: string;
  previousChapterTitle?: string;
  previousChapterContent?: string;
}

export default function AIPanel({ 
  editor, 
  isGenerating, 
  setIsGenerating,
  currentChapterTitle,
  previousChapterTitle,
  previousChapterContent
}: AIPanelProps) {

  const typingTimeoutRef = useRef<any>(null);

  // Bersihkan timeout saat komponen dilepas untuk menghindari kebocoran memori
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const generateAI = async (promptType: string) => {
    if (!editor) return;

    setIsGenerating(true);
    try {
      // 1. Ambil Konteks dari LocalStorage
      const savedChars = localStorage.getItem('fictify-characters');
      const savedWorld = localStorage.getItem('fictify-worldview');
      
      let contextStr = '--- KONTEKS CERITA ---\n';
      
      if (savedWorld) {
        const w = JSON.parse(savedWorld);
        contextStr += `ATURAN DUNIA:\n- Sistem Sihir: ${w.magicSystem}\n- Geografi: ${w.geography}\n- Sejarah: ${w.history}\n\n`;
      }
      
      if (savedChars) {
        const c = JSON.parse(savedChars);
        contextStr += 'KARAKTER YANG ADA:\n';
        c.forEach((char: any) => {
          contextStr += `- ${char.name} (${char.role}): ${char.background}\n`;
        });
        contextStr += '\n';
      }
      contextStr += '----------------------\n\n';

      const currentText = editor.getText();
      let promptText = '';

      if (promptType === 'continue') {
         // Parse ringkasan dari Outliner
         const currentContent = editor.getHTML();
         const tempDivParse = document.createElement('div');
         tempDivParse.innerHTML = currentContent;
         let chapterSummary = '';
         const allH2 = tempDivParse.querySelectorAll('h2');
         allH2.forEach(h2 => {
           if (h2.textContent?.includes('Ringkasan Plot')) {
             const next = h2.nextElementSibling;
             if (next) chapterSummary = next.textContent || '';
           }
         });

         let previousChContext = '';
         if (previousChapterTitle && previousChapterContent) {
           const tempDiv = document.createElement('div');
           tempDiv.innerHTML = previousChapterContent;
           const plainTextPrev = tempDiv.innerText || tempDiv.textContent || '';
           
           const cleanPrev = plainTextPrev
             .replace(/Ringkasan Plot Bab:/g, '')
             .replace(/Mulai ceritamu di sini\.\.\./g, '')
             .trim();

           if (cleanPrev.length > 10) {
              const MAX_PREV = 8000;
              let sampleText = cleanPrev;
              if (cleanPrev.length > MAX_PREV) {
                const head = cleanPrev.substring(0, 4000);
                const tail = cleanPrev.substring(cleanPrev.length - 4000);
                sampleText = `${head}\n\n[...${cleanPrev.length - 8000} karakter dilewati...]\n\n${tail}`;
              }
             previousChContext = `--- ISI BAB SEBELUMNYA: ${previousChapterTitle} ---\n${sampleText}\n-------------------------------------------------\n\n`;
           }
         }

         const activeChHeader = currentChapterTitle 
           ? `--- BAB SAAT INI YANG SEDANG DITULIS: ${currentChapterTitle} ---\n\n` 
           : '';

         promptText = `${chapterSummary ? `[RENCANA BAB INI]: ${chapterSummary}\n\n` : ''}${contextStr}${previousChContext}${activeChHeader}Kamu adalah seorang novelis/sastrawan Indonesia kontemporer berbakat besar. Gaya menulismu sangat organik, hidup, realistis, dan emosional, sangat jauh dari gaya tulisan AI yang klise, kaku, atau seragam.

Berdasarkan konteks dunia, karakter, dan cerita yang sudah ada di bawah, lanjutkan cerita untuk "${currentChapterTitle || 'Bab Aktif'}" dengan mematuhi aturan penulisan manusia berikut secara MUTLAK:

1. **Prinsip "Show, Don't Tell" (Tunjukkan, Jangan Beritahu)**:
   Jangan menulis kesimpulan abstrak (misal: "Dia merasa sangat sedih" atau "suasana mencekam"). Tunjukkan suasana, emosi, atau ketegangan melalui detail fisik, sensorik (suara, bau, suhu, sentuhan), tindakan karakter, atau reaksi tubuh nyata (misal: genggaman tangan mengencang, nafas tercekat, suara langkah kaki di kayu rapuk).

2. **DILARANG MENGGUNAKAN KATA & TRANSISI KLISE AI**:
   - Jangan pernah memulai paragraf dengan kata transisi malas seperti "Malam itu", "Sementara itu", "Tiba-tiba", "Namun", "Di balik dinding...", "Senja mulai...", atau sejenisnya.
   - Hindari metafora klise seperti "senyuman misterius", "mata yang berapi-api", "langit seolah menangisi", "jantung yang berdegup kencang seperti genderang perang". Gunakan analogi yang segar, sederhana, jujur, dan tidak pasaran.

3. **Gaya Bahasa Organik & Variasi Kalimat**:
   - Tulis dengan kombinasi kalimat pendek yang dinamis (untuk ketegangan/aksi) dan kalimat panjang yang mengalir (untuk deskripsi). Jangan buat semua kalimat memiliki panjang yang sama.
   - Gunakan dialog yang terdengar natural saat diucapkan manusia asli secara langsung, bukan dialog formal seperti buku pelajaran. Gunakan subteks (karakter tidak selalu mengatakan apa yang mereka rasakan secara langsung).

4. **Haram Hukumnya Membuat Paragraf Kesimpulan/Refleksi**:
   AI sering sekali mengakhiri tulisan dengan paragraf atau kalimat filosofis klise yang merangkum masa depan atau makna perjuangan (misal: "Mereka tahu malam ini baru permulaan dari perjuangan panjang..."). HAPUS kebiasaan ini! Akhiri adegan ini secara menggantung alami di tengah-tengah ketegangan atau aksi, tanpa rangkuman moral apapun.

5. **Dilarang Melompat Bab**:
   Jangan buat judul bab baru, jangan tulis tanda pemisah bab, dan jangan melompat menulis bab lain (seperti menulis '**Bab 5**', '**Bab 6**', dll). Fokus melanjutkan adegan aktif dari baris terakhir cerita saat ini.

Tulis kelanjutan cerita sebanyak 2-3 paragraf saja yang menyatu secara sempurna dari cerita di bawah ini:

Cerita saat ini:
${currentText}`;
      } else if (promptType === 'improve') {
         promptText = `Kamu adalah editor novel profesional. Perbaiki gaya bahasa dari cerita berikut agar terasa ditulis oleh sastrawan manusia yang sangat berbakat, bukan oleh AI kaku.

ATURAN PERBAIKAN:
1. Terapkan prinsip "Show, Don't Tell" secara mendalam. Ubah deskripsi emosi abstrak menjadi aksi fisik atau detail sensorik.
2. Hapus semua transisi klise khas AI (seperti "Malam itu", "Sementara itu", "Tiba-tiba") dan ubah menjadi alur adegan yang mengalir alami.
3. Buat dialog terasa lebih hidup, tidak kaku, dan realistis seperti cara orang Indonesia berbicara sehari-hari.
4. Pertahankan plot dan inti cerita aslinya, namun poles diksi (pilihan kata) agar lebih kaya, tidak repetitif, dan memiliki jiwa.
5. Hapus semua paragraf kesimpulan moralistik atau kalimat filosofis klise di akhir cerita jika ada.

Teks yang akan diperbaiki:
\n\n${currentText}`;
      } else if (promptType === 'idea') {
         promptText = `${contextStr}Berdasarkan cerita berikut dan aturan dunia di atas, berikan 3 ide konflik atau plot twist yang bisa terjadi selanjutnya yang orisinal, mengejutkan, dan tidak klise seperti pola cerita AI standard:\n\n${currentText}`;
      }

      const temps: Record<string, number> = { continue: 0.4, improve: 0.3, idea: 0.85 };
      const aiResult = await generateAIContent([{ role: 'user', text: promptText }], temps[promptType] ?? 0.7);

      if (promptType === 'idea') {
        alert(aiResult); 
        setIsGenerating(false);
      } else {
        // Efek Mengetik Seperti Manusia (Typewriter Effect)
        let index = 0;
        editor.commands.insertContent('\n\n'); // Sisipkan baris baru awal

        const typeNextChar = () => {
          if (index < aiResult.length) {
            const char = aiResult[index];
            editor.commands.insertContent(char);
            index++;
            
            // Kecepatan mengetik dinamis (10ms - 35ms) agar terlihat seperti manusia asli mengetik
            const delay = Math.random() * 25 + 10;
            typingTimeoutRef.current = setTimeout(typeNextChar, delay);
          } else {
            setIsGenerating(false);
          }
        };

        typeNextChar();
      }
    } catch (error: any) {
      console.error(error);
      alert('Terjadi kesalahan saat memanggil AI: ' + error.message);
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-72 bg-gray-950 border-l border-gray-800 p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-6 text-purple-400">
        <Wand2 className="w-5 h-5" />
        <h3 className="font-semibold tracking-wide">Asisten AI</h3>
      </div>

      <div className="space-y-3">
        <button 
          onClick={() => generateAI('continue')}
          disabled={isGenerating}
          className="w-full flex items-center justify-between bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white p-3 rounded-lg transition-all shadow-lg shadow-purple-900/20 active:scale-95 disabled:opacity-50"
        >
          <span className="font-medium">Lanjutkan Cerita</span>
          <Play className="w-4 h-4" />
        </button>

        <button 
          onClick={() => generateAI('improve')}
          disabled={isGenerating}
          className="w-full flex items-center justify-between bg-gray-800 hover:bg-gray-700 text-gray-200 p-3 rounded-lg border border-gray-700 transition-all active:scale-95 disabled:opacity-50"
        >
          <span className="font-medium">Perbaiki Bahasa</span>
        </button>

        <button 
          onClick={() => generateAI('idea')}
          disabled={isGenerating}
          className="w-full flex items-center justify-between bg-gray-800 hover:bg-gray-700 text-gray-200 p-3 rounded-lg border border-gray-700 transition-all active:scale-95 disabled:opacity-50"
        >
          <span className="font-medium">Minta Ide Plot</span>
        </button>
      </div>

      <div className="mt-8 p-4 bg-gray-900 rounded-lg border border-gray-800 text-sm text-gray-400 leading-relaxed">
        <p>💡 <b>Kecerdasan Konteks:</b> Saat Anda menekan "Lanjutkan Cerita", AI akan diam-diam membaca profil karakter dan aturan dunia Anda terlebih dahulu!</p>
      </div>
    </div>
  );
}
