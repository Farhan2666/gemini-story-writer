import { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Loader2 } from 'lucide-react';
import { generateAIContent } from '../utils/ai';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export default function AIChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Halo! Saya asisten tulismu. Tanyakan apa saja tentang plot, atau minta ide nama karakter.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
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

      const systemPrompt = `Anda adalah Co-Writer AI untuk novel fiksi. Anda memahami dunia, karakter, dan relasi mereka secara mendalam.

${worldContext ? `${worldContext}\n` : ''}${characterContext ? `${characterContext}\n` : ''}

[PANDUAN MERESPON]
1. Jawab pertanyaan user secara kontekstual berdasarkan lore dunia dan karakter yang sudah ditetapkan.
2. Jika ditanya ide cerita, gunakan prinsip "Show, Don't Tell" — beri saran yang spesifik dan dapat ditulis, bukan abstrak.
3. Jaga konsistensi: jangan menyarankan plot yang bertentangan dengan aturan dunia atau kepribadian karakter.
4. Jika user bertanya di luar konteks cerita, tetap bantu dengan ramah.`;

      const apiHistory = messages.slice(1).map(m => ({
        role: m.role,
        text: m.text
      }));

      const reply = await generateAIContent(
        [
          ...apiHistory,
          { role: 'user', text: userMsg }
        ],
        0.7,
        systemPrompt
      );
      
      setMessages(prev => [...prev, { role: 'model', text: '' }]);
      let index = 0;
      let currentReply = '';

      const typeNextChar = () => {
        if (index < reply.length) {
          currentReply += reply[index];
          setMessages(prev => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[updated.length - 1] = { role: 'model', text: currentReply };
            }
            return updated;
          });
          index++;
          
          const delay = Math.random() * 15 + 5;
          typingTimeoutRef.current = setTimeout(typeNextChar, delay);
        } else {
          setIsLoading(false);
        }
      };

      typeNextChar();

    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'Error: ' + error.message }]);
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col items-center">
      <div className="max-w-3xl w-full flex-1 flex flex-col bg-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden shadow-xl">
        {/* Header */}
        <div className="p-4 border-b border-gray-700/50 bg-gray-900/50 flex items-center gap-3">
          <Bot className="w-6 h-6 text-emerald-400" />
          <div>
            <h2 className="font-bold text-gray-100">Mode Diskusi AI (Co-Pilot)</h2>
            <p className="text-xs text-gray-400">AI ini mengingat semua Karakter & Aturan Dunia Anda.</p>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-purple-600' : 'bg-emerald-600'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-5 py-3 ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-gray-700 text-gray-100 rounded-tl-none'}`}>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </div>
              <div className="bg-gray-700 rounded-2xl rounded-tl-none px-5 py-3 flex items-center">
                <span className="text-gray-300 text-sm animate-pulse">Mengetik...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-gray-900/50 border-t border-gray-700/50">
          <div className="relative flex items-center">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Diskusikan plot hole, minta nama karakter, atau saran alur..."
              className="w-full bg-gray-800 border border-gray-600 text-white rounded-full pl-5 pr-12 py-3 focus:outline-none focus:border-emerald-500 text-sm"
              disabled={isLoading}
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-2 p-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 text-white rounded-full transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
