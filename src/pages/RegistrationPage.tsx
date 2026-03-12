import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Category, UserProfile, Athlete, EventSettings } from '../types';
import { ClipboardList, User, Users, ShieldCheck, Camera, CheckCircle2, AlertCircle, Check, Upload, X } from 'lucide-react';
import { sendDiscordMessage, DISCORD_WEBHOOKS } from '../services/discordService';

export default function RegistrationPage({ profile, settings }: { profile: UserProfile | null, settings: EventSettings }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [existingAthlete, setExistingAthlete] = useState<Athlete | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    nickname: '',
    categoryId: '',
    group: '',
    professor: '',
    photoURL: ''
  });

  useEffect(() => {
    // Load categories
    const unsubscribeCats = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(data);
    });

    // Check if user is already registered
    if (profile && profile.role !== 'admin' && profile.role !== 'staff') {
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
    } else {
      setLoading(false);
    }

    return () => unsubscribeCats();
  }, [profile]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('A foto deve ter no máximo 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const base64 = canvas.toDataURL('image/jpeg', 0.7);
        setPhotoPreview(base64);
        setFormData(prev => ({ ...prev, photoURL: base64 }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!formData.photoURL) {
      alert('Por favor, adicione uma foto.');
      return;
    }

    setSubmitting(true);
    try {
      const athleteData = {
        uid: profile.uid,
        ...formData,
        status: 'pending',
        registrationDate: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'athletes'), athleteData);

      // Discord Log
      const categoryName = categories.find(c => c.id === formData.categoryId)?.name || 'N/A';
      await sendDiscordMessage(DISCORD_WEBHOOKS.REGISTRATION, `📝 **Nova Inscrição Recebida!**`, [
        {
          title: `Atleta: ${formData.fullName}`,
          color: 0x00FF00,
          fields: [
            { name: 'Apelido', value: formData.nickname || '-', inline: true },
            { name: 'Categoria', value: categoryName, inline: true },
            { name: 'Grupo', value: formData.group, inline: true },
            { name: 'Professor', value: formData.professor, inline: true },
            { name: 'E-mail', value: profile.email, inline: false },
          ],
          timestamp: new Date().toISOString(),
        }
      ]);

      setSuccess(true);
      if (profile.role === 'admin' || profile.role === 'staff') {
        setFormData({
          fullName: '',
          nickname: '',
          categoryId: '',
          group: '',
          professor: '',
          photoURL: ''
        });
        setPhotoPreview(null);
        setTimeout(() => setSuccess(false), 3000);
      }
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
                <Camera size={16} /> Sua Foto de Atleta
              </label>
              
              <div className="flex flex-col items-center justify-center">
                {photoPreview ? (
                  <div className="relative w-48 h-48 rounded-2xl overflow-hidden border-4 border-primary shadow-xl">
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => {
                        setPhotoPreview(null);
                        setFormData(prev => ({ ...prev, photoURL: '' }));
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="w-full h-48 border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50 transition-all group">
                    <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <Upload className="text-zinc-400" size={32} />
                    </div>
                    <p className="text-sm font-bold text-zinc-400 uppercase">Clique para escolher foto</p>
                    <p className="text-[10px] text-zinc-300 uppercase mt-1">PNG ou JPG até 2MB</p>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handlePhotoUpload}
                    />
                  </label>
                )}
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
