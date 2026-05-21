import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { 
  Globe, Users, Save, Loader2, Plus, Download, FileText, Pencil, 
  Trash2, MessageSquare, PenTool, DatabaseBackup, Upload, Wand2, 
  Maximize2, Minimize2, Volume2, Target, Image as ImageIcon,
  Folder, FolderOpen, Network, Cloud, LogIn, UserCheck, Cpu, Feather
} from 'lucide-react';

import CharacterManager from './components/CharacterManager';
import WorldManager from './components/WorldManager';
import AIPanel from './components/AIPanel';
import AIChatPanel from './components/AIChatPanel';
import NotesManager from './components/NotesManager';
import Outliner from './components/Outliner';
import CoverGenerator from './components/CoverGenerator';
import CloudManager from './components/CloudManager';
import type { UserProfile } from './components/CloudManager';
import CharacterMindMap from './components/CharacterMindMap';
import APISettings from './components/APISettings';

export interface StoryNode {
  id: string;
  title: string;
  type: 'folder' | 'chapter';
  parentId: string | null;
  content?: string; // only if type === 'chapter'
  isExpanded?: boolean; // only if type === 'folder'
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'world' | 'character' | 'chapter' | 'chat' | 'notes' | 'outliner' | 'cover' | 'cloud' | 'mindmap'>('chapter');
  const [isZenMode, setIsZenMode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [wordGoal, setWordGoal] = useState(500);
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

  // Cloud State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  // Hierarchical Nodes State
  const [nodes, setNodes] = useState<StoryNode[]>([
    { id: 'ch-1', title: 'Bab 1', type: 'chapter', parentId: null, content: '' }
  ]);
  const [activeChapterId, setActiveChapterId] = useState<string>('ch-1');
  const [isGenerating, setIsGenerating] = useState(false);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const closeSidebar = () => setIsSidebarOpen(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Mulai menulis ceritamu di sini...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] p-4 text-gray-200 pb-[50vh]',
      },
    },
  });

  // Load from localStorage on mount & perform auto-migration
  useEffect(() => {
    const savedNodes = localStorage.getItem('gemini-nodes');
    if (savedNodes) {
      try {
        const parsed = JSON.parse(savedNodes);
        if (parsed && parsed.length > 0) {
          setNodes(parsed);
          const firstChapter = parsed.find((n: any) => n.type === 'chapter');
          if (firstChapter) {
            setActiveChapterId(firstChapter.id);
          }
        }
      } catch (e) {}
    } else {
      // Auto-migrate from older flat 'gemini-chapters' format if exists
      const savedChapters = localStorage.getItem('gemini-chapters');
      if (savedChapters) {
        try {
          const parsedChapters = JSON.parse(savedChapters);
          if (parsedChapters && parsedChapters.length > 0) {
            const migrated: StoryNode[] = parsedChapters.map((ch: any) => ({
              id: ch.id,
              title: ch.title,
              type: 'chapter',
              parentId: null,
              content: ch.content
            }));
            setNodes(migrated);
            setActiveChapterId(migrated[0].id);
            localStorage.setItem('gemini-nodes', JSON.stringify(migrated));
          }
        } catch (e) {}
      } else {
        const oldContent = localStorage.getItem('story-content');
        if (oldContent) {
          const migrated = [{ id: 'ch-1', title: 'Bab 1', type: 'chapter' as const, parentId: null, content: oldContent }];
          setNodes(migrated);
          localStorage.setItem('gemini-nodes', JSON.stringify(migrated));
        }
      }
    }
  }, []);

  // Update editor when active chapter changes
  useEffect(() => {
    if (editor) {
      const activeCh = nodes.find(n => n.id === activeChapterId && n.type === 'chapter');
      if (activeCh) {
        editor.commands.setContent(activeCh.content || '', { emitUpdate: false });
      }
    }
  }, [activeChapterId, editor]);

  // Sync state with editor changes
  const saveStory = () => {
    if (editor) {
      const newContent = editor.getHTML();
      const updatedNodes = nodes.map(n => 
        n.id === activeChapterId ? { ...n, content: newContent } : n
      );
      setNodes(updatedNodes);
      localStorage.setItem('gemini-nodes', JSON.stringify(updatedNodes));
      showToast('Bab berhasil disimpan!');
      
      // Trigger cloud sync if logged in
      if (user) {
        triggerCloudSyncDirectly(updatedNodes);
      }
    }
  };

  // Automated Simulated Cloud Sync every 30 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      triggerCloudSyncDirectly(nodes);
    }, 30000);
    return () => clearInterval(interval);
  }, [user, nodes, activeChapterId]);

  const triggerCloudSyncDirectly = (currentNodes: StoryNode[]) => {
    if (!user) return;
    setSyncStatus('syncing');

    const projectData = {
      nodes: currentNodes,
      characters: JSON.parse(localStorage.getItem('gemini-characters') || '[]'),
      world: JSON.parse(localStorage.getItem('gemini-worldview') || '{}'),
      notes: localStorage.getItem('gemini-notes') || ''
    };

    setTimeout(() => {
      const savedRevisions = localStorage.getItem(`gemini-cloud-revisions-${user.email}`);
      let currentRevs = [];
      if (savedRevisions) {
        try { currentRevs = JSON.parse(savedRevisions); } catch (e) {}
      }

      const activeText = editor ? editor.getText() : "";
      const textWordCount = activeText.trim().split(/\s+/).filter(w => w.length > 0).length;

      const newRev = {
        id: `rev-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('id-ID') + ' ' + new Date().toLocaleDateString('id-ID'),
        wordCount: textWordCount,
        chapterCount: currentNodes.filter(n => n.type === 'chapter').length,
        note: `Backup Otomatis - ${new Date().toLocaleTimeString('id-ID')}`,
        data: JSON.stringify(projectData)
      };

      const updatedRevs = [newRev, ...currentRevs].slice(0, 10);
      localStorage.setItem(`gemini-cloud-revisions-${user.email}`, JSON.stringify(updatedRevs));
      setSyncStatus('synced');
    }, 1500);
  };

  const addChapter = (parentId: string | null = null) => {
    if (editor) {
      const updatedNodes = nodes.map(n => 
        n.id === activeChapterId ? { ...n, content: editor.getHTML() } : n
      );
      
      const newId = `ch-${Date.now()}`;
      const chapterCount = nodes.filter(n => n.type === 'chapter').length;
      const newChapter: StoryNode = { 
        id: newId, 
        title: `Bab ${chapterCount + 1}`, 
        type: 'chapter',
        parentId: parentId,
        content: '' 
      };
      const finalNodes = [...updatedNodes, newChapter];
      
      setNodes(finalNodes);
      setActiveChapterId(newId);
      setActiveTab('chapter');
      localStorage.setItem('gemini-nodes', JSON.stringify(finalNodes));
      showToast('Bab baru dibuat!');
    }
  };

  const addFolder = (parentId: string | null = null) => {
    const newId = `fold-${Date.now()}`;
    const folderCount = nodes.filter(n => n.type === 'folder').length;
    const newFolder: StoryNode = { 
      id: newId, 
      title: `Folder ${folderCount + 1}`, 
      type: 'folder',
      parentId: parentId,
      isExpanded: true
    };
    const finalNodes = [...nodes, newFolder];
    
    setNodes(finalNodes);
    localStorage.setItem('gemini-nodes', JSON.stringify(finalNodes));
    showToast('Folder baru berhasil dibuat!');
  };

  const renameNode = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTitle = prompt("Masukkan nama baru:", currentTitle);
    if (newTitle && newTitle.trim() !== "") {
      const updated = nodes.map(n => n.id === id ? { ...n, title: newTitle.trim() } : n);
      setNodes(updated);
      localStorage.setItem('gemini-nodes', JSON.stringify(updated));
      showToast('Nama berhasil diubah!');
    }
  };

  const deleteNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nodeToDelete = nodes.find(n => n.id === id);
    if (!nodeToDelete) return;

    const isChapter = nodeToDelete.type === 'chapter';
    const confirmMsg = isChapter 
      ? "Yakin ingin menghapus bab ini secara permanen?" 
      : "Yakin ingin menghapus folder ini beserta seluruh isinya secara permanen?";
      
    if (confirm(confirmMsg)) {
      let idsToDelete = [id];
      if (!isChapter) {
        // Recursively find children ids
        const findChildrenIds = (parentId: string): string[] => {
          let children = nodes.filter(n => n.parentId === parentId);
          let childIds = children.map(c => c.id);
          children.forEach(c => {
            if (c.type === 'folder') {
              childIds = [...childIds, ...findChildrenIds(c.id)];
            }
          });
          return childIds;
        };
        idsToDelete = [...idsToDelete, ...findChildrenIds(id)];
      }

      const updated = nodes.filter(n => !idsToDelete.includes(n.id));
      if (updated.filter(n => n.type === 'chapter').length === 0) {
        alert("Novel harus memiliki setidaknya 1 bab.");
        return;
      }
      setNodes(updated);
      localStorage.setItem('gemini-nodes', JSON.stringify(updated));
      
      if (idsToDelete.includes(activeChapterId)) {
        const remainingChapters = updated.filter(n => n.type === 'chapter');
        setActiveChapterId(remainingChapters[0].id);
      }
      showToast(isChapter ? "Bab dihapus" : "Folder dihapus");
    }
  };

  const toggleFolderExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = nodes.map(n => n.id === id ? { ...n, isExpanded: !n.isExpanded } : n);
    setNodes(updated);
    localStorage.setItem('gemini-nodes', JSON.stringify(updated));
  };

  const moveNode = (id: string, targetParentId: string | null | 'root', e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const pId = targetParentId === 'root' ? null : targetParentId;
    if (id === pId) return;

    const updated = nodes.map(n => n.id === id ? { ...n, parentId: pId } : n);
    setNodes(updated);
    localStorage.setItem('gemini-nodes', JSON.stringify(updated));
    showToast("Posisi bab dipindahkan!");
  };

  // Compile full novel recursively
  const compileContentRecursively = (sourceNodes: StoryNode[], parentId: string | null, depth = 0): string => {
    const levelNodes = sourceNodes.filter(n => n.parentId === parentId);
    
    // Sort folders first, then chapters
    const sortedNodes = [...levelNodes].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.title.localeCompare(b.title);
    });

    let text = "";
    sortedNodes.forEach(node => {
      if (node.type === 'folder') {
        const indent = "  ".repeat(depth);
        text += `\n${indent}=== FOLDER: ${node.title.toUpperCase()} ===\n`;
        text += compileContentRecursively(sourceNodes, node.id, depth + 1);
      } else {
        const indent = "  ".repeat(depth);
        text += `\n${indent}--- ${node.title.toUpperCase()} ---\n\n`;
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = node.content || "";
        const paragraphs = tempDiv.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');
        if (paragraphs.length > 0) {
          paragraphs.forEach(p => {
            text += indent + p.textContent + "\n\n";
          });
        } else {
          text += indent + tempDiv.innerText + "\n\n";
        }
      }
    });
    return text;
  };

  const handleExport = () => {
    let exportText = "=== NOVEL SAYA (STRUKTUR HIERARKI) ===\n\n";
    
    // Auto save current
    const currentEditorContent = editor?.getHTML() || "";
    const updatedNodes = nodes.map(n => 
      n.id === activeChapterId ? { ...n, content: currentEditorContent } : n
    );

    setNodes(updatedNodes);
    localStorage.setItem('gemini-nodes', JSON.stringify(updatedNodes));

    exportText += compileContentRecursively(updatedNodes, null, 0);
    
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Novel_Fictify.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBackup = () => {
    const currentEditorContent = editor?.getHTML() || "";
    const updatedNodes = nodes.map(n => 
      n.id === activeChapterId ? { ...n, content: currentEditorContent } : n
    );
    
    const projectData = {
      version: "2.0",
      nodes: updatedNodes,
      characters: JSON.parse(localStorage.getItem('gemini-characters') || '[]'),
      world: JSON.parse(localStorage.getItem('gemini-worldview') || '{}'),
      notes: localStorage.getItem('gemini-notes') || ''
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Novel_Saya.fictify';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (data.nodes) {
          setNodes(data.nodes);
          localStorage.setItem('gemini-nodes', JSON.stringify(data.nodes));
          const firstCh = data.nodes.find((n: any) => n.type === 'chapter');
          if (firstCh) {
            setActiveChapterId(firstCh.id);
            if (editor) editor.commands.setContent(firstCh.content || '');
          }
        } else if (data.chapters) {
          // Auto migrate older format
          const migrated: StoryNode[] = data.chapters.map((ch: any) => ({
            id: ch.id,
            title: ch.title,
            type: 'chapter',
            parentId: null,
            content: ch.content
          }));
          setNodes(migrated);
          localStorage.setItem('gemini-nodes', JSON.stringify(migrated));
          setActiveChapterId(migrated[0].id);
          if (editor) editor.commands.setContent(migrated[0].content || '');
        }

        if (data.characters) localStorage.setItem('gemini-characters', JSON.stringify(data.characters));
        if (data.world) localStorage.setItem('gemini-worldview', JSON.stringify(data.world));
        if (data.notes !== undefined) localStorage.setItem('gemini-notes', data.notes);

        showToast("Proyek berhasil dipulihkan!");
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        showToast("File proyek tidak valid atau rusak.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleRestoreFromCloud = (cloudData: any) => {
    if (cloudData.nodes) {
      setNodes(cloudData.nodes);
      localStorage.setItem('gemini-nodes', JSON.stringify(cloudData.nodes));
      const firstCh = cloudData.nodes.find((n: any) => n.type === 'chapter');
      if (firstCh) {
        setActiveChapterId(firstCh.id);
        if (editor) editor.commands.setContent(firstCh.content || '');
      }
    }
    if (cloudData.characters) localStorage.setItem('gemini-characters', JSON.stringify(cloudData.characters));
    if (cloudData.world) localStorage.setItem('gemini-worldview', JSON.stringify(cloudData.world));
    if (cloudData.notes !== undefined) localStorage.setItem('gemini-notes', cloudData.notes);

    showToast("Restorasi data dari GeminiCloud Berhasil!");
    setTimeout(() => window.location.reload(), 800);
  };

  const handleOutlineGenerated = (newChapters: {title: string; content: string}[]) => {
    const generated = newChapters.map((ch, idx) => ({
      id: `ch-ai-${Date.now()}-${idx}`,
      title: ch.title,
      type: 'chapter' as const,
      parentId: null,
      content: ch.content
    }));
    
    if (editor) {
      const updatedNodes = nodes.map(n => 
         n.id === activeChapterId ? { ...n, content: editor.getHTML() } : n
      );
      const finalNodes = [...updatedNodes, ...generated];
      setNodes(finalNodes);
      localStorage.setItem('gemini-nodes', JSON.stringify(finalNodes));
      setActiveChapterId(generated[0].id);
      setActiveTab('chapter');
    }
  };

  const handleSpeak = () => {
    if (!editor) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const text = editor.getText();
    if (!text) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const wordCount = editor ? editor.getText().trim().split(/\s+/).filter(w => w.length > 0).length : 0;
  const progressPercent = Math.min((wordCount / wordGoal) * 100, 100);
  const chapterCount = nodes.filter(n => n.type === 'chapter').length;

  const renderContent = () => {
    if (activeTab === 'world') {
      return <WorldManager />;
    }
    if (activeTab === 'character') {
      return <CharacterManager />;
    }
    if (activeTab === 'chat') {
      return <AIChatPanel />;
    }
    if (activeTab === 'notes') {
      return <NotesManager />;
    }
    if (activeTab === 'outliner') {
      return <Outliner onChaptersGenerated={handleOutlineGenerated} />;
    }
    if (activeTab === 'cover') {
      return <CoverGenerator />;
    }
    if (activeTab === 'mindmap') {
      return <CharacterMindMap />;
    }
    if (activeTab === 'cloud') {
      return (
        <CloudManager 
          user={user}
          setUser={setUser}
          syncStatus={syncStatus}
          triggerSync={() => triggerCloudSyncDirectly(nodes)}
          onRestore={handleRestoreFromCloud}
          wordCount={wordCount}
          chapterCount={chapterCount}
        />
      );
    }
    return (
      <div className={`flex-1 overflow-auto p-3 sm:p-6 lg:p-8 relative transition-all duration-500 ${isZenMode ? 'bg-black' : ''}`}>
        <div className={`max-w-3xl mx-auto rounded-xl shadow-xl overflow-hidden relative transition-all duration-500 ${isZenMode ? 'bg-black border-transparent' : 'bg-gray-800/30 border border-gray-700/50'}`}>
           <EditorContent editor={editor} className="min-h-[60vh] max-h-[70vh] overflow-y-auto" />
           
           {isGenerating && (
               <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-10">
                 <div className="flex items-center gap-3 bg-gray-800 px-6 py-4 rounded-xl shadow-2xl border border-purple-500/30">
                   <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                   <span className="text-purple-100 font-medium">Gemini sedang merangkai cerita...</span>
                 </div>
               </div>
            )}
         </div>
       </div>
     );
   };

  const activeChapterTitle = nodes.find(n => n.id === activeChapterId && n.type === 'chapter')?.title || 'Bab';

  // Recursive Sidebar Tree Nodes renderer
  const renderTreeNodes = (parentId: string | null, depth = 0) => {
    const levelNodes = nodes.filter(n => n.parentId === parentId);
    const sortedNodes = [...levelNodes].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.title.localeCompare(b.title);
    });

    return sortedNodes.map(node => {
      const isFolder = node.type === 'folder';
      const isSelected = activeTab === 'chapter' && activeChapterId === node.id;
      const targetFolders = nodes.filter(n => n.type === 'folder' && n.id !== node.id);

      return (
        <div key={node.id} className="relative group mt-0.5">
          <div 
            style={{ paddingLeft: `${depth * 10 + 8}px` }}
            className={`flex items-center justify-between py-1.5 pr-2 rounded-lg text-sm transition-all border border-transparent ${
              isSelected 
                ? 'bg-purple-900/30 text-purple-400 border-purple-500/30' 
                : 'hover:bg-gray-850/50 text-gray-400 hover:text-gray-200'
            }`}
          >
            <button
              onClick={() => {
                if (isFolder) {
                  const e = { stopPropagation: () => {} } as React.MouseEvent;
                  toggleFolderExpand(node.id, e);
                } else {
                  if (editor) {
                    setNodes(prev => prev.map(n => n.id === activeChapterId ? { ...n, content: editor.getHTML() } : n));
                  }
                  setActiveChapterId(node.id);
                  setActiveTab('chapter');
                }
              }}
              className="flex-1 flex items-center gap-2 text-left truncate cursor-pointer"
            >
              {isFolder ? (
                node.isExpanded ? (
                  <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-in fade-in duration-200" />
                ) : (
                  <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                )
              ) : (
                <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              )}
              <span className="truncate">{node.title}</span>
            </button>

            {/* Actions Panel */}
            <div className="flex items-center gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity ml-1">
              {isFolder && (
                <button 
                  onClick={() => addChapter(node.id)} 
                  className="p-1.5 lg:p-1 text-gray-500 hover:text-purple-400" 
                  title="Tambah Bab"
                >
                  <Plus className="w-3.5 h-3.5 lg:w-3 lg:h-3" />
                </button>
              )}
              
              {/* Move Node Dropdown */}
              <select
                value={node.parentId || 'root'}
                onChange={(e) => moveNode(node.id, e.target.value, e)}
                onClick={(e) => e.stopPropagation()}
                className="bg-gray-900 text-gray-500 text-[9px] lg:text-[9px] rounded border border-gray-800 py-0.5 lg:py-0.2 px-1 lg:px-0.5 max-w-[56px] lg:max-w-[48px] focus:outline-none"
                title="Pindahkan..."
              >
                <option value="root">Root</option>
                {targetFolders.map(tf => (
                  <option key={tf.id} value={tf.id}>{tf.title}</option>
                ))}
              </select>

              <button onClick={(e) => renameNode(node.id, node.title, e)} className="p-1.5 lg:p-0.5 text-gray-500 hover:text-blue-400" title="Ubah Nama">
                <Pencil className="w-3.5 h-3.5 lg:w-3 lg:h-3" />
              </button>
              <button onClick={(e) => deleteNode(node.id, e)} className="p-1.5 lg:p-0.5 text-gray-500 hover:text-red-400" title="Hapus">
                <Trash2 className="w-3.5 h-3.5 lg:w-3 lg:h-3" />
              </button>
            </div>
          </div>

          {/* Children nodes */}
          {isFolder && node.isExpanded && (
            <div className="mt-0.5">
              {renderTreeNodes(node.id, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex h-screen bg-[#0d1117] text-gray-200 font-sans overflow-hidden">
      
      {/* Sidebar */}
      {!isZenMode && (
        <>
          {/* Mobile overlay */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={closeSidebar}
            />
          )}
          <div className={`fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto w-64 bg-gray-950 border-r border-gray-850 flex flex-col shrink-0 transition-transform duration-300 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}>
          
          {/* Top of Sidebar */}
          <div className="flex-1 overflow-y-auto flex flex-col">
            <div className="p-4 border-b border-gray-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Feather className="w-5.5 h-5.5 text-purple-500 shrink-0" />
                <h1 className="text-xl font-bold font-mono">Fictify</h1>
              </div>
              <button
                onClick={() => setIsApiSettingsOpen(true)}
                className="p-1.5 text-gray-500 hover:text-purple-400 hover:bg-gray-900/50 rounded-lg transition-all cursor-pointer"
                title="Pengaturan Mesin AI"
              >
                <Cpu className="w-4.5 h-4.5" />
              </button>
            </div>
            
            <div className="p-4 flex flex-col gap-5 flex-1">
              <nav className="space-y-1">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-2">Memulai</h3>
                <button 
                  onClick={() => { setActiveTab('cover'); closeSidebar(); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-left font-medium transition-colors mb-1 ${activeTab === 'cover' ? 'bg-pink-950/30 text-pink-400 border border-pink-500/20' : 'bg-pink-900/5 hover:bg-pink-900/25 text-pink-400/90 border border-transparent'}`}
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Sampul Buku
                </button>
                <button 
                  onClick={() => { setActiveTab('outliner'); closeSidebar(); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-left font-medium transition-colors ${activeTab === 'outliner' ? 'bg-indigo-950/30 text-indigo-400 border border-indigo-500/20' : 'bg-purple-950/15 hover:bg-purple-950/30 text-purple-400 border border-purple-500/10'}`}
                >
                  <Wand2 className="w-3.5 h-3.5" /> AI Outliner
                </button>
              </nav>

              <nav className="space-y-1">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-2">Riset & Peta</h3>
                <button 
                  onClick={() => { setActiveTab('world'); closeSidebar(); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-left transition-colors ${activeTab === 'world' ? 'bg-gray-900 text-purple-400 border border-gray-850' : 'hover:bg-gray-900/40 text-gray-400 border border-transparent'}`}
                >
                  <Globe className="w-3.5 h-3.5" /> Aturan Dunia
                </button>
                <button 
                  onClick={() => { setActiveTab('character'); closeSidebar(); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-left transition-colors ${activeTab === 'character' ? 'bg-gray-900 text-purple-400 border border-gray-850' : 'hover:bg-gray-900/40 text-gray-400 border border-transparent'}`}
                >
                  <Users className="w-3.5 h-3.5" /> Daftar Karakter
                </button>
                <button 
                  onClick={() => { setActiveTab('mindmap'); closeSidebar(); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-left font-medium transition-colors ${activeTab === 'mindmap' ? 'bg-purple-950/30 text-purple-400 border border-purple-500/20' : 'hover:bg-gray-900/40 text-gray-400 border border-transparent'}`}
                >
                  <Network className="w-3.5 h-3.5" /> Peta Hubungan
                </button>
                <button 
                  onClick={() => { setActiveTab('chat'); closeSidebar(); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-left transition-colors ${activeTab === 'chat' ? 'bg-gray-900 text-purple-400 border border-gray-850' : 'hover:bg-gray-900/40 text-gray-400 border border-transparent'}`}
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Diskusi AI (Co-Pilot)
                </button>
                <button 
                  onClick={() => { setActiveTab('notes'); closeSidebar(); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-left transition-colors ${activeTab === 'notes' ? 'bg-gray-900 text-purple-400 border border-gray-850' : 'hover:bg-gray-900/40 text-gray-400 border border-transparent'}`}
                >
                  <PenTool className="w-3.5 h-3.5" /> Catatan Ide
                </button>
              </nav>

              {/* Collapsible Story Tree Nodes */}
              <div>
                <div className="flex items-center justify-between mb-2 px-2">
                  <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Struktur Buku</h3>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => addFolder(null)} className="text-gray-500 hover:text-amber-500 transition-colors p-0.5" title="Tambah Folder">
                      <Folder className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => addChapter(null)} className="text-gray-500 hover:text-purple-400 transition-colors p-0.5" title="Tambah Bab Baru">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                <nav className="space-y-0.5 max-h-[220px] overflow-y-auto pr-1">
                  {renderTreeNodes(null, 0)}
                </nav>
              </div>

              <div>
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-2">Data Proyek</h3>
                <div className="space-y-1.5 px-2">
                  <button 
                    onClick={handleBackup}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-left bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40 border border-emerald-500/10 transition-colors"
                  >
                    <DatabaseBackup className="w-3.5 h-3.5" /> Backup Proyek
                  </button>
                  <label 
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-left bg-blue-950/20 text-blue-400 hover:bg-blue-950/40 border border-blue-500/10 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" /> Load Proyek
                    <input type="file" accept=".fictify,.json" onChange={handleLoadProject} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom of Sidebar: Login/Cloud Sync Status widget */}
          <div className="p-3 border-t border-gray-900 bg-gray-950 shrink-0">
            <button
              onClick={() => { setActiveTab('cloud'); closeSidebar(); }}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                user 
                  ? 'bg-purple-950/15 border-purple-500/20 hover:bg-purple-950/30' 
                  : 'bg-gray-900/50 border-gray-800/80 hover:bg-gray-900 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {user ? (
                  <div className="w-8 h-8 rounded-lg bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-sm shrink-0">
                    {user.avatar.substring(0, 2)}
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
                    <Cloud className="w-4 h-4 text-gray-500" />
                  </div>
                )}

                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-gray-200 truncate leading-tight">
                    {user ? user.penName : 'Offline Workspace'}
                  </h4>
                  <p className="text-[9px] text-gray-500 mt-0.5 truncate font-medium">
                    {user ? 'GeminiCloud Sync Aktif' : 'Masuk Akun Pujangga'}
                  </p>
                </div>
              </div>

              {user ? (
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  syncStatus === 'syncing' ? 'bg-amber-400 animate-ping' :
                  syncStatus === 'synced' ? 'bg-emerald-400' : 'bg-purple-500'
                }`} />
              ) : (
                <LogIn className="w-3.5 h-3.5 text-gray-500" />
              )}
            </button>
          </div>

          </div>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden pb-16 lg:pb-0">
        {/* Topbar */}
        {!isZenMode && (
          <div className="h-14 border-b border-gray-850 bg-gray-900/30 backdrop-blur flex items-center justify-between px-3 lg:px-6 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                title="Open menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h2 className="text-sm font-semibold text-gray-300 truncate max-w-[120px] sm:max-w-xs">
                {activeTab === 'world' ? 'Aturan Dunia Novel' : 
                 activeTab === 'character' ? 'Daftar Tokoh Cerita' : 
                 activeTab === 'chat' ? 'Diskusi Penulisan AI' :
                 activeTab === 'notes' ? 'Ide & Corat-coret' :
                 activeTab === 'outliner' ? 'Pembuat Kerangka Cerita AI' :
                 activeTab === 'cover' ? 'Pembuat Sampul Buku AI' :
                 activeTab === 'mindmap' ? 'Peta Hubungan Tokoh' :
                 activeTab === 'cloud' ? 'Manajemen Sinkronisasi GeminiCloud' :
                 `Sedang Menulis: ${activeChapterTitle}`}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 lg:gap-3">
              {activeTab === 'chapter' && (
                <button 
                  onClick={handleSpeak}
                  className={`flex items-center justify-center p-1.5 rounded-full transition-colors ${isSpeaking ? 'bg-blue-500 text-white animate-pulse' : 'text-gray-400 hover:text-blue-400 hover:bg-blue-900/30'}`}
                  title="Bacakan Cerita (Text-to-Speech)"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              )}
              {activeTab === 'chapter' && (
                <button 
                  onClick={() => {
                    const newGoalStr = prompt("Masukkan target kata menulis harian Anda:", wordGoal.toString());
                    if (newGoalStr) {
                      const parsed = parseInt(newGoalStr);
                      if (!isNaN(parsed) && parsed > 0) {
                        setWordGoal(parsed);
                        showToast(`Target menulis harian diubah menjadi ${parsed} kata!`);
                      }
                    }
                  }}
                  className="hidden sm:flex items-center gap-2 bg-gray-900/80 pl-3 pr-2 py-1.5 rounded-lg text-xs text-gray-400 font-semibold border border-gray-850 relative overflow-hidden group cursor-pointer"
                  title={`Klik untuk mengubah target harian. Saat ini: ${wordCount} / ${wordGoal} kata`}
                >
                  <Target className="w-3.5 h-3.5 text-yellow-500 animate-pulse relative z-10" />
                  <span className="relative z-10">{wordCount} / {wordGoal}</span>
                  <div className="absolute left-0 top-0 bottom-0 bg-yellow-500/10 z-0 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                  {progressPercent >= 100 && (
                    <div className="absolute left-0 top-0 bottom-0 bg-yellow-500/30 z-0 transition-all duration-500 w-full animate-pulse"></div>
                  )}
                </button>
              )}
              {activeTab === 'chapter' && (
                <button 
                  onClick={() => setIsZenMode(true)}
                  className="hidden sm:flex items-center gap-2 bg-indigo-950/20 hover:bg-indigo-900/30 text-indigo-400 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border border-indigo-500/10"
                  title="Fokus Mode"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Zen
                </button>
              )}
              {activeTab === 'chapter' && (
                <button 
                  onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                  className="lg:hidden flex items-center justify-center p-1.5 text-gray-400 hover:text-purple-400 hover:bg-gray-800 rounded-lg transition-colors"
                  title="Toggle AI Panel"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              )}
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 bg-gray-900 hover:bg-gray-850 text-gray-300 px-2 lg:px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors border border-gray-850"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ekspor (.txt)</span>
              </button>
              {activeTab === 'chapter' && (
                <button 
                  onClick={saveStory}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-2 lg:px-4 py-1.5 rounded-md text-xs font-bold shadow-lg shadow-purple-900/20 transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Simpan</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Zen Mode Escape Button */}
        {isZenMode && activeTab === 'chapter' && (
          <div className="absolute top-4 right-4 z-50">
            <button 
              onClick={() => setIsZenMode(false)}
              className="flex items-center gap-2 bg-gray-900/50 hover:bg-gray-850 text-gray-400 hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all backdrop-blur"
            >
              <Minimize2 className="w-3.5 h-3.5" /> Keluar Zen Mode
            </button>
          </div>
        )}

        {/* Dynamic Content */}
        {renderContent()}
      </div>

      {/* Right AI Panel (Only visible in Editor mode) */}
      {!isZenMode && activeTab === 'chapter' && (() => {
        const getPreviousChapter = (): { title: string; content: string } | null => {
          const list: StoryNode[] = [];
          const traverse = (parentId: string | null) => {
            const levelNodes = nodes.filter(n => n.parentId === parentId);
            const sorted = [...levelNodes].sort((a, b) => {
              if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
              return a.title.localeCompare(b.title);
            });
            sorted.forEach(node => {
              if (node.type === 'folder') {
                traverse(node.id);
              } else {
                list.push(node);
              }
            });
          };
          traverse(null);

          const activeIndex = list.findIndex(ch => ch.id === activeChapterId);
          if (activeIndex > 0) {
            const prev = list[activeIndex - 1];
            return {
              title: prev.title,
              content: prev.content || ''
            };
          }
          return null;
        };

        const prevChapter = getPreviousChapter();

        return (
          <>
            {/* Mobile overlay for right panel */}
            {isRightPanelOpen && (
              <div 
                className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                onClick={() => setIsRightPanelOpen(false)}
              />
            )}
            <div className={`fixed lg:relative inset-y-0 right-0 z-50 lg:z-auto w-80 lg:w-[28rem] bg-gray-950 border-l border-gray-850 flex flex-col shrink-0 transition-transform duration-300 ${
              isRightPanelOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
            }`}>
              <div className="flex items-center justify-between p-3 border-b border-gray-850 lg:hidden">
                <span className="text-sm font-semibold text-gray-300">AI Assistant</span>
                <button 
                  onClick={() => setIsRightPanelOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <AIPanel 
                editor={editor} 
                isGenerating={isGenerating} 
                setIsGenerating={setIsGenerating} 
                currentChapterTitle={activeChapterTitle}
                previousChapterTitle={prevChapter?.title}
                previousChapterContent={prevChapter?.content}
              />
            </div>
          </>
        );
      })()}

      {/* API Settings Modal */}
      <APISettings 
        isOpen={isApiSettingsOpen} 
        onClose={() => setIsApiSettingsOpen(false)} 
        onSaveNotify={() => showToast("Pengaturan AI Berhasil Disimpan!")}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-900 text-emerald-400 border border-emerald-500/20 px-6 py-3.5 rounded-full shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom-5 fade-in duration-300 z-[70] backdrop-blur-md">
          <UserCheck className="w-4 h-4" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      {!isZenMode && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] lg:hidden bg-gray-950/95 backdrop-blur border-t border-gray-850 safe-area-bottom">
          <div className="flex items-center justify-around py-2 px-1">
            <button 
              onClick={() => { setActiveTab('chapter'); closeSidebar(); }}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-[48px] ${activeTab === 'chapter' ? 'text-purple-400' : 'text-gray-500'}`}
            >
              <FileText className="w-5 h-5" />
              <span className="text-[10px]">Tulis</span>
            </button>
            <button 
              onClick={() => { setActiveTab('character'); closeSidebar(); }}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-[48px] ${activeTab === 'character' ? 'text-purple-400' : 'text-gray-500'}`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[10px]">Karakter</span>
            </button>
            <button 
              onClick={() => { setActiveTab('chat'); closeSidebar(); }}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-[48px] ${activeTab === 'chat' ? 'text-purple-400' : 'text-gray-500'}`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-[10px]">AI Chat</span>
            </button>
            <button 
              onClick={() => { setActiveTab('notes'); closeSidebar(); }}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-[48px] ${activeTab === 'notes' ? 'text-purple-400' : 'text-gray-500'}`}
            >
              <PenTool className="w-5 h-5" />
              <span className="text-[10px]">Catatan</span>
            </button>
            <button 
              onClick={() => { setActiveTab('cloud'); closeSidebar(); }}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-[48px] ${activeTab === 'cloud' ? 'text-purple-400' : 'text-gray-500'}`}
            >
              <Cloud className="w-5 h-5" />
              <span className="text-[10px]">Cloud</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
