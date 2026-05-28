import { generateAIContent } from './ai';

export interface PlotBab {
  title: string;
  summary: string;
}

export interface NovelMeta {
  premise: string;
  targetBabCount: number;
  plotInduk: PlotBab[];
  generatedBabCount: number;
  chapterSummaries: Record<string, string>;
  isComplete: boolean;
}

function buildCharacterContext(): string {
  const savedChars = localStorage.getItem('fictify-characters');
  const savedRels = localStorage.getItem('fictify-relationships');
  let result = '';

  if (savedChars) {
    const chars = JSON.parse(savedChars);
    result += 'DAFTAR KARAKTER:\n';
    chars.forEach((char: any) => {
      result += `- ${char.name} (${char.role || 'Figuran'}): ${char.background || 'Tidak ada deskripsi.'}\n`;
    });

    if (savedRels) {
      const rels = JSON.parse(savedRels);
      const activeRels = rels.filter((r: any) =>
        chars.some((c: any) => c.id === r.fromId) && chars.some((c: any) => c.id === r.toId)
      );
      if (activeRels.length > 0) {
        result += '\nHUBUNGAN ANTAR KARAKTER:\n';
        activeRels.forEach((r: any) => {
          const from = chars.find((c: any) => c.id === r.fromId);
          const to = chars.find((c: any) => c.id === r.toId);
          if (from && to) {
            result += `- ${from.name} ↔ ${to.name}: ${r.type}\n`;
          }
        });
      }
    }
  }
  return result;
}

function buildWorldContext(): string {
  const savedWorld = localStorage.getItem('fictify-worldview');
  if (!savedWorld) return '';
  const w = JSON.parse(savedWorld);
  let result = 'ATURAN DUNIA:\n';
  if (w.magicSystem) result += `- Sistem Kekuatan/Sihir: ${w.magicSystem}\n`;
  if (w.geography) result += `- Geografi & Lokasi: ${w.geography}\n`;
  if (w.history) result += `- Sejarah & Faksi: ${w.history}\n`;
  return result;
}

