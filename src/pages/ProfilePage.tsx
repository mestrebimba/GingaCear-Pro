import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Athlete, Category, UserProfile, Score } from '../types';
import { User, ShieldCheck, Trophy, Star, MapPin, School, GraduationCap, Music, Gamepad2 } from 'lucide-react';

export default function ProfilePage({ profile }: { profile: UserProfile | null }) {
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    const q = query(collection(db, 'athletes'), where('uid', '==', profile.uid));
    const unsubscribeAthlete = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const athleteData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Athlete;
        setAthlete(athleteData);
        
        // Load category
        onSnapshot(doc(db, 'categories', athleteData.categoryId), (docSnap) => {
          if (docSnap.exists()) setCategory({ id: docSnap.id, ...docSnap.data() } as Category);
        });

        // Load scores
        const qScores = query(collection(db, 'scores'), where('athleteId', '==', athleteData.id));
        onSnapshot(qScores, (scoreSnap) => {
          setScores(scoreSnap.docs.map(d => ({ id: d.id, ...d.data() } as Score)));
        });
      }
      setLoading(false);
    });

    return () => unsubscribeAthlete();
  }, [profile]);

  if (!profile) {
    return <div className="text-center py-20">Você precisa estar logado para ver seu perfil.</div>;
  }

  if (loading) {
    return <div className="text-center py-20 animate-pulse">Carregando perfil...</div>;
  }

  const angolaScores = scores.filter(s => s.gameType === 'angola');
  const regionalScores = scores.filter(s => s.gameType === 'regional');

  const angolaAvg = angolaScores.length > 0 ? angolaScores.reduce((a, b) => a + b.points, 0) / angolaScores.length : 0;
  const regionalAvg = regionalScores.length > 0 ? regionalScores.reduce((a, b) => a + b.points, 0) / regionalScores.length : 0;
  
  const avgScore = (angolaAvg + regionalAvg) / (angolaAvg > 0 && regionalAvg > 0 ? 2 : 1);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Profile */}
      <div className="card bg-primary text-white p-8 sm:p-12 rounded-[2rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-8">
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl bg-white/10 backdrop-blur-md p-2 border border-white/20">
            <img 
              src={athlete?.photoURL || profile.photoURL || 'https://picsum.photos/seed/athlete/400'} 
              alt="" 
              className="w-full h-full object-cover rounded-2xl"
            />
          </div>
          
          <div className="text-center sm:text-left space-y-2">
            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
              <span className="bg-secondary text-primary text-[10px] font-black uppercase px-2 py-1 rounded tracking-widest">
                {profile.role}
              </span>
              {athlete?.status === 'confirmed' && (
                <span className="bg-white/20 text-white text-[10px] font-black uppercase px-2 py-1 rounded tracking-widest flex items-center gap-1">
                  <ShieldCheck size={10} /> Atleta Confirmado
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter leading-none">
              {athlete?.nickname || profile.displayName}
            </h1>
            <p className="text-white/70 font-medium">{athlete?.fullName || profile.email}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Stats */}
        <div className="md:col-span-1 space-y-4">
          <div className="card p-6 flex flex-col items-center text-center">
            <p className="text-xs font-black text-zinc-400 uppercase mb-1">Média Geral</p>
            <p className="text-5xl font-black text-primary">{avgScore.toFixed(1)}</p>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} size={14} fill={i <= Math.round(avgScore / 2) ? '#fcd116' : 'none'} className={i <= Math.round(avgScore / 2) ? 'text-secondary' : 'text-zinc-200'} />
              ))}
            </div>
            <div className="mt-6 w-full space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase">
                <span className="text-zinc-400">São Bento Angola</span>
                <span className="text-primary">{angolaAvg.toFixed(1)}</span>
              </div>
              <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary h-full transition-all" style={{ width: `${angolaAvg * 10}%` }}></div>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black uppercase pt-2">
                <span className="text-zinc-400">São Bento Regional</span>
                <span className="text-primary">{regionalAvg.toFixed(1)}</span>
              </div>
              <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-secondary h-full transition-all" style={{ width: `${regionalAvg * 10}%` }}></div>
              </div>
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-zinc-400">Informações</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <School size={18} className="text-primary" />
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Grupo</p>
                  <p className="text-sm font-bold">{athlete?.group || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <GraduationCap size={18} className="text-primary" />
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Professor</p>
                  <p className="text-sm font-bold">{athlete?.professor || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Trophy size={18} className="text-secondary" />
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Categoria</p>
                  <p className="text-sm font-bold">{category?.name || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History / Timeline */}
        <div className="md:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList size={24} className="text-primary" />
            Histórico de Notas
          </h2>

          {scores.length > 0 ? (
            <div className="space-y-4">
              {scores.map((score) => (
                <div key={score.id} className="card flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${score.gameType === 'angola' ? 'bg-primary/10 text-primary' : 'bg-secondary/20 text-primary'}`}>
                      {score.gameType === 'angola' ? <Music size={20} /> : <Gamepad2 size={20} />}
                    </div>
                    <div>
                      <p className="font-bold">Avaliação: <span className="uppercase">{score.gameType}</span></p>
                      <p className="text-xs text-zinc-400">Jurado {score.judgeType} • {new Date(score.timestamp).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-primary">
                    {score.points}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12 text-zinc-400 border-dashed border-2">
              Nenhuma nota registrada ainda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClipboardList({ size, className }: { size: number, className?: string }) {
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
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  );
}
