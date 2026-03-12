import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, query, where, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Category, Athlete, Bracket, Match, UserProfile, Score, JudgeType, GameType } from '../types';
import { ShieldCheck, Star, Send, User, Trophy, Music, Disc, Gamepad2, ChevronRight as ChevronRightIcon, Sword } from 'lucide-react';
import { sendDiscordMessage, DISCORD_WEBHOOKS } from '../services/discordService';

export default function JudgingPage({ profile }: { profile: UserProfile | null }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [brackets, setBrackets] = useState<Record<string, Bracket>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [liveScores, setLiveScores] = useState<Score[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [judgeType, setJudgeType] = useState<JudgeType | null>(profile?.judgeType || null);
  const [gameType, setGameType] = useState<GameType>('angola');
  const [accessCode, setAccessCode] = useState('');
  const [hasAccess, setHasAccess] = useState(false);

  const handleAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode === 'rabelodev') {
      if (profile) {
        await updateDoc(doc(db, 'users', profile.uid), { role: 'staff' });
        
        // Discord Log for staff access
        await sendDiscordMessage(DISCORD_WEBHOOKS.STAFF, `🔑 **Acesso Staff Concedido!**`, [
          {
            title: `Usuário: ${profile.displayName}`,
            color: 0xF1C40F,
            fields: [
              { name: 'E-mail', value: profile.email, inline: true },
              { name: 'Ação', value: 'Usou código de acesso rabelodev', inline: true },
            ],
            timestamp: new Date().toISOString(),
          }
        ]);
      }
      setHasAccess(true);
    } else {
      alert('Código de acesso incorreto.');
    }
  };

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

  useEffect(() => {
    if (!activeMatch) {
      setLiveScores([]);
      return;
    }

    const q = query(collection(db, 'scores'), where('matchId', '==', activeMatch.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLiveScores(snapshot.docs.map(doc => doc.data() as Score));
    });

    return () => unsubscribe();
  }, [activeMatch]);

  const currentBracket = selectedCategory ? brackets[selectedCategory] : null;
  const pendingMatches = currentBracket?.matches.filter(m => m.status === 'pending' || m.status === 'active') || [];

  const handleScore = async (athleteId: string, points: number) => {
    if (!activeMatch || !profile || !judgeType) return;
    
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'scores'), {
        matchId: activeMatch.id,
        judgeId: profile.uid,
        judgeName: profile.displayName,
        judgeType: judgeType,
        gameType: gameType,
        athleteId,
        points,
        timestamp: new Date().toISOString()
      });

      // Discord Log for score
      const athlete = athletes.find(a => a.id === athleteId);
      await sendDiscordMessage(DISCORD_WEBHOOKS.SCORES, `⭐ **Nova Nota Atribuída!**`, [
        {
          title: `Juiz: ${profile.displayName} (${judgeType})`,
          color: gameType === 'angola' ? 0x2ECC71 : 0xF1C40F,
          fields: [
            { name: 'Atleta', value: athlete?.nickname || athlete?.fullName || 'N/A', inline: true },
            { name: 'Jogo', value: gameType.toUpperCase(), inline: true },
            { name: 'Nota', value: points.toString(), inline: true },
          ],
          timestamp: new Date().toISOString(),
        }
      ]);

      setScores(prev => ({ ...prev, [`${athleteId}-${gameType}`]: points }));
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

  if (profile?.role !== 'judge' && profile?.role !== 'admin' && profile?.role !== 'staff' && !hasAccess) {
    return (
      <div className="max-w-md mx-auto py-20">
        <div className="card space-y-6 text-center">
          <ShieldCheck size={48} className="mx-auto text-primary mb-4" />
          <h2 className="text-2xl font-black uppercase tracking-tight">Acesso Restrito</h2>
          <p className="text-zinc-500">Insira o código de acesso para entrar no painel de julgamento.</p>
          <form onSubmit={handleAccess} className="space-y-4">
            <input 
              type="password"
              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 text-center text-xl tracking-widest outline-none focus:ring-2 focus:ring-primary transition-all"
              placeholder="••••••••"
              value={accessCode}
              onChange={e => setAccessCode(e.target.value)}
            />
            <button type="submit" className="w-full btn-primary py-3 font-bold uppercase tracking-widest">
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!judgeType) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-black uppercase tracking-tight">Selecione seu Posto</h1>
          <p className="text-zinc-500">Escolha qual instrumento ou área você irá julgar hoje.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { id: 'viola', label: 'Juiz Viola', icon: Music, desc: 'Julga o atleta do lado da Viola' },
            { id: 'gunga', label: 'Juiz Gunga', icon: Disc, desc: 'Julga o atleta do lado do Gunga' },
            { id: 'jogo', label: 'Juiz do Jogo', icon: Gamepad2, desc: 'Julga ambos os atletas' },
          ].map(type => (
            <button
              key={type.id}
              onClick={() => setJudgeType(type.id as JudgeType)}
              className="card p-6 text-center space-y-4 hover:border-primary transition-all group"
            >
              <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-primary/10 transition-all">
                <type.icon className="text-zinc-400 group-hover:text-primary" size={32} />
              </div>
              <div>
                <p className="font-black uppercase tracking-tight">{type.label}</p>
                <p className="text-[10px] text-zinc-400 uppercase">{type.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
            <ShieldCheck className="text-primary" />
            Painel de Julgamento
          </h1>
          <div className="flex items-center gap-2 text-zinc-500">
            <span className="text-xs font-bold bg-zinc-100 px-2 py-1 rounded uppercase">{judgeType}</span>
            <button onClick={() => setJudgeType(null)} className="text-[10px] underline uppercase">Alterar Posto</button>
          </div>
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
                <ChevronRightIcon size={24} className="text-zinc-300" />
              </button>
            ))
          ) : (
            <div className="card text-center py-12 text-zinc-400">Nenhuma luta ativa nesta categoria.</div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button onClick={() => setActiveMatch(null)} className="text-sm font-bold text-primary flex items-center gap-1">
              <ChevronRightIcon className="rotate-180" size={16} /> Voltar para lista
            </button>

            <div className="flex bg-zinc-100 p-1 rounded-xl">
              <button
                onClick={() => setGameType('angola')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                  gameType === 'angola' ? 'bg-primary text-white shadow-md' : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                São Bento Angola
              </button>
              <button
                onClick={() => setGameType('regional')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                  gameType === 'regional' ? 'bg-secondary text-primary shadow-md' : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                São Bento Regional
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[activeMatch.athlete1Id, activeMatch.athlete2Id].map((athleteId, idx) => {
              const athlete = athletes.find(a => a.id === athleteId);
              if (!athlete) return null;
              
              // Logic: Viola only judges athlete 1, Gunga only judges athlete 2, Jogo judges both
              const canJudge = judgeType === 'jogo' || (judgeType === 'viola' && idx === 0) || (judgeType === 'gunga' && idx === 1);
              
              const athleteScores = liveScores.filter(s => s.athleteId === athleteId && s.gameType === gameType);
              const myScore = athleteScores.find(s => s.judgeId === profile.uid)?.points;

              return (
                <div key={athlete.id} className={`card space-y-6 relative overflow-hidden ${!canJudge ? 'opacity-50 grayscale' : ''}`}>
                  <div className={`absolute top-0 left-0 w-full h-2 ${idx === 0 ? 'bg-primary' : 'bg-secondary'}`}></div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-2xl bg-zinc-100 overflow-hidden border-2 border-zinc-100">
                        <img src={athlete.photoURL || 'https://picsum.photos/seed/athlete/200'} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter">{athlete.nickname || athlete.fullName}</h3>
                        <p className="text-sm text-zinc-500 font-bold uppercase">{athlete.group}</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-zinc-400 uppercase">Lado</p>
                      <p className="text-xl font-black uppercase">{idx === 0 ? 'Viola' : 'Gunga'}</p>
                    </div>
                  </div>

                  {canJudge ? (
                    <div className="space-y-4">
                      <p className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        Nota: <span className={gameType === 'angola' ? 'text-primary' : 'text-secondary'}>{gameType === 'angola' ? 'Angola' : 'Regional'}</span>
                      </p>
                      <div className="grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                          <button
                            key={num}
                            disabled={submitting}
                            onClick={() => handleScore(athlete.id, num)}
                            className={`h-12 rounded-xl font-black transition-all ${
                              myScore === num 
                                ? (gameType === 'angola' ? 'bg-primary text-white scale-110 shadow-lg' : 'bg-secondary text-primary scale-110 shadow-lg')
                                : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-zinc-50 p-6 rounded-xl text-center border border-dashed border-zinc-200">
                      <p className="text-xs font-bold text-zinc-400 uppercase">Este atleta deve ser julgado pelo Juiz {idx === 0 ? 'Viola' : 'Gunga'}</p>
                    </div>
                  )}

                  {/* Live Scores from other judges */}
                  <div className="pt-4 border-t border-zinc-100">
                    <p className="text-[10px] font-black text-zinc-400 uppercase mb-2">Notas {gameType} em Tempo Real</p>
                    <div className="flex flex-wrap gap-2">
                      {['viola', 'gunga', 'jogo'].map(type => {
                        const score = athleteScores.find(s => s.judgeType === type);
                        return (
                          <div key={type} className={`px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 ${score ? (gameType === 'angola' ? 'bg-primary/10 text-primary' : 'bg-secondary/20 text-primary') : 'bg-zinc-100 text-zinc-300'}`}>
                            {type}: {score ? score.points : '--'}
                          </div>
                        );
                      })}
                    </div>
                  </div>
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
