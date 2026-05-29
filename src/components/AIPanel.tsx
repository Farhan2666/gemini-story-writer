import { Wand2, Play } from 'lucide-react';
import { Editor } from '@tiptap/react';
import { generateAIContent } from '../utils/ai';
import { buildCharacterContext, buildWorldContext } from '../utils/novelGenerator';
import { useRef, useEffect } from 'react';

interface AIPanelProps {
  editor: Editor | null;
  isGenerating: boolean;
  setIsGenerating: (val: boolean) => void;
  previousChapterTitle?: string;
  previousChapterContent?: string;
}

export default function AIPanel({ 
  editor, 
  isGenerating, 
  setIsGenerating,
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

  const getChapterSummary = (): string => {
    const html = editor?.getHTML() || '';
    const div = document.createElement('div');
    div.innerHTML = html;
    const headings = div.querySelectorAll('h2');
    for (const h2 of headings) {
      if (h2.textContent?.includes('Ringkasan Plot')) {
        const next = h2.nextElementSibling;
        if (next) return next.textContent || '';
      }
    }
    return '';
  };

  const buildNovelMetaContext = (): string => {
    try {
      const saved = localStorage.getItem('fictify-novel-meta');
      if (!saved) return '';
      const meta = JSON.parse(saved);
      let result = '';

      result += `PLOT UTAMA NOVEL (${meta.plotInduk.length} bab):\n`;
      meta.plotInduk.forEach((plot: any, i: number) => {
        const status = i < meta.generatedBabCount ? '[SUDAH DITULIS]' : (i === meta.generatedBabCount ? '[SEDANG DITULIS]' : '[BELUM]');
        result += `  Bab ${i + 1}: ${plot.title} ${status}\n`;
      });

      const summaries = Object.entries(meta.chapterSummaries || {});
      if (summaries.length > 0) {
        result += '\nRINGKASAN BAB-BAB SEBELUMNYA (Rolling Memory):\n';
        summaries.forEach(([, summary]) => {
          result += `- ${summary}\n`;
        });
      }

      return result;
    } catch {
      return '';
    }
  };

  const generateAI = async (promptType: string) => {
    if (!editor) return;

    setIsGenerating(true);
    try {
      const characterContext = buildCharacterContext();
      const worldContext = buildWorldContext();
      const currentText = editor.getText();
      const chapterSummary = getChapterSummary();

      // Prepare previous chapter text (8000 chars max)
      let previousChapterText = '';
      if (previousChapterTitle && previousChapterContent) {
        const div = document.createElement('div');
        div.innerHTML = previousChapterContent;
        const plainText = div.innerText || div.textContent || '';
        const cleanText = plainText
          .replace(/Ringkasan Plot Bab:/g, '')
          .replace(/Mulai ceritamu di sini\.\.\./g, '')
          .trim();

        if (cleanText.length > 10) {
          if (cleanText.length > 8000) {
            const before = cleanText.substring(0, 8000);
            const breakPoint = before.lastIndexOf('\n');
            if (breakPoint > 100) {
              previousChapterText = before.substring(0, breakPoint) +
                `\n\n[...${cleanText.length - 8000} karakter...]\n\n`;
            } else {
              previousChapterText = before +
                `\n\n[...${cleanText.length - 8000} karakter...]\n\n`;
            }
          } else {
            previousChapterText = cleanText;
          }
        }
      }

      if (promptType === 'continue') {
        const novelMetaContext = buildNovelMetaContext();

        const masterSystemPrompt = `Anda adalah seorang AI Asisten Penulis Novel Profesional dan Co-Writer handal. Tugas Anda adalah membantu menulis, melanjutkan, dan memoles cerita secara organik dengan standar sastra yang tinggi.

[PRINSIP UTAMA PENULISAN]
1. GAYA "SHOW, DON'T TELL": Jangan sekadar menyebutkan emosi karakter secara literal (misal: "Dia sedang sedih"). Tunjukkan emosi tersebut melalui bahasa tubuh, ekspresi wajah, tindakan fisik, perubahan nada suara, atau reaksi fisiologis secara mendalam dan deskriptif.
2. DIALOG ORGANIK: Tulis dialog yang terdengar natural bagi manusia. Hindari dialog yang terlalu kaku, ekspositori (menjelaskan plot lewat obrolan secara dipaksakan), atau terdengar formal seperti teks akademis.
3. BEBAS KLISE & METAFORA SEGAR: Hindari frasa transisi atau kiasan klise (contoh: "Waktu berlalu begitu cepat", "Matahari terbit memberikan secercah harapan"). Gunakan deskripsi latar suasana dan analogi yang unik serta segar.
4. PROGRESI PROSA: Tulis cerita dengan alur yang mengalir lancar. Jangan terburu-buru menyelesaikan adegan atau konflik dalam satu-dua paragraf. Berikan ruang bagi ketegangan dan atmosfer cerita untuk berkembang.
5. TANPA RINGKASAN: Jangan pernah memberikan kesimpulan, moral cerita, atau ringkasan plot di akhir teks buatan Anda. Berhentilah menulis tepat pada kalimat cerita terakhir secara natural.

[KONSISTENSI KARAKTER & PETA HUBUNGAN]
Anda wajib patuh pada detail karakter yang terlibat di bawah ini. Jaga agar tindakan, cara berbicara, dan keputusan mereka tetap konsisten dengan kepribadian dan dinamika hubungan mereka:
${characterContext}

[ARAHAN PLOT NOVEL - Patuhi plot induk ini]
${novelMetaContext || 'Tidak ada plot induk yang ditetapkan.'}

[STRUKTUR & KONTEKS ACUAN]
Gunakan potongan teks bab sebelumnya dan teks aktif saat ini sebagai fondasi kontinuitas agar tidak terjadi lubang plot (plot hole) atau perubahan suasana yang mendadak:
- Ringkasan Plot Bab Ini: ${chapterSummary || 'Tidak ada ringkasan plot khusus.'}
- Akhir Bab Sebelumnya: ${previousChapterText || 'Tidak ada bab sebelumnya.'}
- Teks Aktif Saat Ini (Gunakan teks ini sebagai pijakan melompat): ${currentText}

[TUGAS ANDA]
Lanjutkan cerita di atas sebanyak 2-3 paragraf berikutnya. Langsung mulai dari kelanjutan kalimat/paragraf terakhir dari "Teks Aktif Saat Ini" tanpa menulis ulang teks yang sudah ada, tanpa salam pembuka, dan tanpa tanda kutip pembungkus cerita. Tulis kelanjutan cerita secara organik dan mengalir.`;

        const aiResult = await generateAIContent(
          [{ role: 'user', text: 'Lanjutkan cerita berdasarkan konteks yang diberikan.' }],
          0.7,
          masterSystemPrompt
        );

        let index = 0;
        editor.commands.insertContent('\n\n');

        const typeNextChar = () => {
          if (index < aiResult.length) {
            editor.commands.insertContent(aiResult[index]);
            index++;
            const delay = Math.random() * 25 + 10;
            typingTimeoutRef.current = setTimeout(typeNextChar, delay);
          } else {
            setIsGenerating(false);
          }
        };
        typeNextChar();

      } else if (promptType === 'improve') {
        const systemPrompt = `Anda adalah editor novel profesional. Perbaiki gaya bahasa dari cerita berikut agar terasa ditulis oleh sastrawan manusia yang sangat berbakat, bukan oleh AI kaku.

ATURAN PERBAIKAN:
1. Terapkan prinsip "Show, Don't Tell" secara mendalam. Ubah deskripsi emosi abstrak menjadi aksi fisik atau detail sensorik.
2. Hapus semua transisi klise khas AI dan ubah menjadi alur adegan yang mengalir alami.
3. Buat dialog terasa lebih hidup, tidak kaku, dan realistis seperti cara orang Indonesia berbicara sehari-hari.
4. Pertahankan plot dan inti cerita aslinya, namun poles diksi agar lebih kaya, tidak repetitif, dan memiliki jiwa.
5. Hapus semua paragraf kesimpulan moralistik atau kalimat filosofis klise di akhir cerita jika ada.`;

        const aiResult = await generateAIContent(
          [{ role: 'user', text: `Teks yang akan diperbaiki:\n\n${currentText}` }],
          0.3,
          systemPrompt
        );

        let index = 0;
        editor.commands.setContent('');

        const typeNextChar = () => {
          if (index < aiResult.length) {
            editor.commands.insertContent(aiResult[index]);
            index++;
            const delay = Math.random() * 15 + 5;
            typingTimeoutRef.current = setTimeout(typeNextChar, delay);
          } else {
            setIsGenerating(false);
          }
        };
        typeNextChar();

      } else if (promptType === 'idea') {
        const novelMetaContext = buildNovelMetaContext();
        const systemPrompt = `Anda adalah seorang kreator cerita yang jenius dan out-of-the-box. Berdasarkan konteks dunia, karakter, dan cerita yang ada, berikan 3 ide konflik atau plot twist orisinal yang mengejutkan dan tidak klise.

${worldContext ? `${worldContext}\n` : ''}${characterContext}
${novelMetaContext ? `\n[PLOT UTAMA NOVEL - Pastikan ide sesuai arah cerita]:\n${novelMetaContext}` : ''}`;

        const aiResult = await generateAIContent(
          [{ role: 'user', text: `Berdasarkan cerita berikut, berikan 3 ide konflik atau plot twist yang bisa terjadi selanjutnya:\n\n${currentText}` }],
          0.85,
          systemPrompt
        );

        alert(aiResult);
        setIsGenerating(false);
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
