import { useState, useEffect } from 'react';
import { Plus, User, Trash2, Edit3, X, Check } from 'lucide-react';

export interface Character {
  id: string;
  name: string;
  role: string;
  background: string;
  imageUrl?: string;
}

export default function CharacterManager() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newChar, setNewChar] = useState({ name: '', role: '', background: '', imageUrl: '' });

  useEffect(() => {
    const saved = localStorage.getItem('fictify-characters');
    if (saved) {
      try {
        setCharacters(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const saveToLocal = (data: Character[]) => {
    setCharacters(data);
    localStorage.setItem('fictify-characters', JSON.stringify(data));
  };

  const handleAdd = () => {
    if (!newChar.name) return;
    const char: Character = {
      id: Date.now().toString(),
      ...newChar
    };
    saveToLocal([...characters, char]);
    setNewChar({ name: '', role: '', background: '', imageUrl: '' });
    setIsAdding(false);
  };

  const handleEdit = (char: Character) => {
    setNewChar({ name: char.name, role: char.role, background: char.background, imageUrl: char.imageUrl || '' });
    setEditingId(char.id);
    setIsAdding(false);
  };

  const handleSaveEdit = () => {
    if (!newChar.name || !editingId) return;
    saveToLocal(characters.map(c => c.id === editingId ? { ...c, ...newChar } : c));
    setNewChar({ name: '', role: '', background: '', imageUrl: '' });
    setEditingId(null);
  };

  const handleCancel = () => {
    setNewChar({ name: '', role: '', background: '', imageUrl: '' });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Hapus karakter ini?')) return;
    saveToLocal(characters.filter(c => c.id !== id));
  };

  return (
    <div className="p-8 h-full overflow-auto">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
              <User className="text-purple-400" /> Pustaka Karakter
            </h2>
            <p className="text-gray-400 mt-1">AI akan mengingat karakter-karakter ini saat melanjutkan cerita.</p>
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Karakter
          </button>
        </div>

        {isAdding && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-8 shadow-xl">
            <h3 className="text-lg font-medium text-gray-200 mb-4">Karakter Baru</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Nama Karakter</label>
                  <input 
                    type="text" 
                    value={newChar.name}
                    onChange={e => setNewChar({...newChar, name: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:border-purple-500"
                    placeholder="Misal: Budi Si Penjinak Naga"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Peran (Role)</label>
                  <input 
                    type="text" 
                    value={newChar.role}
                    onChange={e => setNewChar({...newChar, role: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:border-purple-500"
                    placeholder="Misal: Protagonis Utama / Rival"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">URL Gambar (Opsional)</label>
                <input 
                  type="text" 
                  value={newChar.imageUrl}
                  onChange={e => setNewChar({...newChar, imageUrl: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:border-purple-500 mb-4"
                  placeholder="Paste link gambar karakter (https://...)"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Latar Belakang & Kepribadian (Untuk AI)</label>
                <textarea 
                  value={newChar.background}
                  onChange={e => setNewChar({...newChar, background: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-100 h-24 focus:outline-none focus:border-purple-500"
                  placeholder="Ceritakan sifatnya, senjatanya, atau masa lalunya agar AI bisa menirunya..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={handleCancel} className="px-4 py-2 text-gray-400 hover:text-gray-200">Batal</button>
                <button onClick={handleAdd} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-md">Simpan Karakter</button>
              </div>
            </div>
          </div>
        )}

        {editingId && (
          <div className="bg-gray-800 border border-purple-500/50 rounded-xl p-6 mb-8 shadow-xl">
            <h3 className="text-lg font-medium text-gray-200 mb-4 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-purple-400" /> Edit Karakter
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Nama Karakter</label>
                  <input 
                    type="text" 
                    value={newChar.name}
                    onChange={e => setNewChar({...newChar, name: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:border-purple-500"
                    placeholder="Misal: Budi Si Penjinak Naga"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Peran (Role)</label>
                  <input 
                    type="text" 
                    value={newChar.role}
                    onChange={e => setNewChar({...newChar, role: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:border-purple-500"
                    placeholder="Misal: Protagonis Utama / Rival"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">URL Gambar (Opsional)</label>
                <input 
                  type="text" 
                  value={newChar.imageUrl}
                  onChange={e => setNewChar({...newChar, imageUrl: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:border-purple-500 mb-4"
                  placeholder="Paste link gambar karakter (https://...)"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Latar Belakang & Kepribadian (Untuk AI)</label>
                <textarea 
                  value={newChar.background}
                  onChange={e => setNewChar({...newChar, background: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-100 h-24 focus:outline-none focus:border-purple-500"
                  placeholder="Ceritakan sifatnya, senjatanya, atau masa lalunya agar AI bisa menirunya..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={handleCancel} className="px-4 py-2 text-gray-400 hover:text-gray-200 flex items-center gap-1">
                  <X className="w-4 h-4" /> Batal
                </button>
                <button onClick={handleSaveEdit} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-md flex items-center gap-1">
                  <Check className="w-4 h-4" /> Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {characters.map(char => (
            <div key={char.id} className="bg-gray-800/50 border border-gray-700 hover:border-purple-500/50 transition-colors rounded-xl p-5 relative">
              <div className="absolute top-3 right-3 flex items-center gap-1">
                <button onClick={() => handleEdit(char)} className="text-blue-400 hover:text-blue-300 bg-blue-400/10 hover:bg-blue-400/20 p-1.5 rounded-md transition-colors" title="Edit karakter">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(char.id)} className="text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 p-1.5 rounded-md transition-colors" title="Hapus karakter">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-3 mb-3">
                {char.imageUrl ? (
                  <img src={char.imageUrl} alt={char.name} className="w-12 h-12 rounded-full object-cover border-2 border-purple-500/50" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-purple-900/50 flex items-center justify-center border border-purple-500/30">
                    <User className="w-6 h-6 text-purple-300" />
                  </div>
                )}
                <div>
                  <h4 className="text-lg font-semibold text-gray-100 leading-tight">{char.name}</h4>
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-700 text-purple-300 border border-gray-600">{char.role || 'Figuran'}</span>
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-3 line-clamp-4 leading-relaxed">
                {char.background || 'Tidak ada deskripsi.'}
              </p>
            </div>
          ))}
          {characters.length === 0 && !isAdding && (
             <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-700 rounded-xl text-gray-500">
               Belum ada karakter yang dibuat.
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
