import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Category, UserProfile, Athlete, EventSettings } from '../types';
import { ClipboardList, User, Users, ShieldCheck, Camera, CheckCircle2, AlertCircle, Check } from 'lucide-react';

const AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Mia',
];

export default function RegistrationPage({ profile, settings }: { profile: UserProfile | null, settings: EventSettings }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [existingAthlete, setExistingAthlete] = useState<Athlete | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    nickname: '',
    categoryId: '',
    group: '',
    professor: '',
    photoURL: AVATARS[0]
  });

  useEffect(() => {
    // Load categories
    const unsubscribeCats = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(data);
    });

    // Check if user is already registered
    if (profile) {
      const q = query(collection(db, 'athletes'), where('uid', '==', profile.uid));
      const unsubscribeAthlete = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          setExistingAthlete({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Athlete);
        }
        setLoading(false);
      });
      return () => {
        unsubscribeCats();
        unsubscribeAthlete();
      };
    }

    return () => unsubscribeCats();
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSubmitting(true);
    try {
      const athleteData = {
        uid: profile.uid,
        ...formData,
        status: 'pending',
        registrationDate: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'athletes'), athleteData);
      setSuccess(true);
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!profile) {
    return (
      <div className="card text-center py-20">
        <AlertCircle size={48} className="mx-auto text-zinc-300 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Acesso Restrito</h2>
        <p className="text-zinc-500">Você precisa estar logado para se inscrever.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-20 animate-pulse">Carregando...</div>;
  }

  if (existingAthlete) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="card text-center py-12">
          {existingAthlete.status === 'confirmed' ? (
            <>
              <CheckCircle2 size={64} className="mx-auto text-primary mb-4" />
              <h2 className="text-3xl font-black text-primary mb-2 uppercase">Inscrição Confirmada!</h2>
              <p className="text-zinc-600 mb-6">Sua participação no {settings.eventName} está garantida.</p>
            </>
          ) : existingAthlete.status === 'pending' ? (
            <>
              <div className="w-16 h-16 bg-secondary/20 text-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardList size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Inscrição em Análise</h2>
              <p className="text-zinc-600 mb-6">Sua inscrição foi enviada e aguarda aprovação do administrador.</p>
            </>
          ) : (
            <>
              <AlertCircle size={64} className="mx-auto text-red-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-red-500">Inscrição Recusada</h2>
              <p className="text-zinc-600 mb-6">Houve um problema com sua inscrição. Entre em contato com a organização.</p>
            </>
          )}

          <div className="bg-zinc-50 rounded-xl p-6 text-left border border-zinc-100">
            <h3 className="font-bold text-zinc-400 uppercase text-xs mb-4 tracking-widest">Dados do Atleta</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-zinc-400">Nome Completo</p>
                <p className="font-medium">{existingAthlete.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">Apelido</p>
                <p className="font-medium">{existingAthlete.nickname || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">Categoria</p>
                <p className="font-medium">{categories.find(c => c.id === existingAthlete.categoryId)?.name || 'Carregando...'}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">Grupo</p>
                <p className="font-medium">{existingAthlete.group}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="card text-center py-20 max-w-2xl mx-auto">
        <CheckCircle2 size={64} className="mx-auto text-primary mb-4" />
        <h2 className="text-2xl font-bold mb-2">Sucesso!</h2>
        <p className="text-zinc-500 mb-8">Sua inscrição foi enviada para aprovação.</p>
        <button onClick={() => window.location.reload()} className="btn-primary">
          Ver Status
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
          <ClipboardList className="text-primary" />
          Inscrição de Atleta
        </h1>
        <p className="text-zinc-500">Preencha todos os campos para participar do campeonato.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase text-zinc-400 flex items-center gap-2">
                <User size={16} /> Nome Completo
              </label>
              <input 
                required
                type="text" 
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="Ex: João da Silva"
                value={formData.fullName}
                onChange={e => setFormData({...formData, fullName: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold uppercase text-zinc-400 flex items-center gap-2">
                <Star size={16} className="text-secondary" /> Apelido na Capoeira
              </label>
              <input 
                type="text" 
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="Ex: Ginga"
                value={formData.nickname}
                onChange={e => setFormData({...formData, nickname: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold uppercase text-zinc-400 flex items-center gap-2">
                <Trophy size={16} /> Categoria
              </label>
              <select 
                required
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none transition-all"
                value={formData.categoryId}
                onChange={e => setFormData({...formData, categoryId: e.target.value})}
              >
                <option value="">Selecione uma categoria</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name} ({cat.gender})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold uppercase text-zinc-400 flex items-center gap-2">
                <Users size={16} /> Grupo ou Escola
              </label>
              <input 
                required
                type="text" 
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="Ex: Grupo Ceará"
                value={formData.group}
                onChange={e => setFormData({...formData, group: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold uppercase text-zinc-400 flex items-center gap-2">
                <ShieldCheck size={16} /> Nome do Professor
              </label>
              <input 
                required
                type="text" 
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="Ex: Mestre Bimba"
                value={formData.professor}
                onChange={e => setFormData({...formData, professor: e.target.value})}
              />
            </div>

            <div className="space-y-4 md:col-span-2">
              <label className="text-sm font-bold uppercase text-zinc-400 flex items-center gap-2">
                <Camera size={16} /> Escolha seu Avatar
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                {AVATARS.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setFormData({ ...formData, photoURL: url })}
                    className={cn(
                      "relative w-full aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105",
                      formData.photoURL === url ? "border-primary ring-2 ring-primary/20" : "border-transparent bg-zinc-100"
                    )}
                  >
                    <img src={url} alt="Avatar" className="w-full h-full object-cover" />
                    {formData.photoURL === url && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <Check className="text-primary" size={24} strokeWidth={4} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={submitting}
              className="w-full btn-primary py-4 text-lg font-black uppercase tracking-widest disabled:opacity-50"
            >
              {submitting ? 'Enviando...' : 'Finalizar Inscrição'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

function Star({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function Trophy({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}
