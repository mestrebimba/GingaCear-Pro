import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Category, Athlete, Bracket, Match, UserProfile } from '../types';
import { Trophy, ChevronRight, Users } from 'lucide-react';

export default function BracketsPage({ profile }: { profile: UserProfile | null }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [brackets, setBrackets] = useState<Record<string, Bracket>>({});
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

    onSnapshot(collection(db, 'brackets'), (snapshot) => {
      const data: Record<string, Bracket> = {};
      snapshot.docs.forEach(doc => {
        data[doc.id] = { id: doc.id, ...doc.data() } as Bracket;
      });
      setBrackets(data);
      setLoading(false);
    });
  }, []);

  const currentBracket = selectedCategory ? brackets[selectedCategory] : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
            <Trophy className="text-secondary" />
            Chaveamento
          </h1>
          <p className="text-zinc-500">Acompanhe as lutas e o progresso do campeonato.</p>
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
        <div className="text-center py-20 animate-pulse">Carregando chaves...</div>
      ) : currentBracket ? (
        <div className="space-y-12 overflow-x-auto pb-8">
          <div className="min-w-[800px] flex gap-12">
            {/* Round 1 */}
            <div className="flex-1 space-y-8">
              <h3 className="text-center font-black uppercase text-zinc-400 text-xs tracking-widest">Primeira Fase</h3>
              <div className="space-y-6">
                {currentBracket.matches.filter(m => m.round === 1).map(match => (
                  <MatchCard key={match.id} match={match} athletes={athletes} />
                ))}
              </div>
            </div>

            {/* Round 2 (Semi-final) */}
            <div className="flex-1 space-y-8 pt-12">
              <h3 className="text-center font-black uppercase text-zinc-400 text-xs tracking-widest">Semi-Final</h3>
              <div className="space-y-24">
                <PlaceholderMatch />
                <PlaceholderMatch />
              </div>
            </div>

            {/* Final */}
            <div className="flex-1 space-y-8 pt-24">
              <h3 className="text-center font-black uppercase text-primary text-xs tracking-widest">Grande Final</h3>
              <div className="space-y-48">
                <div className="card border-2 border-primary bg-primary/5 p-6 text-center relative">
                  <Trophy className="mx-auto text-secondary mb-2" size={32} />
                  <p className="font-black text-primary uppercase">Campeão</p>
                  <div className="mt-4 h-12 bg-white rounded-lg border border-primary/20 flex items-center justify-center text-zinc-300 italic text-sm">
                    Aguardando...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card text-center py-20">
          <Users size={48} className="mx-auto text-zinc-200 mb-4" />
          <h2 className="text-xl font-bold text-zinc-400">Chaveamento ainda não gerado para esta categoria.</h2>
          <p className="text-zinc-400 text-sm">Aguarde o início do campeonato.</p>
        </div>
      )}
    </div>
  );
}

function MatchCard({ match, athletes }: { key?: string, match: Match, athletes: Athlete[] }) {
  const athlete1 = athletes.find(a => a.id === match.athlete1Id);
  const athlete2 = athletes.find(a => a.id === match.athlete2Id);

  return (
    <div className="card p-0 overflow-hidden border-l-4 border-l-primary shadow-md hover:shadow-lg transition-shadow">
      <div className="p-4 space-y-3">
        {/* Athlete 1 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-100 overflow-hidden border border-zinc-200">
              <img src={athlete1?.photoURL || 'https://picsum.photos/seed/athlete1/100'} alt="" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-bold text-sm">{athlete1?.nickname || athlete1?.fullName || 'TBD'}</p>
              <p className="text-[10px] text-zinc-400 uppercase font-bold">{athlete1?.group || '-'}</p>
            </div>
          </div>
          <div className="w-6 h-6 bg-zinc-50 rounded flex items-center justify-center text-xs font-bold text-zinc-400">
            0
          </div>
        </div>

        <div className="h-px bg-zinc-100"></div>

        {/* Athlete 2 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-100 overflow-hidden border border-zinc-200">
              <img src={athlete2?.photoURL || 'https://picsum.photos/seed/athlete2/100'} alt="" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-bold text-sm">{athlete2?.nickname || athlete2?.fullName || 'TBD'}</p>
              <p className="text-[10px] text-zinc-400 uppercase font-bold">{athlete2?.group || '-'}</p>
            </div>
          </div>
          <div className="w-6 h-6 bg-zinc-50 rounded flex items-center justify-center text-xs font-bold text-zinc-400">
            0
          </div>
        </div>
      </div>
      <div className="bg-zinc-50 px-4 py-1 text-[10px] font-bold text-zinc-400 uppercase flex justify-between">
        <span>Luta #{match.position + 1}</span>
        <span>{match.status}</span>
      </div>
    </div>
  );
}

function PlaceholderMatch() {
  return (
    <div className="card p-4 opacity-40 border-dashed border-2">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-200"></div>
          <div className="h-3 w-24 bg-zinc-200 rounded"></div>
        </div>
        <div className="h-px bg-zinc-100"></div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-200"></div>
          <div className="h-3 w-24 bg-zinc-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}
