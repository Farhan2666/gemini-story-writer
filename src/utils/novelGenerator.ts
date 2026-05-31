import { generateAIContent, sanitizeJSONResponse } from './ai';

// ─── Data Structures ─────────────────────────────────────────────────────────

export interface ChapterMeta {
  title: string;
  chapter_type: "Action/Scene" | "Reaction/Sequel";
  story_beat: string;
  goal: string;
  ending: string;
}

export type PlotBab = ChapterMeta;

export interface CharacterStatus {
  name: string;
  health: string;
  inventory: string[];
  current_location: string;
}

export interface NovelLoreState {
  unresolved_mysteries: string[];
  character_status: CharacterStatus[];
  recent_events_summary: string;
}

export interface NovelMeta {
  premise: string;
  targetBabCount: number;
  plotInduk: ChapterMeta[];
  generatedBabCount: number;
  chapterSummaries: Record<string, string>;
  isComplete: boolean;
  loreState: NovelLoreState;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function emptyLoreState(): NovelLoreState {
  return {
    unresolved_mysteries: [],
    character_status: [],
    recent_events_summary: "",
  };
}

export function buildCharacterContext(): string {
  let result = '';
  try {
    const savedChars = localStorage.getItem('fictify-characters');
    const savedRels = localStorage.getItem('fictify-relationships');
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
            if (from && to) result += `- ${from.name} ↔ ${to.name}: ${r.type}\n`;
          });
        }
      }
    }
  } catch { /* silent */ }
  return result;
}

export function buildWorldContext(): string {
  try {
    const savedWorld = localStorage.getItem('fictify-worldview');
    if (!savedWorld) return '';
    const w = JSON.parse(savedWorld);
    let result = 'ATURAN DUNIA:\n';
    if (w.magicSystem) result += `- Sistem Kekuatan/Sihir: ${w.magicSystem}\n`;
    if (w.geography) result += `- Geografi & Lokasi: ${w.geography}\n`;
    if (w.history) result += `- Sejarah & Faksi: ${w.history}\n`;
    return result;
  } catch { return ''; }
}

// ─── COMMAND 2: Refactor Outline Generation ─────────────────────────────────

export async function generatePlotOutline(premise: string, targetBabCount: number): Promise<ChapterMeta[]> {
  const characterContext = buildCharacterContext();
  const worldContext = buildWorldContext();

  const systemPrompt = `You are a master narrative designer. Generate a plot outline for a novel. You must output a valid JSON object where each key represents a chapter (e.g., 'chapter_1') and the value matches this exact interface: { title: string, chapter_type: 'Action/Scene' | 'Reaction/Sequel', story_beat: string, goal: string, ending: string }. 
STRICT RULES:
1. Map out the story beats logically across the total requested chapters (e.g., Setup, Inciting Incident, Midpoint, Climax, Resolution).
2. Strictly alternate the 'chapter_type' between 'Action/Scene' (must end in a disaster or complication) and 'Reaction/Sequel' (must end in a new decision or goal).
3. Generate exactly ${targetBabCount} chapters.`;

  const contextBlock = [
    characterContext ? `CHARACTERS:\n${characterContext}` : '',
    worldContext ? `WORLD:\n${worldContext}` : '',
    `PREMISE:\n${premise}`,
  ].filter(Boolean).join('\n');

  const reply = await generateAIContent(
    [{ role: 'user', text: contextBlock }],
    0.3,
    systemPrompt,
    true
  );

  const cleanedReply = sanitizeJSONResponse(reply);
  const parsed = JSON.parse(cleanedReply);

  // Handle both object { chapter_1: {...} } and array formats
  const entries: ChapterMeta[] = [];

  if (Array.isArray(parsed)) {
    parsed.forEach((ch: any, i: number) => {
      entries.push({
        title: ch.title || `Bab ${i + 1}`,
        chapter_type: ch.chapter_type === "Reaction/Sequel" ? "Reaction/Sequel" : "Action/Scene",
        story_beat: ch.story_beat || "Rising Action",
        goal: ch.goal || "",
        ending: ch.ending || (i % 2 === 0 ? "Disaster — komplikasi tak terduga menggagalkan rencana." : "Decision — karakter mengambil keputusan baru."),
      });
    });
  } else if (typeof parsed === 'object' && parsed !== null) {
    const sortedKeys = Object.keys(parsed).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10);
      const numB = parseInt(b.replace(/\D/g, ''), 10);
      return (isNaN(numA) ? 0 : numA) - (isNaN(numB) ? 0 : numB);
    });
    sortedKeys.forEach((key, i) => {
      const ch = parsed[key];
      entries.push({
        title: ch.title || `Bab ${i + 1}`,
        chapter_type: ch.chapter_type === "Reaction/Sequel" ? "Reaction/Sequel" : "Action/Scene",
        story_beat: ch.story_beat || "Rising Action",
        goal: ch.goal || "",
        ending: ch.ending || (i % 2 === 0 ? "Disaster — komplikasi tak terduga menggagalkan rencana." : "Decision — karakter mengambil keputusan baru."),
      });
    });
  } else {
    throw new Error("Format balasan AI tidak sesuai: bukan array atau object.");
  }

  if (entries.length !== targetBabCount) {
    // Pad or trim to match target
    while (entries.length < targetBabCount) {
      const i = entries.length;
      entries.push({
        title: `Bab ${i + 1}: [Lanjutan]`,
        chapter_type: i % 2 === 0 ? "Action/Scene" : "Reaction/Sequel",
        story_beat: "Rising Action",
        goal: "Melanjutkan perjuangan karakter.",
        ending: i % 2 === 0 ? "Disaster — komplikasi tak terduga menggagalkan rencana." : "Decision — karakter mengambil keputusan baru.",
      });
    }
  }

  return entries;
}

