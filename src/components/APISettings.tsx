import React, { useState, useEffect } from 'react';
import { X, Key, Cpu, Eye, EyeOff, Check, AlertCircle, Loader2, Info } from 'lucide-react';
import { testAIConnection } from '../utils/ai';

interface APISettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveNotify: () => void;
}

const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Sangat cepat & hemat - Sangat direkomendasikan untuk menulis cepat.' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', desc: 'Pemikiran tingkat lanjut - Sempurna untuk plot twist & dunia kompleks.' }
];

const OPENAI_MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: 'Sangat cepat, cerdas, dan hemat biaya - Sempurna untuk draf novel awal.' },
  { id: 'gpt-4o', name: 'GPT-4o (Flagship)', desc: 'Model unggulan OpenAI dengan kreativitas tinggi, kosa kata kaya, dan analisis adegan yang tajam.' },
  { id: 'o1-mini', name: 'OpenAI o1 Mini', desc: 'Model penalaran logika cepat, luar biasa untuk menyusun peta alur cerita yang kompleks.' }
];

const DEEPSEEK_MODELS = [
  { id: 'deepseek-chat', name: 'DeepSeek Chat (V3)', desc: 'Model andalan DeepSeek - performa sangat cerdas, tulisan mengalir natural dengan harga sangat terjangkau.' },
  { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)', desc: 'Model penalaran R1 - memikirkan alur logika cerita yang rumit secara bertahap sebelum menulis.' }
];

const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (via Groq)', desc: 'Model Llama termutakhir dari Meta dengan kecepatan generasi super kilat dari Groq.' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (via Groq)', desc: 'Model Mixture-of-Experts yang cepat dengan kapasitas ingatan konteks cerita yang luas.' }
];