export async function generatePlotOutline(premise: string, targetBabCount: number): Promise<PlotBab[]> {
  const characterContext = buildCharacterContext();
  const worldContext = buildWorldContext();

  const systemPrompt = `Anda adalah seorang novelis dan arsitek cerita jenius. Tugas Anda adalah merancang kerangka novel yang kokoh, berdimensi, dan penuh ketegangan dramatik.

[PRINSIP KERANGKA CERITA]
1. STRUKTUR 3 BABAK: Setiap bab harus punya fungsi naratif — pembukaan (exposition), penanaman konflik (rising action), atau klimaks/resolusi parsial.
2. KARAKTER BERCERITA: Jangan buat bab yang hanya deskripsi dunia. Setiap bab harus dimajukan oleh keputusan atau reaksi karakter.
3. KETEGANGAN BERJENJANG: Konflik tidak harus selesai di satu bab. Biarkan misteri menggantung, tanam pertanyaan yang membuat pembaca ingin lanjut ke bab berikutnya.
4. VARIASI EMOSI: Campur ketegangan, kehangatan, kesedihan, dan kejutan dalam proporsi yang alami — jangan datar.
5. KONSISTENSI LORE: Patuhi aturan dunia dan karakter yang sudah ditetapkan.
6. PACING DINAMIS: Bab awal untuk pengenalan, bab tengah untuk pengembangan konflik, bab akhir untuk klimaks dan resolusi.

${worldContext ? `${worldContext}\n` : ''}${characterContext ? `${characterContext}\n` : ''}

[FORMAT OUTPUT]
RESPON WAJIB BERUPA JSON ARRAY TANPA markdown backticks, dengan format:
[
  {
    "title": "Judul Bab yang Menarik",
    "summary": "Ringkasan naratif 2-3 kalimat tentang apa yang terjadi di bab ini, konflik apa yang muncul, dan bagaimana perasaan/perubahan karakter."
  }
]

Buatkan TEPAT ${targetBabCount} bab — tidak kurang, tidak lebih.`;

  const reply = await generateAIContent(
    [{ role: 'user', text: `Buatkan kerangka cerita ${targetBabCount} bab berdasarkan premis berikut:\n\nPremis: "${premise}"` }],
    0.7,
    systemPrompt
  );

  const cleanedReply = reply.replace(/```json/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleanedReply);

  if (!Array.isArray(parsed)) {
    throw new Error("Format balasan AI tidak sesuai.");
  }

  return parsed.map((ch: any) => ({
    title: ch.title,
    summary: ch.summary
  }));
}

export async function generateChapterContent(
  novelMeta: NovelMeta,
  chapterIndex: number,
  lastChapterContent?: string,
): Promise<string> {
  const characterContext = buildCharacterContext();
  const worldContext = buildWorldContext();
  const currentPlot = novelMeta.plotInduk[chapterIndex];

  let previousChaptersSummary = '';
  const summaryEntries = Object.entries(novelMeta.chapterSummaries);
  if (summaryEntries.length > 0) {
    previousChaptersSummary = 'RINGKASAN BAB SEBELUMNYA:\n';
    summaryEntries.forEach(([, summary]) => {
      previousChaptersSummary += `- ${summary}\n`;
    });
  }

  let lastChapterFullText = '';
  if (lastChapterContent) {
    const div = document.createElement('div');
    div.innerHTML = lastChapterContent;
    const plainText = div.innerText || div.textContent || '';
    const cleanText = plainText
      .replace(/Mulai ceritamu di sini\.\.\./g, '')
      .trim();
    if (cleanText.length > 10) {
      if (cleanText.length > 8000) {
        lastChapterFullText = cleanText.substring(0, 4000) +
          `\n\n[...${cleanText.length - 8000} karakter...]\n\n` +
          cleanText.substring(cleanText.length - 4000);
      } else {
        lastChapterFullText = cleanText;
      }
    }
  }

  const systemPrompt = `Anda adalah seorang novelis profesional. Tugas Anda adalah menulis isi novel bab demi bab berdasarkan plot outline yang sudah ditentukan.

[PRINSIP PENULISAN]
1. GAYA "SHOW, DON'T TELL": Tunjukkan emosi melalui bahasa tubuh, ekspresi, tindakan, bukan dengan menyebutkan emosi secara literal.
2. DIALOG ORGANIK: Tulis dialog yang natural, tidak kaku, seperti percakapan sehari-hari dalam bahasa Indonesia.
3. BEBAS KLISE: Hindari frasa transisi klise. Gunakan deskripsi yang unik dan segar.
4. PROGRESI PROSA: Alur mengalir lancar, jangan terburu-buru menyelesaikan adegan.
5. TANPA RINGKASAN: Jangan beri kesimpulan atau moral di akhir. Berhenti natural.

[KONTEKS KARAKTER & DUNIA]
${characterContext}
${worldContext}

[PLOT BAB SAAT INI - Bab ${chapterIndex + 1}]
Judul: ${currentPlot.title}
Sinopsis: ${currentPlot.summary}

${previousChaptersSummary ? `${previousChaptersSummary}\n` : ''}
${lastChapterFullText ? `[TEKS PENUH BAB SEBELUMNYA - untuk menyambung gaya bahasa]:\n${lastChapterFullText}` : ''}

[TUGAS ANDA]
Tulis isi penuh untuk Bab ${chapterIndex + 1} dengan judul "${currentPlot.title}" berdasarkan sinopsis di atas. Tulis dalam format HTML dengan tag <p> untuk setiap paragraf. Mulai langsung dengan konten cerita, tanpa kata pengantar.`;

  const reply = await generateAIContent(
    [{ role: 'user', text: `Tulis Bab ${chapterIndex + 1}: ${currentPlot.title}` }],
    0.7,
    systemPrompt
  );

  return reply;
}

export async function summarizeChapterContent(chapterContent: string): Promise<string> {
  const systemPrompt = `Buatlah ringkasan 1 paragraf (2-3 kalimat) dari bab novel berikut. Ringkasan harus mencakup kejadian penting, konflik, dan perkembangan karakter. Gunakan bahasa Indonesia yang padat dan informatif.`;

  const reply = await generateAIContent(
    [{ role: 'user', text: `Ringkas bab berikut dalam 1 paragraf:\n\n${chapterContent}` }],
    0.3,
    systemPrompt
  );

  return reply.trim();
}
