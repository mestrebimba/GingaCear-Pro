import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, limit, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Announcement, UserProfile, LiveStream, EventSettings } from '../types';
import { Bell, Play, Trophy, Users, Calendar, Video } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getYouTubeEmbedUrl } from '../utils/youtube';

export default function HomePage({ profile, settings }: { profile: UserProfile | null, settings: EventSettings }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('date', 'desc'), limit(5));
    const unsubscribeAnn = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
      setAnnouncements(data);
    });

    const unsubscribeStream = onSnapshot(doc(db, 'live_streams', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        setStream({ id: docSnap.id, ...docSnap.data() } as LiveStream);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAnn();
      unsubscribeStream();
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Live Stream Section */}
      {stream?.isActive && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Video className="text-red-600 animate-pulse" />
              Ao Vivo Agora
            </h2>
            <span className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded uppercase animate-pulse">Live</span>
          </div>
          <div className="card p-0 overflow-hidden bg-black aspect-video relative group">
            <iframe 
              src={getYouTubeEmbedUrl(stream.url)}
              title={stream.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
            <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white font-bold">{stream.title}</p>
            </div>
          </div>
        </section>
      )}

      {/* Hero Section */}
      <section className="relative h-64 sm:h-96 rounded-3xl overflow-hidden bg-accent flex items-center justify-center text-center p-6">
        <div className="absolute inset-0 opacity-40">
          <img 
            src="https://media.discordapp.net/attachments/1479754145278853266/1481280571933069432/Untitled_design.png?ex=69b2bd89&is=69b16c09&hm=b3a2d75bece25a0106fbcd01272494cc23f0302c3bf5b5ef97ba2cf227eb9ec9&=&format=webp&quality=lossless&width=550&height=309" 
            alt="Capoeira" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-accent via-transparent to-transparent"></div>
        </div>
        
        <div className="relative z-10 max-w-2xl flex flex-col items-center">
          <div className="w-40 h-40 bg-white rounded-full p-2 mb-6 shadow-2xl border-4 border-secondary overflow-hidden flex items-center justify-center">
            <img 
              src={settings.logoURL} 
              alt={`Logo ${settings.eventName}`} 
              className="w-full h-full object-contain p-2"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-secondary mb-4 uppercase tracking-tighter drop-shadow-lg">
            {settings.eventName}
          </h1>
          <p className="text-lg sm:text-xl text-white font-medium mb-8">
            O maior sistema de competição da capoeira cearense em {settings.eventYear}. Agora a ginga vira pontuação.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/registration" className="btn-secondary flex items-center gap-2">
              Inscreva-se Agora
            </Link>
            <Link to="/regulations" className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-6 py-2 rounded-lg font-medium hover:bg-white/20 transition-all">
              Ver Regulamento
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Announcements */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="text-primary" />
              Avisos Oficiais
            </h2>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-zinc-100 animate-pulse rounded-xl"></div>
              ))}
            </div>
          ) : announcements.length > 0 ? (
            <div className="space-y-4">
              {announcements.map((ann) => (
                <div key={ann.id} className="card hover:border-primary/30 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg">{ann.title}</h3>
                    <span className="text-xs font-medium text-zinc-400 bg-zinc-100 px-2 py-1 rounded">
                      {format(new Date(ann.date), "dd 'de' MMMM", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-zinc-600 leading-relaxed">{ann.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12 text-zinc-400">
              Nenhum aviso publicado ainda.
            </div>
          )}
        </div>

        {/* Stats / Quick Info */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="text-secondary" />
            Informações
          </h2>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="card flex items-center gap-4 p-4">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                <Users size={24} />
              </div>
              <div>
                <p className="text-xs text-zinc-500 font-bold uppercase">Atletas Inscritos</p>
                <p className="text-xl font-black">128</p>
              </div>
            </div>

            <div className="card flex items-center gap-4 p-4">
              <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-full flex items-center justify-center">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-xs text-zinc-500 font-bold uppercase">Data do Evento</p>
                <p className="text-xl font-black">15 Out 2026</p>
              </div>
            </div>

            <div className="card p-6 bg-primary text-white">
              <h3 className="font-bold mb-2">Inscrições Abertas!</h3>
              <p className="text-sm text-white/80 mb-4">Garanta sua vaga no maior campeonato de capoeira do Ceará.</p>
              <button className="w-full btn-secondary text-primary">Inscrever-se Agora</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
