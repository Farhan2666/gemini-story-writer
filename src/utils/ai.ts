export interface AIMessage {
  role: 'user' | 'model'; // 'model' dipetakan ke 'assistant' di OpenRouter
  text: string;
}

export interface AISettings {
  provider: 'gemini' | 'openai' | 'deepseek' | 'groq' | 'openrouter';
  apiKey: string;
  model: string;
}

const FALLBACK_GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Mengambil pengaturan aktif dari localStorage dengan fallback ke .env.local
export function getAISettings(): AISettings {
  const provider = (localStorage.getItem('gemini-api-provider') as 'gemini' | 'openai' | 'deepseek' | 'groq' | 'openrouter') || 'gemini';
  const apiKey = localStorage.getItem('gemini-api-key') || FALLBACK_GEMINI_KEY;
  
  let defaultModel = 'gemini-2.5-flash';
  if (provider === 'openai') defaultModel = 'gpt-4o-mini';
  else if (provider === 'deepseek') defaultModel = 'deepseek-chat';
  else if (provider === 'groq') defaultModel = 'llama-3.3-70b-versatile';
  else if (provider === 'openrouter') defaultModel = 'google/gemini-2.5-flash';

  const model = localStorage.getItem('gemini-api-model') || defaultModel;
  
  return { provider, apiKey, model };
}

// Mengembalikan endpoint URL berdasarkan provider
function getProviderEndpoint(provider: string): string {
  switch (provider) {
    case 'openai':
      return 'https://api.openai.com/v1/chat/completions';
    case 'deepseek':
      return 'https://api.deepseek.com/v1/chat/completions';
    case 'groq':
      return 'https://api.groq.com/openai/v1/chat/completions';
    case 'openrouter':
      return 'https://openrouter.ai/api/v1/chat/completions';
    default:
      return '';
  }
}

// Uji koneksi kunci API ke provider terpilih
export async function testAIConnection(
  provider: 'gemini' | 'openai' | 'deepseek' | 'groq' | 'openrouter',
  apiKey: string,
  model: string
): Promise<boolean> {
  if (!apiKey.trim()) {
    throw new Error('Kunci API tidak boleh kosong.');
  }

  try {
    if (provider === 'gemini') {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Halo, katakan "ok" jika terkoneksi.' }] }]
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      return !!data.candidates?.[0]?.content?.parts?.[0]?.text;
    } else {
      // OpenAI-compatible providers
      const endpoint = getProviderEndpoint(provider);
      const headers: HeadersInit = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };

      if (provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://fictify.com';
        headers['X-Title'] = 'Fictify';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'Halo, katakan "ok" jika terkoneksi.' }],
          max_tokens: 10
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      return !!data.choices?.[0]?.message?.content;
    }
  } catch (error: any) {
    console.error('AI Connection Test failed:', error);
    throw new Error(error.message || 'Gagal terhubung ke server.');
  }
}

// Panggilan utama untuk menghasilkan konten AI
export async function generateAIContent(messages: AIMessage[]): Promise<string> {
  const { provider, apiKey, model } = getAISettings();

  if (!apiKey.trim()) {
    throw new Error('Kunci API belum diatur! Silakan buka menu Pengaturan API di pojok kiri bawah sidebar.');
  }

  try {
    if (provider === 'gemini') {
      // Direct Google Gemini API
      const cleanModel = model.includes('/') ? model.split('/').pop() : model;
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;
      
      const payloadContents = messages.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      }));

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: payloadContents,
          generationConfig: {
            temperature: 0.7
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!reply) throw new Error('API Gemini tidak mengembalikan konten teks.');
      return reply;
    } else {
      // OpenAI-compatible API (openai, deepseek, groq, openrouter)
      const endpoint = getProviderEndpoint(provider);
      const headers: HeadersInit = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };

      if (provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://fictify.com';
        headers['X-Title'] = 'Fictify';
      }
      
      const payloadMessages = messages.map(msg => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.text
      }));

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: model,
          messages: payloadMessages,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content;
      if (!reply) throw new Error('API tidak mengembalikan konten teks.');
      return reply;
    }
  } catch (error: any) {
    console.error('AI Generation error:', error);
    throw new Error(error.message || 'Terjadi kegagalan komunikasi dengan asisten AI.');
  }
}