// ─── COMMAND 3: Refactor Chapter Generation ─────────────────────────────────

export async function generateChapter(
  chapterMeta: ChapterMeta,
  novelLoreState: NovelLoreState,
  previousChapterContent?: string,
): Promise<string> {
  let previousChapterText = '';
  if (previousChapterContent) {
    try {
      const div = document.createElement('div');
      div.innerHTML = previousChapterContent;
      const plainText = div.innerText || div.textContent || '';
      const cleanText = plainText.replace(/Mulai ceritamu di sini\.\.\./g, '').trim();
      if (cleanText.length > 10) {
        previousChapterText = cleanText.length > 4000
          ? cleanText.slice(0, cleanText.lastIndexOf('\n', 4000)) + `\n[... ${cleanText.length - 4000} karakter terpotong ...]`
          : cleanText;
      }
    } catch { /* silent */ }
  }

  const systemPrompt = `You are an expert novelist. Write the next chapter of the story.
[CHAPTER METADATA]:
- Title: ${chapterMeta.title}
- Type: ${chapterMeta.chapter_type}
- Beat: ${chapterMeta.story_beat}
- Goal: ${chapterMeta.goal}
- Ending: ${chapterMeta.ending}

[CURRENT WORLD LORE]:
- Recent Events: ${novelLoreState.recent_events_summary}
- Character Status: ${JSON.stringify(novelLoreState.character_status)}
- Unresolved Mysteries: ${JSON.stringify(novelLoreState.unresolved_mysteries)}

STRICT RULES:
1. Pacing: If Type is 'Reaction/Sequel', prioritize internal monologue, worldbuilding, and planning. If 'Action/Scene', prioritize physical conflict and stakes.
2. Causality: Events MUST follow a 'Therefore' or 'But' logic derived directly from the 'Recent Events'. NEVER use episodic 'And then' transitions.
3. Show, Don't Tell: Prohibit emotional labels (e.g., angry, sad). Dramatize through physical reactions and micro-expressions. Include at least three sensory details (sight, sound, smell/touch) per scene.
4. Continuity (Chekhov's Gun): Strictly adhere to the 'Character Status'. Do not invent new inventory items, change locations randomly, or heal injuries unless explicitly written in the scene.
Write ONLY the story content.`;

  const userMsg = previousChapterText
    ? `Teks bab sebelumnya (untuk kontinuitas gaya dan alur):\n${previousChapterText}\n\nTulis bab selanjutnya berdasarkan metadata dan lore di atas.`
    : `Tulis bab baru berdasarkan metadata dan lore di atas.`;

  const reply = await generateAIContent(
    [{ role: 'user', text: userMsg }],
    0.7,
    systemPrompt
  );

  return reply;
}

// ─── Chapter summarization ──────────────────────────────────────────────────

export async function summarizeChapterContent(chapterContent: string): Promise<string> {
  const systemPrompt = `Buatlah ringkasan 1 paragraf (2-3 kalimat) dari bab novel berikut. Ringkasan harus mencakup kejadian penting, konflik, dan perkembangan karakter. Gunakan bahasa Indonesia yang padat dan informatif.`;

  const reply = await generateAIContent(
    [{ role: 'user', text: `Ringkas bab berikut dalam 1 paragraf:\n\n${chapterContent}` }],
    0.3,
    systemPrompt
  );

  return reply.trim();
}

// ─── COMMAND 4: Implement Lore Extraction ────────────────────────────────────

export async function extractLoreAndUpdateState(
  chapterContent: string,
  previousLoreState?: NovelLoreState,
): Promise<NovelLoreState> {
  let plainText = '';
  try {
    const div = document.createElement('div');
    div.innerHTML = chapterContent;
    plainText = div.innerText || div.textContent || '';
  } catch {
    plainText = chapterContent;
  }

  const prev = previousLoreState || emptyLoreState();
  const prevStateJson = JSON.stringify(prev);

  const systemPrompt = `You are a precise narrative state tracker. Read the newly generated chapter and the previous NovelLoreState, then output an updated JSON matching the NovelLoreState interface exactly: { unresolved_mysteries: string[], character_status: array, recent_events_summary: string }.
STRICT RULES:
1. recent_events_summary: Summarize the new chapter in under 300 words.
2. character_status: Update locations, add new injuries, and add/remove inventory items based ONLY on what happened in the chapter.
3. unresolved_mysteries: Append new mysteries or remove resolved ones.`;

  const reply = await generateAIContent(
    [{ role: 'user', text: `Previous NovelLoreState:\n${prevStateJson}\n\nNew chapter text:\n${plainText}` }],
    0.3,
    systemPrompt,
    true
  );

  const cleaned = sanitizeJSONResponse(reply);

  try {
    const parsed = JSON.parse(cleaned);
    return {
      unresolved_mysteries: Array.isArray(parsed.unresolved_mysteries) ? parsed.unresolved_mysteries : prev.unresolved_mysteries,
      character_status: Array.isArray(parsed.character_status) ? parsed.character_status : prev.character_status,
      recent_events_summary: typeof parsed.recent_events_summary === 'string' ? parsed.recent_events_summary : prev.recent_events_summary,
    };
  } catch {
    // Fallback: return previous state unchanged
    return prev;
  }
}
