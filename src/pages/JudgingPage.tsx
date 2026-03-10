import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, query, where, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Category, Athlete, Bracket, Match, UserProfile, Score } from '../types';
import { ShieldCheck, Star, Send, User, Trophy } from 'lucide-react';

export default function JudgingPage({ profile }: { profile: UserProfile | null }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [brackets, setBrackets] = useState<Record<string, Bracket>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    onSnapshot(collection(db, 'categories'), (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(cats);
      if (cats.length > 0 && !selectedCategory) setSelectedCategory(cats[0].id);
    });

    onSnapshot(collection(db, 'athletes'), (snapshot) => {
      setAthletes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Athlete)));
    });

    onSnapshot(collection(db, 'brackets'), (snapshot) => {
      const data: Record<string, Bracket> = {};
      snapshot.docs.forEach(doc => {
        data[doc.id] = { id: doc.id, ...doc.data() } as Bracket;
      });
      setBrackets(data);
    });
  }, []);

  const currentBracket = selectedCategory ? brackets[selectedCategory] : null;
  const pendingMatches = currentBracket?.matches.filter(m => m.status === 'pending' || m.status === 'active') || [];

  const handleScore = async (athleteId: string, points: number) => {
    if (!activeMatch || !profile) return;
    
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'scores'), {
        matchId: activeMatch.id,
        judgeId: profile.uid,
        athleteId,
        points,
        timestamp: new Date().toISOString()
      });
      setScores(prev => ({ ...prev, [athleteId]: points }));
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const startMatch = async (match: Match) => {
    if (!selectedCategory || !profile) return;
    
    // Update match status to active
    const bracket = brackets[selectedCategory];
    const updatedMatches = bracket.matches.map(m => 
      m.id === match.id ? { ...m, status: 'active' as const } : m
    );
    
    await updateDoc(doc(db, 'brackets', selectedCategory), {
      matches: updatedMatches
    });

    // Send notifications to both athletes
    const athlete1 = athletes.find(a => a.id === match.athlete1Id);
    const athlete2 = athletes.find(a => a.id === match.athlete2Id);
    const category = categories.find(c => c.id === selectedCategory);

    const notify = async (athlete: Athlete, opponent: Athlete) => {
      if (!athlete) return;
      await addDoc(collection(db, 'notifications'), {
        uid: athlete.uid,
        title: 'Sua luta vai começar!',
        message: `Prepare-se! Sua luta na categoria ${category?.name} contra ${opponent?.nickname || opponent?.fullName || 'TBD'} está começando agora.`,
        type: 'match_near',
        read: false,
        createdAt: new Date().toISOString()
      });
    };

    if (athlete1 && athlete2) {
      await notify(athlete1, athlete2);
      await notify(athlete2, athlete1);
    }

    setActiveMatch({ ...match, status: 'active' });
  };

  if (profile?.role !== 'judge' && profile?.role !== 'admin') {
    return <div className="text-center py-20">Acesso negado. Apenas jurados e administradores podem acessar esta área.</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
            <ShieldCheck className="text-primary" />
            Painel de Julgamento
          </h1>
          <p className="text-zinc-500">Avalie os atletas em tempo real.</p>
        </div>

        <div className="flex bg-zinc-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setActiveMatch(null);
                setScores({});
              }}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat.id ? 'bg-white shadow-sm text-primary' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {!activeMatch ? (
        <div className="grid gap-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Trophy size={20} className="text-secondary" />
            Lutas Disponíveis
          </h2>
          {pendingMatches.length > 0 ? (
            pendingMatches.map(match => (
              <button 
                key={match.id}
                onClick={() => match.status === 'active' ? setActiveMatch(match) : startMatch(match)}
                className={`card flex items-center justify-between p-6 transition-all text-left ${
                  match.status === 'active' ? 'border-primary bg-primary/5' : 'hover:border-primary'
                }`}
              >
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-zinc-400 uppercase">Luta</p>
                    <p className="text-xl font-black">#{match.position + 1}</p>
                    {match.status === 'active' && (
                      <span className="text-[8px] bg-primary text-white px-1 rounded animate-pulse">LIVE</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold">{athletes.find(a => a.id === match.athlete1Id)?.nickname || 'TBD'}</p>
                      <p className="text-[10px] text-zinc-400 uppercase">{athletes.find(a => a.id === match.athlete1Id)?.group}</p>
                    </div>
                    <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center font-black text-zinc-400 text-xs italic">VS</div>
                    <div>
                      <p className="font-bold">{athletes.find(a => a.id === match.athlete2Id)?.nickname || 'TBD'}</p>
                      <p className="text-[10px] text-zinc-400 uppercase">{athletes.find(a => a.id === match.athlete2Id)?.group}</p>
                    </div>
                  </div>
                </div>
                <ChevronRight size={24} className="text-zinc-300" />
              </button>
            ))
          ) : (
            <div className="card text-center py-12 text-zinc-400">Nenhuma luta ativa nesta categoria.</div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          <button onClick={() => setActiveMatch(null)} className="text-sm font-bold text-primary flex items-center gap-1">
            <ChevronRight className="rotate-180" size={16} /> Voltar para lista
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[activeMatch.athlete1Id, activeMatch.athlete2Id].map((athleteId, idx) => {
              const athlete = athletes.find(a => a.id === athleteId);
              if (!athlete) return null;
              
              return (
                <div key={athlete.id} className="card space-y-6 relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-full h-2 ${idx === 0 ? 'bg-primary' : 'bg-secondary'}`}></div>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-zinc-100 overflow-hidden border-2 border-zinc-100">
                      <img src={athlete.photoURL || 'https://picsum.photos/seed/athlete/200'} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter">{athlete.nickname || athlete.fullName}</h3>
                      <p className="text-sm text-zinc-500 font-bold uppercase">{athlete.group}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Atribuir Nota</p>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                        <button
                          key={num}
                          disabled={submitting}
                          onClick={() => handleScore(athlete.id, num)}
                          className={`h-12 rounded-xl font-black transition-all ${
                            scores[athlete.id] === num 
                              ? 'bg-primary text-white scale-110 shadow-lg' 
                              : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {scores[athlete.id] && (
                    <div className="flex items-center gap-2 text-primary font-bold bg-primary/5 p-3 rounded-lg">
                      <Star size={16} fill="currentColor" />
                      Nota {scores[athlete.id]} enviada com sucesso!
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-4">
            <button 
              onClick={async () => {
                if (!selectedCategory || !activeMatch) return;
                const bracket = brackets[selectedCategory];
                const updatedMatches = bracket.matches.map(m => 
                  m.id === activeMatch.id ? { ...m, status: 'completed' as const } : m
                );
                await updateDoc(doc(db, 'brackets', selectedCategory), { matches: updatedMatches });
                setActiveMatch(null);
                setScores({});
              }}
              className="flex-1 btn-primary bg-zinc-800 hover:bg-zinc-900"
            >
              Finalizar Luta
            </button>
          </div>

          <div className="card bg-accent text-white p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white/50 uppercase">Status do Julgamento</p>
              <p className="text-lg font-bold">Backup em tempo real ativado</p>
            </div>
            <div className="flex items-center gap-2 text-primary">
              <div className="w-3 h-3 bg-primary rounded-full animate-ping"></div>
              <span className="text-sm font-bold uppercase">Sincronizando</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChevronRight({ size, className }: { size: number, className?: string }) {
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
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