const OPENROUTER_MODELS = [
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash (via OpenRouter)', desc: 'Kecepatan tinggi dengan respons cerdas.' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro (via OpenRouter)', desc: 'Analitis mendalam & gaya penulisan kreatif.' },
  { id: 'anthropic/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', desc: 'Kualitas sastra tertinggi, dialog sangat natural, pilihan nomor satu sastrawan.' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat (V3)', desc: 'Biaya super murah dengan kecerdasan setingkat GPT-4.' },
  { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B', desc: 'Model open-source terbesar untuk instruksi cerita kompleks.' }
];

type AIProvider = 'gemini' | 'openai' | 'deepseek' | 'groq' | 'openrouter';

const getModelsForProvider = (prov: AIProvider) => {
  switch (prov) {
    case 'gemini': return GEMINI_MODELS;
    case 'openai': return OPENAI_MODELS;
    case 'deepseek': return DEEPSEEK_MODELS;
    case 'groq': return GROQ_MODELS;
    case 'openrouter': return OPENROUTER_MODELS;
    default: return GEMINI_MODELS;
  }
};

export default function APISettings({ isOpen, onClose, onSaveNotify }: APISettingsProps) {
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customModelId, setCustomModelId] = useState('');
  
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testErrorMessage, setTestErrorMessage] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load existing configuration on open
  useEffect(() => {
    if (isOpen) {
      const savedProvider = (localStorage.getItem('fictify-api-provider') as AIProvider) || 'gemini';
      const savedKey = localStorage.getItem('fictify-api-key') || '';
      const savedModel = localStorage.getItem('fictify-api-model') || '';

      setProvider(savedProvider);
      setApiKey(savedKey);
      
      const presets = getModelsForProvider(savedProvider);
      const isPreset = presets.some(m => m.id === savedModel);

      if (savedModel && !isPreset) {
        setIsCustomModel(true);
        setCustomModelId(savedModel);
        setSelectedModel('custom');
      } else {
        setIsCustomModel(false);
        setSelectedModel(savedModel || presets[0].id);
      }
      
      setTestStatus('idle');
      setTestErrorMessage('');
      setSaveSuccess(false);
    }
  }, [isOpen]);

  // Handle provider changes to reset presets
  const handleProviderChange = (newProvider: AIProvider) => {
    setProvider(newProvider);
    setIsCustomModel(false);
    const presets = getModelsForProvider(newProvider);
    setSelectedModel(presets[0].id);
    setTestStatus('idle');
  };

  const handleModelSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedModel(val);
    if (val === 'custom') {
      setIsCustomModel(true);
    } else {
      setIsCustomModel(false);
    }
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestErrorMessage('');
    const modelToUse = isCustomModel ? customModelId : selectedModel;

    try {
      const success = await testAIConnection(provider, apiKey, modelToUse);
      if (success) {
        setTestStatus('success');
      } else {
        setTestStatus('error');
        setTestErrorMessage('Koneksi berhasil tetapi server mengembalikan respons kosong.');
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestErrorMessage(err.message || 'Gagal terhubung. Pastikan API key valid.');
    }
  };

  const handleSave = () => {
    const modelToSave = isCustomModel ? customModelId.trim() : selectedModel;
    
    if (isCustomModel && !customModelId.trim()) {
      alert('Mohon isi ID Model kustom Anda.');
      return;
    }

    if (!apiKey.trim() && provider !== 'gemini') {
      alert('Kunci API tidak boleh kosong.');
      return;
    }

    localStorage.setItem('fictify-api-provider', provider);
    localStorage.setItem('fictify-api-key', apiKey.trim());
    localStorage.setItem('fictify-api-model', modelToSave);

    setSaveSuccess(true);
    onSaveNotify();

    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  const handleReset = () => {
    if (confirm('Apakah Anda yakin ingin menghapus konfigurasi API kustom Anda dan kembali ke kunci .env.local default?')) {
      localStorage.removeItem('fictify-api-provider');
      localStorage.removeItem('fictify-api-key');
      localStorage.removeItem('fictify-api-model');
      onSaveNotify();
      onClose();
    }
  };

  if (!isOpen) return null;

  const currentPresets = getModelsForProvider(provider);
  const activeModelDesc = currentPresets.find(m => m.id === selectedModel)?.desc || '';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      
      {/* Modal Container */}
      <div className="bg-[#0b0f17]/95 border border-purple-500/25 w-full max-w-lg rounded-2xl shadow-2xl shadow-purple-900/10 overflow-hidden relative backdrop-blur-md flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-850 flex items-center justify-between bg-gray-950/40">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-bold text-gray-200 font-mono">Pengaturan Mesin AI</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-200 hover:bg-gray-850 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          
          {/* Provider Selector */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Penyedia Layanan (AI Provider)</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleProviderChange('gemini')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center text-center gap-1 transition-all cursor-pointer ${
                  provider === 'gemini'
                    ? 'bg-purple-950/20 border-purple-500 text-purple-300 shadow-md shadow-purple-500/5'
                    : 'bg-gray-900/40 border-gray-800 text-gray-400 hover:bg-gray-900 hover:text-gray-300'
                }`}
              >
                <span className="text-sm font-bold">Google Gemini</span>
                <span className="text-[9px] text-gray-500 font-medium">Direct low-latency access</span>
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange('openai')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center text-center gap-1 transition-all cursor-pointer ${
                  provider === 'openai'
                    ? 'bg-emerald-950/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/5'
                    : 'bg-gray-900/40 border-gray-800 text-gray-400 hover:bg-gray-900 hover:text-gray-300'
                }`}
              >
                <span className="text-sm font-bold">OpenAI Direct</span>
                <span className="text-[9px] text-gray-500 font-medium">GPT-4o & GPT-4o-Mini</span>
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange('deepseek')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center text-center gap-1 transition-all cursor-pointer ${
                  provider === 'deepseek'
                    ? 'bg-blue-950/20 border-blue-500 text-blue-300 shadow-md shadow-blue-500/5'
                    : 'bg-gray-900/40 border-gray-800 text-gray-400 hover:bg-gray-900 hover:text-gray-300'
                }`}
              >
                <span className="text-sm font-bold">DeepSeek Direct</span>
                <span className="text-[9px] text-gray-500 font-medium">Ultra-cheap R1 & V3</span>
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange('groq')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center text-center gap-1 transition-all cursor-pointer ${
                  provider === 'groq'
                    ? 'bg-orange-950/20 border-orange-500 text-orange-300 shadow-md shadow-orange-500/5'
                    : 'bg-gray-900/40 border-gray-800 text-gray-400 hover:bg-gray-900 hover:text-gray-300'
                }`}
              >
                <span className="text-sm font-bold">Groq Cloud</span>
                <span className="text-[9px] text-gray-500 font-medium">Super-fast open-source</span>
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange('openrouter')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center text-center gap-1 transition-all cursor-pointer col-span-2 ${
                  provider === 'openrouter'
                    ? 'bg-indigo-950/20 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-500/5'
                    : 'bg-gray-900/40 border-gray-800 text-gray-400 hover:bg-gray-900 hover:text-gray-300'
                }`}
              >
                <span className="text-sm font-bold">OpenRouter API</span>
                <span className="text-[9px] text-gray-500 font-medium">Claude 3.5 Sonnet, Llama & 100+ Models</span>
              </button>
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Key className="w-3 h-3 text-purple-400" /> Kunci API (API Key)
              </label>
              {provider === 'gemini' && (
                <span className="text-[9px] text-gray-500 font-semibold italic">Akan menggunakan key .env jika dikosongkan</span>
              )}
            </div>
            
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-gray-200 text-sm font-mono focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all pr-12 placeholder-gray-600"
                placeholder={
                  provider === 'gemini' ? 'AIzaSy...' :
                  provider === 'openai' ? 'sk-proj-...' :
                  provider === 'deepseek' ? 'sk-...' :
                  provider === 'groq' ? 'gsk_...' : 'sk-or-v1-...'
                }
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 cursor-pointer"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Model Selector */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Pilih Model Otak AI</label>
            <select
              value={selectedModel}
              onChange={handleModelSelectChange}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-gray-200 text-sm focus:outline-none focus:border-purple-500 transition-all cursor-pointer"
            >
              {currentPresets.map(model => (
                <option key={model.id} value={model.id}>{model.name}</option>
              ))}
              <option value="custom">✏️ Model Kustom Lainnya...</option>
            </select>

            {/* Model Description or Custom Model Input */}
            {isCustomModel ? (
              <div className="mt-2.5 animate-in slide-in-from-top-2 duration-200">
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Masukkan ID Model Kustom</label>
                <input
                  type="text"
                  value={customModelId}
                  onChange={e => setCustomModelId(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-850 rounded-lg px-3 py-2 text-gray-200 text-xs font-mono focus:outline-none focus:border-purple-500 transition-all placeholder-gray-600"
                  placeholder={
                    provider === 'gemini' ? 'gemini-2.5-pro' :
                    provider === 'openai' ? 'gpt-4o' :
                    provider === 'deepseek' ? 'deepseek-chat' :
                    provider === 'groq' ? 'llama3-8b-8192' : 'openai/gpt-4o-mini'
                  }
                />
                <span className="text-[9px] text-gray-500 mt-1 flex items-center gap-1">
                  <Info className="w-2.5 h-2.5" /> ID model harus sesuai dengan nama model resmi di penyedia.
                </span>
              </div>
            ) : (
              activeModelDesc && (
                <div className="mt-2 bg-gray-950/40 border border-gray-850/30 rounded-xl p-3 text-xs text-gray-400 flex gap-2">
                  <Info className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <span>{activeModelDesc}</span>
                </div>
              )
            )}
          </div>

          {/* Test Connection Result Display */}
          {testStatus !== 'idle' && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              {testStatus === 'testing' && (
                <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-950/10 border border-amber-500/20 px-4 py-3 rounded-xl">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Sedang menguji koneksi kunci API Anda ke server...</span>
                </div>
              )}
              {testStatus === 'success' && (
                <div className="flex items-center gap-2.5 text-xs text-emerald-400 bg-emerald-950/10 border border-emerald-500/20 px-4 py-3 rounded-xl shadow-lg shadow-emerald-500/5 animate-pulse">
                  <Check className="w-4.5 h-4.5 text-emerald-400" />
                  <span className="font-bold">Koneksi Berhasil! Kunci API Anda berfungsi sempurna.</span>
                </div>
              )}
              {testStatus === 'error' && (
                <div className="flex items-start gap-2.5 text-xs text-red-400 bg-red-950/10 border border-red-500/20 px-4 py-3 rounded-xl">
                  <AlertCircle className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Koneksi Gagal!</span>
                    <span className="text-[11px] text-red-300/90 leading-tight block mt-0.5">{testErrorMessage}</span>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-gray-850 bg-gray-950/40 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-gray-500 hover:text-red-400 font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Reset Default
          </button>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testStatus === 'testing' || !apiKey.trim()}
              className="bg-gray-900 border border-gray-800 hover:bg-gray-850 disabled:opacity-40 disabled:hover:bg-gray-900 text-gray-300 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Uji Koneksi
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={testStatus === 'testing' || saveSuccess}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-extrabold shadow-lg shadow-purple-900/25 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Tersimpan!
                </>
              ) : (
                'Simpan Konfigurasi'
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
