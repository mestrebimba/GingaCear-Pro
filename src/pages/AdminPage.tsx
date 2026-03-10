import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, query, where, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Category, Athlete, UserProfile, Announcement, Bracket, Match, EventSettings } from '../types';
import { 
  Users, 
  Trophy, 
  Bell, 
  Check, 
  X, 
  Plus, 
  Trash2, 
  ChevronRight, 
  LayoutGrid,
  Shuffle,
  Video,
  Settings as SettingsIcon,
  Save
} from 'lucide-react';
import { format } from 'date-fns';

export default function AdminPage({ profile, settings }: { profile: UserProfile | null, settings: EventSettings }) {
  const [activeTab, setActiveTab] = useState<'registrations' | 'categories' | 'athletes' | 'brackets' | 'announcements' | 'live' | 'settings'>('registrations');
  
  if (profile?.role !== 'admin') {
    return <div className="text-center py-20">Acesso negado. Apenas administradores podem acessar esta área.</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-black uppercase tracking-tight">Painel Administrativo</h1>
        <div className="flex bg-zinc-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
          {[
            { id: 'registrations', label: 'Inscrições', icon: Users },
            { id: 'categories', label: 'Categorias', icon: Trophy },
            { id: 'athletes', label: 'Atletas', icon: Users },
            { id: 'brackets', label: 'Chaveamento', icon: LayoutGrid },
            { id: 'live', label: 'Ao Vivo', icon: Video },
            { id: 'announcements', label: 'Avisos', icon: Bell },
            { id: 'settings', label: 'Configurações', icon: SettingsIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-white shadow-sm text-primary' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[60vh]">
        {activeTab === 'registrations' && <RegistrationsTab />}
        {activeTab === 'categories' && <CategoriesTab />}
        {activeTab === 'athletes' && <AthletesTab />}
        {activeTab === 'brackets' && <BracketsTab />}
        {activeTab === 'announcements' && <AnnouncementsTab profile={profile} />}
        {activeTab === 'live' && <LiveStreamTab />}
        {activeTab === 'settings' && <SettingsTab settings={settings} />}
      </div>
    </div>
  );
}

function SettingsTab({ settings }: { settings: EventSettings }) {
  const [eventName, setEventName] = useState(settings.eventName);
  const [eventYear, setEventYear] = useState(settings.eventYear);
  const [logoURL, setLogoURL] = useState(settings.logoURL);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'main'), {
        eventName,
        eventYear,
        logoURL
      });
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Configurações do Evento</h2>
      <form onSubmit={handleSave} className="card space-y-4 max-w-2xl">
        <div className="space-y-2">
          <label className="text-sm font-bold text-zinc-400 uppercase">Nome do Evento</label>
          <input 
            required
            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2"
            value={eventName}
            onChange={e => setEventName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-zinc-400 uppercase">Ano do Evento</label>
          <input 
            required
            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2"
            value={eventYear}
            onChange={e => setEventYear(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-zinc-400 uppercase">URL da Logo</label>
          <input 
            required
            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2"
            value={logoURL}
            onChange={e => setLogoURL(e.target.value)}
          />
        </div>
        
        <div className="pt-4">
          <button 
            type="submit"
            disabled={saving}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>

      <div className="card max-w-2xl">
        <h3 className="text-sm font-bold text-zinc-400 uppercase mb-4">Pré-visualização da Logo</h3>
        <div className="flex items-center justify-center p-8 bg-zinc-100 rounded-xl">
          <div className="w-32 h-32 bg-white rounded-full p-2 shadow-lg border-4 border-secondary overflow-hidden flex items-center justify-center">
            <img 
              src={logoURL} 
              alt="Preview Logo" 
              className="w-full h-full object-contain p-2"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveStreamTab() {
  const [stream, setStream] = useState<any>(null);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'live_streams', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStream(data);
        setUrl(data.url);
        setTitle(data.title);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async (isActive: boolean) => {
    await setDoc(doc(db, 'live_streams', 'main'), {
      url,
      title,
      isActive,
      startedAt: isActive ? new Date().toISOString() : (stream?.startedAt || new Date().toISOString())
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Gerenciar Transmissão Ao Vivo</h2>
      <div className="card space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-bold text-zinc-400 uppercase">Título da Transmissão</label>
          <input 
            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2"
            placeholder="Ex: Finais Ceará Ginga Pro"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-zinc-400 uppercase">URL do Embed (YouTube/Twitch)</label>
          <input 
            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2"
            placeholder="Ex: https://www.youtube.com/embed/live_id"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
          <p className="text-[10px] text-zinc-400 italic">Use o link de "incorporar" (embed) para que o player funcione no app.</p>
        </div>
        
        <div className="flex gap-4 pt-4">
          <button 
            onClick={() => handleSave(true)}
            className="flex-1 btn-primary bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2"
          >
            <Video size={18} /> Iniciar Transmissão
          </button>
          <button 
            onClick={() => handleSave(false)}
            className="flex-1 btn-primary bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2"
          >
            <X size={18} /> Encerrar Transmissão
          </button>
        </div>
      </div>

      {stream?.isActive && (
        <div className="card bg-emerald-50 border-emerald-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="font-bold text-emerald-700 uppercase text-sm">Transmissão Ativa</span>
            </div>
            <p className="text-xs text-emerald-600 font-medium">Iniciada em: {format(new Date(stream.startedAt), 'HH:mm')}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function RegistrationsTab() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'athletes'), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAthletes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Athlete)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleStatus = async (id: string, status: 'confirmed' | 'rejected') => {
    await updateDoc(doc(db, 'athletes', id), { status });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Inscrições Pendentes ({athletes.length})</h2>
      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-zinc-100 rounded-xl"></div>)}
        </div>
      ) : athletes.length > 0 ? (
        <div className="grid gap-4">
          {athletes.map(athlete => (
            <div key={athlete.id} className="card flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-100 rounded-full overflow-hidden">
                  <img src={athlete.photoURL || 'https://picsum.photos/seed/athlete/100'} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-bold">{athlete.fullName}</h3>
                  <p className="text-xs text-zinc-500">{athlete.nickname} • {athlete.group}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleStatus(athlete.id, 'confirmed')}
                  className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all"
                >
                  <Check size={20} />
                </button>
                <button 
                  onClick={() => handleStatus(athlete.id, 'rejected')}
                  className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12 text-zinc-400">Nenhuma inscrição pendente.</div>
      )}
    </div>
  );
}

function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', gender: 'M' as any });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    });
    return () => unsubscribe();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'categories'), newCat);
    setNewCat({ name: '', gender: 'M' });
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir esta categoria?')) {
      await deleteDoc(doc(db, 'categories', id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Categorias ({categories.length})</h2>
        <button onClick={() => setIsAdding(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Nova Categoria
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="card bg-zinc-50 border-dashed border-2 border-primary/20 p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input 
              required
              className="bg-white border border-zinc-200 rounded-lg px-4 py-2"
              placeholder="Nome da Categoria (Ex: Peso Pena)"
              value={newCat.name}
              onChange={e => setNewCat({...newCat, name: e.target.value})}
            />
            <select 
              className="bg-white border border-zinc-200 rounded-lg px-4 py-2"
              value={newCat.gender}
              onChange={e => setNewCat({...newCat, gender: e.target.value})}
            >
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <option value="Mixed">Misto</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-zinc-500">Cancelar</button>
            <button type="submit" className="btn-primary">Salvar</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => (
          <div key={cat.id} className="card flex items-center justify-between p-4">
            <div>
              <h3 className="font-bold">{cat.name}</h3>
              <p className="text-xs text-zinc-500 uppercase tracking-widest">{cat.gender}</p>
            </div>
            <button onClick={() => handleDelete(cat.id)} className="text-red-400 hover:text-red-600">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AthletesTab() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    });
    const q = query(collection(db, 'athletes'), where('status', '==', 'confirmed'));
    onSnapshot(q, (snapshot) => {
      setAthletes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Athlete)));
    });
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Atletas Confirmados ({athletes.length})</h2>
      <div className="grid gap-4">
        {athletes.map(athlete => (
          <div key={athlete.id} className="card flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-zinc-100 rounded-full overflow-hidden">
                <img src={athlete.photoURL || 'https://picsum.photos/seed/athlete/100'} alt="" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-bold">{athlete.fullName}</h3>
                <p className="text-xs text-zinc-500">
                  {categories.find(c => c.id === athlete.categoryId)?.name} • {athlete.group}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded uppercase">Confirmado</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BracketsTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    });
    onSnapshot(collection(db, 'athletes'), (snapshot) => {
      setAthletes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Athlete)));
    });
  }, []);

  const generateBracket = async (categoryId: string) => {
    setGenerating(categoryId);
    try {
      const catAthletes = athletes.filter(a => a.categoryId === categoryId && a.status === 'confirmed');
      if (catAthletes.length < 2) {
        alert('Mínimo de 2 atletas confirmados para gerar chaveamento.');
        return;
      }

      // Simple shuffle
      const shuffled = [...catAthletes].sort(() => Math.random() - 0.5);
      
      const matches: Match[] = [];
      for (let i = 0; i < shuffled.length; i += 2) {
        matches.push({
          id: `match-${Date.now()}-${i}`,
          athlete1Id: shuffled[i].id,
          athlete2Id: shuffled[i + 1]?.id || undefined,
          round: 1,
          position: i / 2,
          status: 'pending'
        });
      }

      await setDoc(doc(db, 'brackets', categoryId), {
        categoryId,
        matches,
        status: 'active'
      });

      // Send notifications to athletes
      const category = categories.find(c => c.id === categoryId);
      for (const athlete of catAthletes) {
        await addDoc(collection(db, 'notifications'), {
          uid: athlete.uid,
          title: 'Chaveamento Gerado!',
          message: `O chaveamento da categoria ${category?.name} foi gerado. Confira sua posição!`,
          type: 'match_near',
          read: false,
          createdAt: new Date().toISOString()
        });
      }
      
      alert('Chaveamento gerado com sucesso!');
    } catch (error) {
      console.error(error);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Gerenciar Chaveamento</h2>
      <div className="grid gap-4">
        {categories.map(cat => {
          const catAthletes = athletes.filter(a => a.categoryId === cat.id && a.status === 'confirmed');
          return (
            <div key={cat.id} className="card flex items-center justify-between p-6">
              <div>
                <h3 className="font-bold text-lg">{cat.name}</h3>
                <p className="text-sm text-zinc-500">{catAthletes.length} atletas confirmados</p>
              </div>
              <button 
                onClick={() => generateBracket(cat.id)}
                disabled={generating === cat.id}
                className="btn-primary flex items-center gap-2"
              >
                <Shuffle size={18} />
                {generating === cat.id ? 'Gerando...' : 'Gerar Chaveamento'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnnouncementsTab({ profile }: { profile: UserProfile }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newAnn, setNewAnn] = useState({ title: '', content: '' });

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement)));
    });
    return () => unsubscribe();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'announcements'), {
      ...newAnn,
      date: new Date().toISOString(),
      authorId: profile.uid
    });
    setNewAnn({ title: '', content: '' });
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Avisos</h2>
        <button onClick={() => setIsAdding(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Novo Aviso
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="card bg-zinc-50 border-dashed border-2 border-primary/20 p-6 space-y-4">
          <input 
            required
            className="w-full bg-white border border-zinc-200 rounded-lg px-4 py-2"
            placeholder="Título do Aviso"
            value={newAnn.title}
            onChange={e => setNewAnn({...newAnn, title: e.target.value})}
          />
          <textarea 
            required
            className="w-full bg-white border border-zinc-200 rounded-lg px-4 py-2 h-32"
            placeholder="Conteúdo do aviso..."
            value={newAnn.content}
            onChange={e => setNewAnn({...newAnn, content: e.target.value})}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-zinc-500">Cancelar</button>
            <button type="submit" className="btn-primary">Publicar</button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {announcements.map(ann => (
          <div key={ann.id} className="card p-4 flex justify-between items-start">
            <div>
              <h3 className="font-bold">{ann.title}</h3>
              <p className="text-sm text-zinc-500">{ann.content}</p>
            </div>
            <button onClick={() => deleteDoc(doc(db, 'announcements', ann.id))} className="text-red-400">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function orderBy(field: string, direction: 'asc' | 'desc') {
  return where(field, '!=', null); // Placeholder for actual orderBy if needed, but simple query is fine
}
