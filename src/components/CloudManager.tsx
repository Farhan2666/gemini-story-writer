import React, { useState, useEffect } from 'react';
import { Cloud, LogIn, LogOut, RefreshCw, History, UserPlus, Shield, Database } from 'lucide-react';

export interface UserProfile {
  penName: string;
  email: string;
  avatar: string;
  joinedDate: string;
}

export interface CloudRevision {
  id: string;
  timestamp: string;
  wordCount: number;
  chapterCount: number;
  note: string;
  data: string; // stringified project data
}

interface CloudManagerProps {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  triggerSync: () => void;
  onRestore: (data: any) => void;
  wordCount: number;
  chapterCount: number;
}

const AVATARS = [
  '🔮 Pujangga Fantasi',
  '🚀 Novelis Sci-Fi',
  '🕵️ Misteri Meister',
  '💖 Penyair Romantis',
  '🐉 Penakluk Naga Teks'
];

export default function CloudManager({
  user,
  setUser,
  syncStatus,
  triggerSync,
  onRestore,
  wordCount,
  chapterCount
}: CloudManagerProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [penName, setPenName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [revisions, setRevisions] = useState<CloudRevision[]>([]);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('fictify-cloud-user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {}
    }
  }, [setUser]);

  // Load revisions when user is logged in
  useEffect(() => {
    if (user) {
      const savedRevisions = localStorage.getItem(`gemini-cloud-revisions-${user.email}`);
      if (savedRevisions) {
        try {
          setRevisions(JSON.parse(savedRevisions));
        } catch (e) {}
      } else {
        setRevisions([]);
      }
    }
  }, [user, syncStatus]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!email || !password || (isRegistering && !penName)) {
      setAuthError('Mohon isi semua bidang formulir.');
      return;
    }

    setAuthLoading(true);

    setTimeout(() => {
      setAuthLoading(false);
      if (isRegistering) {
        // Register mock user
        const newUser: UserProfile = {
          penName,
          email,
          avatar: selectedAvatar,
          joinedDate: new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
        };
        localStorage.setItem(`gemini-cloud-user-${email}`, JSON.stringify({ ...newUser, password: btoa(password) }));
        localStorage.setItem('fictify-cloud-user', JSON.stringify(newUser));
        setUser(newUser);
        // Create initial revision
        const initialRevision: CloudRevision = {
          id: `rev-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('id-ID') + ' ' + new Date().toLocaleDateString('id-ID'),
          wordCount,
          chapterCount,
          note: 'Inisialisasi Cloud Workspace',
          data: JSON.stringify({
            nodes: JSON.parse(localStorage.getItem('fictify-nodes') || '[]'),
            characters: JSON.parse(localStorage.getItem('fictify-characters') || '[]'),
            world: JSON.parse(localStorage.getItem('fictify-worldview') || '{}'),
            notes: localStorage.getItem('fictify-notes') || ''
          })
        };
        localStorage.setItem(`gemini-cloud-revisions-${email}`, JSON.stringify([initialRevision]));
        setRevisions([initialRevision]);
      } else {
        // Login mock user
        const savedUserCred = localStorage.getItem(`gemini-cloud-user-${email}`);
        if (!savedUserCred) {
          setAuthError('Akun tidak ditemukan. Silakan registrasi terlebih dahulu.');
          return;
        }
        try {
          const cred = JSON.parse(savedUserCred);
          if (cred.password !== btoa(password)) {
            setAuthError('Kata sandi salah. Silakan coba lagi.');
            return;
          }
          const loggedInUser: UserProfile = {
            penName: cred.penName,
            email: cred.email,
            avatar: cred.avatar,
            joinedDate: cred.joinedDate
          };
          localStorage.setItem('fictify-cloud-user', JSON.stringify(loggedInUser));
          setUser(loggedInUser);
        } catch (e) {
          setAuthError('Gagal melakukan login.');
        }
      }
    }, 1200);
  };

  const handleLogout = () => {
    localStorage.removeItem('fictify-cloud-user');
    setUser(null);
  };

  const handleRestoreRevision = (rev: CloudRevision) => {
    if (confirm(`Apakah Anda yakin ingin memulihkan novel Anda ke versi "${rev.note}"? Data saat ini di browser akan digantikan.`)) {
      try {
        const parsed = JSON.parse(rev.data);
        onRestore(parsed);
      } catch (e) {
        alert('Gagal memulihkan cadangan cloud.');
      }
    }
  };

  return (
    <div className="p-8 h-full overflow-auto bg-[#0d1117]">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 border-b border-gray-800 pb-6">
          <div>
            <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 flex items-center gap-3">
              <Cloud className="w-8 h-8 text-purple-400" />
              Fictify Sync
            </h2>
            <p className="text-gray-400 mt-1">Gunakan sinkronisasi awan otomatis untuk menjaga karya Anda tetap aman di mana saja.</p>
          </div>
          
          {user && (
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                syncStatus === 'syncing' ? 'bg-amber-950/40 text-amber-400 border-amber-500/30' :
                syncStatus === 'synced' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30' :
                'bg-gray-800 text-gray-400 border-gray-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  syncStatus === 'syncing' ? 'bg-amber-400 animate-ping' :
                  syncStatus === 'synced' ? 'bg-emerald-400' : 'bg-gray-500'
                }`} />
                {syncStatus === 'syncing' ? 'Menyinkronkan...' :
                 syncStatus === 'synced' ? 'Tersimpan di Cloud' : 'Koneksi Siap'}
              </div>
              
              <button 
                onClick={triggerSync}
                disabled={syncStatus === 'syncing'}
                className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                Sinkron Sekarang
              </button>
            </div>
          )}
        </div>

        {!user ? (
          /* Authentication Screen */
          <div className="max-w-md mx-auto bg-gray-900/60 border border-gray-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500"></div>
            
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-950/50 border border-purple-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-900/20">
                {isRegistering ? <UserPlus className="w-8 h-8 text-purple-400" /> : <LogIn className="w-8 h-8 text-purple-400" />}
              </div>
              <h3 className="text-2xl font-bold text-gray-100">{isRegistering ? 'Daftar Akun' : 'Masuk ke Fictify'}</h3>
              <p className="text-sm text-gray-400 mt-2">Dapatkan backup gratis 100MB di awan untuk seluruh novel Anda.</p>
            </div>

            {authError && (
              <div className="bg-red-950/40 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm mb-6">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {isRegistering && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Nama Pena</label>
                    <input 
                      type="text" 
                      value={penName} 
                      onChange={e => setPenName(e.target.value)} 
                      placeholder="Contoh: Rendra_Pujangga"
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Gelar/Karakter Avatar</label>
                    <select 
                      value={selectedAvatar} 
                      onChange={e => setSelectedAvatar(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:border-purple-500 transition-all text-sm"
                    >
                      {AVATARS.map(av => <option key={av} value={av}>{av}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Alamat Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="user@fictify.app"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Kata Sandi</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="••••••••"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={authLoading}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold tracking-wide shadow-lg shadow-purple-900/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-6 cursor-pointer disabled:opacity-50"
              >
                {authLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Menyambungkan ke Awan...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>{isRegistering ? 'Buat Akun Sekarang' : 'Masuk Akun'}</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center border-t border-gray-850 pt-4">
              <button 
                onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                {isRegistering ? 'Sudah punya akun? Masuk di sini' : 'Belum punya akun? Daftar gratis sekarang'}
              </button>
            </div>
          </div>
        ) : (
          /* Profile & Cloud Revision Dashboard */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Left Column: Profile Card */}
            <div className="space-y-6">
              <div className="bg-gradient-to-b from-gray-900/80 to-gray-950 border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-purple-500/5 rounded-full blur-xl"></div>
                
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-2xl bg-purple-900/30 border border-purple-500/20 flex items-center justify-center text-3xl shadow-inner mb-4">
                    {user.avatar.substring(0, 2)}
                  </div>
                  
                  <h4 className="text-xl font-bold text-gray-100">{user.penName}</h4>
                  <p className="text-xs text-gray-500 mt-1">{user.email}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950/80 text-purple-400 border border-purple-900/50 uppercase tracking-widest mt-3">
                    {user.avatar.substring(3)}
                  </span>
                </div>

                <div className="mt-6 border-t border-gray-800/80 pt-5 space-y-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Bergabung</span>
                    <span className="text-gray-300 font-medium">{user.joinedDate}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Total Proyek</span>
                    <span className="text-gray-300 font-medium">1 Novel Aktif</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Statistik Saat Ini</span>
                    <span className="text-gray-300 font-medium">{chapterCount} Bab ({wordCount} Kata)</span>
                  </div>
                </div>

                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 mt-6 py-2 bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Keluar dari Cloud
                </button>
              </div>

              {/* Storage Quota widget */}
              <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5 shadow-lg">
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-purple-400" />
                  Kapasitas Fictify
                </h5>
                <div className="h-2 bg-gray-950 rounded-full overflow-hidden border border-gray-800">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500" style={{ width: '1.4%' }}></div>
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mt-2 font-medium">
                  <span>140 KB terpakai</span>
                  <span>Batas 100 MB</span>
                </div>
              </div>
            </div>

            {/* Right Column: Revision History */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col h-[520px]">
                
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                    <History className="w-5 h-5 text-purple-400" />
                    Riwayat Revisi Cloud
                  </h4>
                  <span className="text-xs text-gray-500">{revisions.length} Versi Tersimpan</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3.5 pr-2">
                  {revisions.map((rev) => (
                    <div 
                      key={rev.id} 
                      className="bg-gray-950/60 border border-gray-850 hover:border-purple-500/30 transition-all rounded-xl p-4 flex items-center justify-between group"
                    >
                      <div className="space-y-1 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-200">{rev.note}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-900 text-gray-400 border border-gray-800">
                            {rev.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Konfigurasi Cadangan: <span className="text-purple-400/80 font-medium">{rev.chapterCount} Bab</span> • <span className="text-indigo-400/80 font-medium">{rev.wordCount} Kata</span>
                        </p>
                      </div>

                      <button 
                        onClick={() => handleRestoreRevision(rev)}
                        className="bg-purple-950/30 hover:bg-purple-600 border border-purple-500/20 hover:border-purple-500 text-purple-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 shrink-0 opacity-80 group-hover:opacity-100"
                      >
                        Pulihkan
                      </button>
                    </div>
                  ))}

                  {revisions.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-12">
                      <Cloud className="w-12 h-12 text-gray-700 mb-2 animate-pulse" />
                      <p className="text-sm">Belum ada revisi yang dicadangkan.</p>
                      <p className="text-xs text-gray-600 mt-1">Ketik cerita Anda atau klik "Sinkron Sekarang" untuk mengunggah.</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 border-t border-gray-850 pt-4 text-center">
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    💾 <b>Penyimpanan Lokal Browser:</b> Data novel Anda disimpan aman di perangkat Anda sendiri secara offline.
                  </p>
                </div>

              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
