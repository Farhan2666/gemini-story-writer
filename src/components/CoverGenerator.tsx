import { useState, useEffect } from 'react';
import { Image as ImageIcon, Download, Loader2, Sparkles, Upload, Trash2 } from 'lucide-react';

export default function CoverGenerator() {
  const [activeTab, setActiveTab] = useState<'ai' | 'upload'>('ai');
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Muat sampul yang tersimpan saat komponen dimuat
  useEffect(() => {
    const savedCover = localStorage.getItem('gemini-book-cover');
    if (savedCover) {
      setImageUrl(savedCover);
    }
  }, []);

  const generateCover = () => {
    if (!prompt.trim() || isLoading) return;
    setIsLoading(true);
    
    const seed = Math.floor(Math.random() * 1000000);
    // Pollinations AI API (Gratis, tanpa kunci)
    const url = `https://image.pollinations.ai/prompt/professional book cover art, no text, ${encodeURIComponent(prompt)}?seed=${seed}&width=512&height=768&nologo=true`;
    
    const img = new Image();
    img.onload = () => {
      setImageUrl(url);
      localStorage.setItem('gemini-book-cover', url);
      setIsLoading(false);
    };
    img.onerror = () => {
      alert("Gagal menghasilkan gambar. Coba lagi.");
      setIsLoading(false);
    };
    img.src = url;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi tipe berkas
    if (!file.type.startsWith('image/')) {
      alert('Tolong unggah berkas gambar saja (PNG, JPG, WEBP).');
      return;
    }

    // Validasi ukuran berkas (maks 4MB)
    if (file.size > 4 * 1024 * 1024) {
      alert('Ukuran gambar terlalu besar. Maksimal 4 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setImageUrl(base64String);
      localStorage.setItem('gemini-book-cover', base64String);
    };
    reader.readAsDataURL(file);
  };

  const deleteCover = () => {
    if (confirm('Apakah Anda yakin ingin menghapus sampul buku ini?')) {
      setImageUrl(null);
      localStorage.removeItem('gemini-book-cover');
    }
  };

  return (
    <div className="p-8 h-full overflow-hidden flex flex-col items-center">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col md:flex-row gap-8">
        
        {/* Panel Masukan (Input Panel) */}
        <div className="flex-1 bg-gray-800/30 border border-gray-700/50 rounded-xl p-6 shadow-xl flex flex-col backdrop-blur-sm">
          
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
              <ImageIcon className="text-pink-400" /> Sampul Buku
            </h2>
            <p className="text-gray-400 mt-2 text-sm leading-relaxed">
              Personalisasikan wajah mahakarya novel Anda dengan ilustrator AI tercanggih atau unggah desain Anda sendiri.
            </p>
          </div>

          {/* Tab Menu Header */}
          <div className="flex bg-gray-900/60 p-1 rounded-lg border border-gray-800 mb-6">
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-2 ${
                activeTab === 'ai'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Buat dengan AI
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-2 ${
                activeTab === 'upload'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Upload className="w-4 h-4" />
              Unggah Gambar
            </button>
          </div>

          {/* Konten Tab */}
          <div className="flex-1 flex flex-col justify-between">
            {activeTab === 'ai' ? (
              <div className="flex-1 flex flex-col gap-4">
                <label className="text-sm font-medium text-gray-300">Prompt Gambar (Bahasa Inggris direkomendasikan):</label>
                <textarea 
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  className="flex-1 bg-gray-900/80 border border-pink-500/30 rounded-xl p-4 text-gray-200 focus:outline-none focus:border-pink-500 resize-none font-mono text-sm min-h-[150px]"
                  placeholder="A dark fantasy knight standing on a snowy mountain holding a flaming sword, epic lighting, highly detailed..."
                />
                
                <button 
                  onClick={generateCover}
                  disabled={isLoading || !prompt.trim()}
                  className="py-4 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold shadow-lg shadow-pink-900/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-95 cursor-pointer mt-4"
                >
                  {isLoading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Melukis...</>
                  ) : (
                    <><Sparkles className="w-5 h-5" /> Buat Sampul Buku</>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center py-6">
                <div className="w-full">
                  <label className="text-sm font-medium text-gray-300 block mb-3">Impor Sampul Dari Penyimpanan Lokal:</label>
                  <label 
                    htmlFor="file-upload" 
                    className="w-full border-2 border-dashed border-gray-700 hover:border-pink-500 bg-gray-900/40 hover:bg-pink-500/5 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group shadow-inner"
                  >
                    <div className="p-4 bg-gray-800/80 rounded-full text-pink-400 group-hover:scale-110 transition-transform mb-4 border border-gray-700">
                      <Upload className="w-8 h-8" />
                    </div>
                    <span className="text-gray-200 font-semibold text-center block mb-1">
                      Pilih gambar dari komputer Anda
                    </span>
                    <span className="text-gray-500 text-xs text-center block">
                      Mendukung PNG, JPG, WEBP (Maksimal 4 MB)
                    </span>
                    <input 
                      id="file-upload"
                      type="file" 
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Area Pratinjau (Output Area) */}
        <div className="flex-1 bg-gray-900/50 border border-gray-700/50 rounded-xl p-6 shadow-xl flex flex-col items-center justify-center relative overflow-hidden group">
          {imageUrl ? (
            <>
              {/* Gambar Sampul Buku */}
              <div className="relative h-full max-h-[480px] aspect-[2/3] rounded shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden border border-gray-800">
                <img 
                  src={imageUrl} 
                  alt="Book Cover" 
                  className="w-full h-full object-cover rounded" 
                />
                
                {/* Overlay Aksi saat Hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-4">
                  <a 
                    href={imageUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    download="cover.jpg"
                    className="bg-white hover:bg-gray-100 text-gray-900 px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-all text-sm shadow-lg shadow-black/40"
                  >
                    <Download className="w-4 h-4" /> Buka Ukuran Penuh
                  </a>
                  
                  <button 
                    onClick={deleteCover}
                    className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-all text-sm shadow-lg shadow-black/40"
                  >
                    <Trash2 className="w-4 h-4" /> Hapus Sampul
                  </button>
                </div>
              </div>
            </>
          ) : (
             <div className="text-center text-gray-500 flex flex-col items-center gap-4 py-16">
               <div className="p-5 bg-gray-850 rounded-full border border-gray-800 shadow-inner">
                 <ImageIcon className="w-16 h-16 opacity-20 text-pink-400" />
               </div>
               <div>
                 <p className="font-semibold text-gray-400">Pratinjau Sampul Buku</p>
                 <p className="text-xs text-gray-600 mt-1 max-w-[240px] mx-auto">
                   Gunakan AI generator di kiri atau unggah berkas gambar lokal untuk melihat hasil sampul di sini.
                 </p>
               </div>
             </div>
          )}
        </div>

      </div>
    </div>
  );
}
