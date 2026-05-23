import React, { useState, useEffect, useRef } from 'react';
import { Network, Plus, Trash2, RefreshCw, HelpCircle, Users } from 'lucide-react';
import type { Character } from './CharacterManager';

export interface Relationship {
  id: string;
  fromId: string;
  toId: string;
  type: string; // "Rival" | "Kekasih" | "Teman" | "Musuh" | "Keluarga" | dll
  color: string;
}

const RELATION_TYPES = [
  { label: '🔥 Rival/Pesaing', value: 'Rival', color: '#f59e0b' },
  { label: '💖 Kekasih/Pasangan', value: 'Kekasih', color: '#ec4899' },
  { label: '🤝 Sahabat/Teman', value: 'Teman', color: '#10b981' },
  { label: '💀 Musuh Bebuyutan', value: 'Musuh', color: '#ef4444' },
  { label: '🧬 Keluarga/Saudara', value: 'Keluarga', color: '#3b82f6' },
  { label: '🔮 Guru & Murid', value: 'Guru-Murid', color: '#a855f7' }
];

export default function CharacterMindMap() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [positions, setPositions] = useState<{ [id: string]: { x: number; y: number } }>({});
  
  // Creation state
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [selectedRelType, setSelectedRelType] = useState(RELATION_TYPES[0].value);
  const [customType, setCustomType] = useState('');

  // Drag state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Load Characters & Relationships
  useEffect(() => {
    const savedChars = localStorage.getItem('fictify-characters');
    if (savedChars) {
      try {
        setCharacters(JSON.parse(savedChars));
      } catch (e) {}
    }

    const savedRels = localStorage.getItem('fictify-relationships');
    if (savedRels) {
      try {
        setRelationships(JSON.parse(savedRels));
      } catch (e) {}
    }

    const savedPos = localStorage.getItem('fictify-mindmap-positions');
    if (savedPos) {
      try {
        setPositions(JSON.parse(savedPos));
      } catch (e) {}
    }
  }, []);

  // Compute Circular Layout if positions are missing
  useEffect(() => {
    if (characters.length === 0) return;

    let updated = false;
    const newPositions = { ...positions };

    characters.forEach((char, idx) => {
      if (!newPositions[char.id]) {
        const angle = (idx / characters.length) * 2 * Math.PI;
        // Center of canvas: (420, 260)
        newPositions[char.id] = {
          x: 420 + Math.cos(angle) * 200,
          y: 260 + Math.sin(angle) * 160
        };
        updated = true;
      }
    });

    if (updated) {
      setPositions(newPositions);
      localStorage.setItem('fictify-mindmap-positions', JSON.stringify(newPositions));
    }
  }, [characters, positions]);

  const saveRelationships = (newRels: Relationship[]) => {
    setRelationships(newRels);
    localStorage.setItem('fictify-relationships', JSON.stringify(newRels));
  };

  const handleAddRelationship = () => {
    if (!fromId || !toId || fromId === toId) {
      alert('Silakan pilih dua karakter berbeda.');
      return;
    }

    // Check if relationship already exists
    const duplicate = relationships.find(
      r => (r.fromId === fromId && r.toId === toId) || (r.fromId === toId && r.toId === fromId)
    );
    if (duplicate) {
      alert('Hubungan antara kedua karakter ini sudah ada!');
      return;
    }

    const relTemplate = RELATION_TYPES.find(r => r.value === selectedRelType);
    const relColor = relTemplate ? relTemplate.color : '#94a3b8';
    const relLabel = customType.trim() !== '' ? customType.trim() : (relTemplate ? relTemplate.label.split(' ')[1] : 'Hubungan');

    const newRel: Relationship = {
      id: `rel-${Date.now()}`,
      fromId,
      toId,
      type: relLabel,
      color: relColor
    };

    saveRelationships([...relationships, newRel]);
    setCustomType('');
    setFromId('');
    setToId('');
  };

  const handleDeleteRelationship = (id: string) => {
    saveRelationships(relationships.filter(r => r.id !== id));
  };

  // Drag Mechanics
  const handleNodeMouseDown = (id: string, e: React.MouseEvent<SVGGElement>) => {
    e.stopPropagation();
    setDraggedId(id);
    const pos = positions[id] || { x: 0, y: 0 };
    
    // Get cursor position in SVG coordinates
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      dragOffset.current = {
        x: clickX - pos.x,
        y: clickY - pos.y
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedId || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    // Constrain to canvas size: 840x520
    const newX = Math.max(50, Math.min(790, cursorX - dragOffset.current.x));
    const newY = Math.max(50, Math.min(470, cursorY - dragOffset.current.y));

    const updatedPos = {
      ...positions,
      [draggedId]: { x: newX, y: newY }
    };
    setPositions(updatedPos);
  };

  const handleMouseUp = () => {
    if (draggedId) {
      setDraggedId(null);
      localStorage.setItem('fictify-mindmap-positions', JSON.stringify(positions));
    }
  };

  const resetLayout = () => {
    if (confirm('Atur ulang posisi semua karakter dalam pola lingkaran?')) {
      const newPositions: { [id: string]: { x: number; y: number } } = {};
      characters.forEach((char, idx) => {
        const angle = (idx / characters.length) * 2 * Math.PI;
        newPositions[char.id] = {
          x: 420 + Math.cos(angle) * 200,
          y: 260 + Math.sin(angle) * 160
        };
      });
      setPositions(newPositions);
      localStorage.setItem('fictify-mindmap-positions', JSON.stringify(newPositions));
    }
  };

  if (characters.length === 0) {
    return (
      <div className="p-8 h-full overflow-auto bg-[#0d1117] flex flex-col items-center justify-center">
        <div className="text-center max-w-md bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-xl">
          <Users className="w-16 h-16 text-purple-500/50 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-200 mb-2">Pustaka Karakter Kosong</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Buat beberapa karakter terlebih dahulu di menu <b>Daftar Karakter</b> sebelum Anda dapat mendesain peta hubungan sosial novel Anda secara visual.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-auto bg-[#0d1117] flex flex-col">
      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col gap-6">
        
        {/* Header Title */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
              <Network className="text-purple-400" /> Peta Hubungan Karakter
            </h2>
            <p className="text-gray-400 text-sm mt-1">Seret karakter untuk mengatur posisi dan buat tautan garis bercahaya untuk mendesain relasi sosial cerita.</p>
          </div>
          
          <button 
            onClick={resetLayout}
            className="flex items-center gap-1.5 bg-gray-850 hover:bg-gray-800 border border-gray-700 text-gray-300 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer"
            title="Posisikan semua node melingkar secara rapi"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Rapi Lingkaran
          </button>
        </div>

        {/* Creator & Canvas Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 items-stretch">
          
          {/* Column 1: Connection Builder & Relations List */}
          <div className="space-y-6 lg:col-span-1 flex flex-col justify-between">
            
            {/* Box 1: Tambah Hubungan */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg space-y-4">
              <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4" /> Hubungkan Tokoh
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">Karakter 1</label>
                  <select 
                    value={fromId} 
                    onChange={e => setFromId(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500 transition-colors"
                  >
                    <option value="">-- Pilih Tokoh --</option>
                    {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">Karakter 2</label>
                  <select 
                    value={toId} 
                    onChange={e => setToId(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500 transition-colors"
                  >
                    <option value="">-- Pilih Tokoh --</option>
                    {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">Tipe Hubungan</label>
                  <select 
                    value={selectedRelType} 
                    onChange={e => setSelectedRelType(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-500 transition-colors mb-2"
                  >
                    {RELATION_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    <option value="custom">✍️ Tulis Sendiri...</option>
                  </select>

                  {selectedRelType === 'custom' && (
                    <input 
                      type="text" 
                      value={customType} 
                      onChange={e => setCustomType(e.target.value)} 
                      placeholder="Misal: Kakak Angkat"
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-purple-500 transition-all"
                    />
                  )}
                </div>

                <button 
                  onClick={handleAddRelationship}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold tracking-wide transition-all active:scale-95 shadow-lg shadow-purple-900/30 flex items-center justify-center gap-1.5 cursor-pointer mt-4"
                >
                  <Network className="w-3.5 h-3.5" />
                  Hubungkan Hubungan
                </button>
              </div>
            </div>

            {/* Box 2: Daftar Hubungan Terbuat */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg flex-1 flex flex-col min-h-[220px] max-h-[300px] overflow-hidden mt-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Daftar Hubungan ({relationships.length})
              </h3>
              
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {relationships.map(rel => {
                  const fromChar = characters.find(c => c.id === rel.fromId);
                  const toChar = characters.find(c => c.id === rel.toId);
                  if (!fromChar || !toChar) return null;

                  return (
                    <div 
                      key={rel.id} 
                      className="flex items-center justify-between bg-gray-950/80 border border-gray-850 p-2.5 rounded-lg text-xs hover:border-gray-700 transition-colors"
                    >
                      <div className="truncate pr-2">
                        <span className="font-semibold text-gray-300 truncate">{fromChar.name}</span>
                        <span className="mx-1.5 text-gray-500">↔</span>
                        <span className="font-semibold text-gray-300 truncate">{toChar.name}</span>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: rel.color }} />
                          <span className="text-[10px] text-gray-400 font-medium">{rel.type}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteRelationship(rel.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1 rounded transition-colors"
                        title="Hapus hubungan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}

                {relationships.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-600">
                    <HelpCircle className="w-8 h-8 text-gray-800 mb-1.5" />
                    <p className="text-[10px]">Belum ada garis hubungan terbuat.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Column 2: Drag Canvas (3/4 Width) */}
          <div className="lg:col-span-3 flex flex-col bg-gray-950 border border-gray-800 rounded-2xl shadow-xl overflow-hidden relative min-h-[520px]">
            
            {/* SVG Interactive Canvas */}
            <div 
              ref={containerRef}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="w-full flex-1 relative cursor-crosshair select-none bg-[#0a0d13] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]"
            >
              <svg className="w-full h-full min-h-[500px] absolute inset-0">
                {/* SVG Filters for Glow Effects */}
                <defs>
                  <filter id="glow-neon" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <marker
                    id="arrow"
                    viewBox="0 0 10 10"
                    refX="25"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
                  </marker>
                </defs>

                {/* Render Relationships (Lines first so they are behind nodes) */}
                {relationships.map(rel => {
                  const p1 = positions[rel.fromId];
                  const p2 = positions[rel.toId];
                  if (!p1 || !p2) return null;

                  // Compute center point of the connection line
                  const midX = (p1.x + p2.x) / 2;
                  const midY = (p1.y + p2.y) / 2;

                  return (
                    <g key={rel.id}>
                      {/* Connection Line */}
                      <line 
                        x1={p1.x} 
                        y1={p1.y} 
                        x2={p2.x} 
                        y2={p2.y} 
                        stroke={rel.color} 
                        strokeWidth="3.5"
                        strokeDasharray="1000"
                        className="animate-glow-flow"
                        style={{
                          filter: `drop-shadow(0 0 4px ${rel.color})`,
                          opacity: 0.8
                        }}
                      />
                      
                      {/* Interactive Label in the middle */}
                      <g transform={`translate(${midX}, ${midY})`}>
                        <rect 
                          x={-42} 
                          y={-10} 
                          width={84} 
                          height={20} 
                          rx={6} 
                          fill="#0f172a" 
                          stroke={rel.color} 
                          strokeWidth="1.2"
                        />
                        <text 
                          textAnchor="middle" 
                          y={4} 
                          fill="#f1f5f9" 
                          fontSize="9.5" 
                          fontWeight="bold"
                          className="font-mono text-center"
                        >
                          {rel.type}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* Render Character Nodes (G) */}
                {characters.map(char => {
                  const pos = positions[char.id] || { x: 400, y: 250 };
                  const isDraggingThis = draggedId === char.id;

                  return (
                    <g 
                      key={char.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      onMouseDown={(e) => handleNodeMouseDown(char.id, e)}
                      className="cursor-grab active:cursor-grabbing group"
                    >
                      {/* Outer Pulse Circle */}
                      <circle 
                        r={34} 
                        fill="transparent" 
                        stroke={isDraggingThis ? '#a855f7' : '#4f46e5'} 
                        strokeWidth="1.5"
                        strokeDasharray="4 2"
                        className={`${isDraggingThis ? 'animate-spin' : 'group-hover:stroke-purple-400'} transition-all`}
                        style={{ opacity: 0.7 }}
                      />

                      {/* Main Glowing Circle */}
                      <circle 
                        r={28} 
                        fill="#0f172a" 
                        stroke={isDraggingThis ? '#c084fc' : '#6366f1'} 
                        strokeWidth={isDraggingThis ? '3' : '2'}
                        style={{
                          filter: isDraggingThis ? 'drop-shadow(0px 0px 8px #a855f7)' : 'drop-shadow(0px 0px 4px #4f46e5/50)'
                        }}
                      />

                      {/* Character image inside Node (if exists) */}
                      {char.imageUrl ? (
                        <g>
                          <clipPath id={`clip-${char.id}`}>
                            <circle r={26} />
                          </clipPath>
                          <image 
                            href={char.imageUrl} 
                            x={-26} 
                            y={-26} 
                            width={52} 
                            height={52} 
                            clipPath={`url(#clip-${char.id})`}
                            preserveAspectRatio="xMidYMid slice"
                          />
                        </g>
                      ) : (
                        // Default letter avatar
                        <text 
                          textAnchor="middle" 
                          y={6} 
                          fill="#818cf8" 
                          fontSize="20" 
                          fontWeight="bold"
                          className="select-none font-mono"
                        >
                          {char.name.charAt(0).toUpperCase()}
                        </text>
                      )}

                      {/* Character Label Badge underneath node */}
                      <g transform="translate(0, 43)">
                        <rect 
                          x={-55} 
                          y={-9} 
                          width={110} 
                          height={18} 
                          rx={5} 
                          fill="#0f172a/95" 
                          stroke="#334155" 
                          strokeWidth="1"
                        />
                        <text 
                          textAnchor="middle" 
                          y={3} 
                          fill="#e2e8f0" 
                          fontSize="10" 
                          fontWeight="bold"
                          className="truncate max-w-[100px]"
                        >
                          {char.name.length > 15 ? char.name.substring(0, 13) + '..' : char.name}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>

              {/* Little interactive floating manual legend */}
              <div className="absolute bottom-4 left-4 bg-gray-900/90 border border-gray-800 px-3.5 py-2.5 rounded-xl shadow-lg text-[10px] text-gray-400 space-y-1.5 backdrop-blur max-w-[200px]">
                <div className="font-semibold text-gray-200 mb-1 flex items-center gap-1">
                  💡 Panduan Cepat
                </div>
                <div>• Seret karakter untuk menggeser node.</div>
                <div>• Hubungkan karakter lewat menu panel kiri.</div>
                <div>• Hubungan tersinkron secara otomatis.</div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
