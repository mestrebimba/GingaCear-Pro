import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, limit, where } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, Announcement, EventSettings } from './types';
import { 
  Home, 
  User as UserIcon, 
  Trophy, 
  ClipboardList, 
  Settings, 
  Bell, 
  LogOut, 
  Menu, 
  X,
  ShieldCheck,
  Star,
  Users
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Pages (to be implemented in separate files or defined here for simplicity)
import HomePage from './pages/HomePage';
import RegistrationPage from './pages/RegistrationPage';
import AdminPage from './pages/AdminPage';
import BracketsPage from './pages/BracketsPage';
import JudgingPage from './pages/JudgingPage';
import RankingPage from './pages/RankingPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<EventSettings>({
    id: 'main',
    eventName: 'Ceará Ginga Pro',
    eventYear: '2026',
    logoURL: 'https://media.discordapp.net/attachments/1479754145278853266/1480864000416682094/vLAAAABklEQVQDAIzsw0f7r3xAAAAAElFTkSuQmCC.png?ex=69b13992&is=69afe812&hm=a570cfcde977d7be74aada1c9665b4306e2be69d7e0a591e0bff48356586ae75&=&format=webp&quality=lossless'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as EventSettings);
      }
    });

    return () => unsubscribeSettings();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const existingProfile = docSnap.data() as UserProfile;
          // Force admin role for specific users even if profile exists
          if ((firebaseUser.email === 'nobrufortal@gmail.com' || firebaseUser.displayName === 'vareta Bdc') && existingProfile.role !== 'admin') {
            const updatedProfile = { ...existingProfile, role: 'admin' as const };
            await setDoc(docRef, updatedProfile, { merge: true });
            setProfile(updatedProfile);
          } else {
            setProfile(existingProfile);
          }
        } else {
          // Create default profile for new users
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'Atleta',
            role: (firebaseUser.email === 'nobrufortal@gmail.com' || firebaseUser.displayName === 'vareta Bdc') ? 'admin' : 'athlete',
            photoURL: firebaseUser.photoURL || undefined
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Notification Listener
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('uid', '==', user.uid),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notification = change.doc.data() as any;
          // Show browser notification if permitted
          if (Notification.permission === 'granted') {
            new window.Notification(notification.title, {
              body: notification.message,
              icon: '/favicon.ico'
            });
          }
        }
      });
    });

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary text-secondary">
        <div className="animate-pulse text-2xl font-bold">{settings.eventName}...</div>
      </div>
    );
  }

  return (
    <Router>
      <Layout user={user} profile={profile} settings={settings}>
        <Routes>
          <Route path="/" element={<HomePage profile={profile} settings={settings} />} />
          <Route path="/registration" element={<RegistrationPage profile={profile} settings={settings} />} />
          <Route path="/brackets" element={<BracketsPage profile={profile} />} />
          <Route path="/judging" element={<JudgingPage profile={profile} />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/profile" element={<ProfilePage profile={profile} />} />
          <Route path="/admin/*" element={<AdminPage profile={profile} settings={settings} />} />
        </Routes>
      </Layout>
    </Router>
  );
}

function NextFightBanner({ profile }: { profile: UserProfile | null }) {
  const [nextMatch, setNextMatch] = useState<any>(null);

  useEffect(() => {
    if (!profile) return;

    // Find if user is an athlete and has an active match
    const q = query(collection(db, 'athletes'), where('uid', '==', profile.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const athleteId = snapshot.docs[0].id;
        const qBrackets = query(collection(db, 'brackets'));
        onSnapshot(qBrackets, (bracketSnap) => {
          let foundMatch = null;
          bracketSnap.docs.forEach(doc => {
            const data = doc.data();
            const match = data.matches?.find((m: any) => 
              (m.athlete1Id === athleteId || m.athlete2Id === athleteId) && 
              m.status === 'active'
            );
            if (match) foundMatch = { ...match, categoryName: data.categoryId };
          });
          setNextMatch(foundMatch);
        });
      }
    });

    return () => unsubscribe();
  }, [profile]);

  if (!nextMatch) return null;

  return (
    <div className="bg-secondary text-primary px-4 py-2 text-center font-black uppercase text-xs tracking-widest animate-bounce">
      <Link to="/brackets" className="flex items-center justify-center gap-2">
        <Trophy size={14} />
        Sua luta vai começar! Prepare-se para entrar na roda.
        <Trophy size={14} />
      </Link>
    </div>
  );
}

function Layout({ children, user, profile, settings }: { children: React.ReactNode, user: User | null, profile: UserProfile | null, settings: EventSettings }) {

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = () => signOut(auth);

  const navItems = [
    { label: 'Início', path: '/', icon: Home },
    { label: 'Inscrição', path: '/registration', icon: ClipboardList },
    { label: 'Chaveamento', path: '/brackets', icon: Trophy },
    { label: 'Ranking', path: '/ranking', icon: Star },
    { label: 'Perfil', path: '/profile', icon: UserIcon },
  ];

  if (profile?.role === 'judge' || profile?.role === 'admin') {
    navItems.push({ label: 'Julgamento', path: '/judging', icon: ShieldCheck });
  }

  if (profile?.role === 'admin') {
    navItems.push({ label: 'Admin', path: '/admin', icon: Settings });
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Notification Banner */}
      <NextFightBanner profile={profile} />
      
      {/* Header */}
      <header className="bg-primary text-white sticky top-0 z-50 shadow-md">

        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center overflow-hidden border-2 border-secondary shadow-lg transition-transform group-hover:scale-105">
              <img 
                src={settings.logoURL} 
                alt={`Logo ${settings.eventName}`} 
                className="w-full h-full object-contain p-1.5" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg leading-none tracking-tighter uppercase italic">{settings.eventName}</span>
              <span className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] leading-none">Cup {settings.eventYear}</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link 
                key={item.path} 
                to={item.path}
                className={cn(
                  "flex items-center gap-1 text-sm font-medium transition-colors hover:text-secondary",
                  location.pathname === item.path ? "text-secondary" : "text-white/80"
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-secondary uppercase leading-none mb-1">{profile?.role}</p>
                  <p className="text-sm font-medium leading-none">{user.displayName}</p>
                </div>
                <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button onClick={handleLogin} className="btn-secondary text-sm">
                Entrar
              </button>
            )}
            <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}>
          <div className="bg-primary w-64 h-full p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                <Trophy className="text-primary" />
              </div>
              <span className="font-bold text-white">Ginga Pro</span>
            </div>
            {navItems.map((item) => (
              <Link 
                key={item.path} 
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg font-medium transition-colors",
                  location.pathname === item.path ? "bg-secondary text-primary" : "text-white hover:bg-white/10"
                )}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-accent text-white py-12 mt-auto border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-white rounded-full p-2 mb-4 border-4 border-secondary shadow-xl overflow-hidden">
            <img 
              src={settings.logoURL} 
              alt={`Logo ${settings.eventName}`} 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <p className="text-secondary font-black uppercase tracking-widest mb-2">{settings.eventName} Cup</p>
          <p className="text-xs text-white/50">© {settings.eventYear} - Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  );
}
