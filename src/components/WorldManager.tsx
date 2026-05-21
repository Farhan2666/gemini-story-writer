import { useState, useEffect } from 'react';
import { Globe, Save } from 'lucide-react';

export default function WorldManager() {
  const [worldData, setWorldData] = useState({
    magicSystem: '',
    geography: '',
    history: ''
  });
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('gemini-worldview');
    if (saved) {
      try {
        setWorldData(JSON.parse(saved));
      } catch(e) {}
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('gemini-worldview', JSON.stringify(worldData));
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  return (
    <div className="p-8 h-full overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
              <Globe className="text-blue-400" /> Pengaturan Dunia (Worldbuilding)
            </h2>
            <p className="text-gray-400 mt-1">Hukum alam, sejarah, dan lokasi yang harus dipatuhi oleh AI saat merangkai cerita.</p>
          </div>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg font-medium transition-colors"
          >
            <Save className="w-4 h-4" /> Simpan Pengaturan
          </button>
        </div>

        {savedMessage && (
          <div className="bg-green-500/20 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg mb-6">
            ✅ Pengaturan Dunia berhasil disimpan dan diperbarui untuk AI!
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-medium text-gray-200 mb-2">Sistem Kekuatan / Hukum Alam</h3>
            <p className="text-sm text-gray-500 mb-4">Apakah ada sihir, level kekuatan, teknologi maju, atau aturan khusus di dunia ini?</p>
            <textarea 
              value={worldData.magicSystem}
              onChange={e => setWorldData({...worldData, magicSystem: e.target.value})}
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-4 py-3 text-gray-100 h-32 focus:outline-none focus:border-blue-500"
              placeholder="Contoh: Di dunia ini sihir menggunakan elemen dasar. Hanya keturunan bangsawan yang bisa terbang..."
            />
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-medium text-gray-200 mb-2">Geografi & Lokasi</h3>
            <p className="text-sm text-gray-500 mb-4">Seperti apa bentuk wilayahnya? Nama kota, kerajaan, atau tempat penting?</p>
            <textarea 
              value={worldData.geography}
              onChange={e => setWorldData({...worldData, geography: e.target.value})}
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-4 py-3 text-gray-100 h-32 focus:outline-none focus:border-blue-500"
              placeholder="Contoh: Kerajaan utama bernama Eldoria, terletak di antara dua gunung merapi. Di utara terdapat Hutan Terlarang..."
            />
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-medium text-gray-200 mb-2">Sejarah & Faksi</h3>
            <p className="text-sm text-gray-500 mb-4">Apa konflik utama yang sedang terjadi? Siapa saja kubu yang bermusuhan?</p>
            <textarea 
              value={worldData.history}
              onChange={e => setWorldData({...worldData, history: e.target.value})}
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-4 py-3 text-gray-100 h-32 focus:outline-none focus:border-blue-500"
              placeholder="Contoh: Tiga faksi sedang berperang sejak 100 tahun lalu untuk memperebutkan Kristal Suci..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
