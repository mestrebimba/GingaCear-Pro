import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Athlete, Category, Score } from '../types';
import { Star, Trophy, Medal, Users } from 'lucide-react';

export default function RankingPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onSnapshot(collection(db, 'categories'), (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(cats);
      if (cats.length > 0 && !selectedCategory) setSelectedCategory(cats[0].id);
    });

    onSnapshot(collection(db, 'athletes'), (snapshot) => {
      setAthletes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Athlete)));
    });

    onSnapshot(collection(db, 'scores'), (snapshot) => {
      setScores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Score)));
      setLoading(false);
    });
  }, []);

  const getAthleteRanking = () => {
    if (!selectedCategory) return [];

    const catAthletes = athletes.filter(a => a.categoryId === selectedCategory && a.status === 'confirmed');
    
    const ranked = catAthletes.map(athlete => {
      const athleteScores = scores.filter(s => s.athleteId === athlete.id);
      const totalPoints = athleteScores.reduce((acc, curr) => acc + curr.points, 0);
      const avgPoints = athleteScores.length > 0 ? totalPoints / athleteScores.length : 0;
      
      return {
        ...athlete,
        totalPoints,
        avgPoints,
        scoreCount: athleteScores.length
      };
    });

    return ranked.sort((a, b) => b.avgPoints - a.avgPoints);
  };

  const rankedAthletes = getAthleteRanking();

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
            <Star className="text-secondary" />
            Ranking de Atletas
          </h1>
          <p className="text-zinc-500">Os melhores da capoeira cearense.</p>
        </div>

        <div className="flex bg-zinc-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat.id ? 'bg-white shadow-sm text-primary' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 animate-pulse">Carregando ranking...</div>
      ) : rankedAthletes.length > 0 ? (
        <div className="grid gap-4">
          {rankedAthletes.map((athlete, index) => (
            <div key={athlete.id} className="card flex items-center justify-between p-4 sm:p-6 hover:border-primary/30 transition-all">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="flex flex-col items-center justify-center w-8 sm:w-12">
                  {index === 0 ? (
                    <Trophy className="text-secondary" size={24} />
                  ) : index === 1 ? (
                    <Medal className="text-zinc-400" size={24} />
                  ) : index === 2 ? (
                    <Medal className="text-amber-600" size={24} />
                  ) : (
                    <span className="text-xl font-black text-zinc-300">#{index + 1}</span>
                  )}
                </div>
                
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-zinc-100 overflow-hidden border-2 border-zinc-100">
                  <img src={athlete.photoURL || 'https://picsum.photos/seed/athlete/200'} alt="" className="w-full h-full object-cover" />
                </div>

                <div>
                  <h3 className="font-black uppercase tracking-tighter text-lg">{athlete.nickname || athlete.fullName}</h3>
                  <p className="text-xs text-zinc-500 font-bold uppercase">{athlete.group}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[10px] font-black text-zinc-400 uppercase">Média</p>
                <p className="text-2xl sm:text-3xl font-black text-primary">{athlete.avgPoints.toFixed(1)}</p>
                <p className="text-[10px] text-zinc-400 font-bold uppercase">{athlete.scoreCount} avaliações</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-20">
          <Users size={48} className="mx-auto text-zinc-200 mb-4" />
          <h2 className="text-xl font-bold text-zinc-400">Nenhum atleta ranqueado nesta categoria.</h2>
          <p className="text-zinc-400 text-sm">As notas aparecerão assim que o campeonato começar.</p>
        </div>
      )}
    </div>
  );
}
