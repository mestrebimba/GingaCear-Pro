import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, limit, where } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, Announcement, EventSettings } from './types';
import { sendDiscordMessage, DISCORD_WEBHOOKS } from './services/discordService';
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
  Users,
  MessageSquare
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ErrorBoundary from './components/ErrorBoundary';
import { handleFirestoreError, OperationType } from './utils/firestoreErrorHandler';

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
import RegulationsPage from './pages/RegulationsPage';
import ChatPage from './pages/ChatPage';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<EventSettings>({
    id: 'main',
    eventName: 'Ceará Ginga Pro',
    eventYear: '2026',
    logoURL: 'https://media.discordapp.net/attachments/1479754145278853266/1481275835238449297/g5qPpAAAABklEQVQDANBOP1sV8bEAAAAAElFTkSuQmCC.png?ex=69b2b91f&is=69b1679f&hm=26a12623e3779638dc2b7e600fd42ed523805302299f629f3a8df276c745459c&=&format=webp&quality=lossless',
    primaryColor: '#1a1a1a',
    secondaryColor: '#fcd116'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as EventSettings;
        setSettings(data);
        
        // Apply dynamic colors
        if (data.primaryColor) {
          document.documentElement.style.setProperty('--color-primary', data.primaryColor);
        }
        if (data.secondaryColor) {
          document.documentElement.style.setProperty('--color-secondary', data.secondaryColor);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/main');
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

          // Discord Log for new account
          await sendDiscordMessage(DISCORD_WEBHOOKS.ACCOUNTS, `🆕 **Nova Conta Criada!**`, [
            {
              title: `Usuário: ${newProfile.displayName}`,
              color: 0x3498DB,
              fields: [
                { name: 'E-mail', value: newProfile.email, inline: true },
                { name: 'Role Inicial', value: newProfile.role, inline: true },
                { name: 'UID', value: newProfile.uid, inline: false },
              ],
              timestamp: new Date().toISOString(),
            }
          ]);
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
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center transition-colors" style={{ backgroundColor: settings.primaryColor, color: settings.secondaryColor }}>
        <div className="animate-pulse text-2xl font-bold">{settings.eventName}...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <Layout user={user} profile={profile} settings={settings}>
          <Routes>
            <Route path="/" element={<HomePage profile={profile} settings={settings} />} />
            <Route path="/registration" element={<RegistrationPage profile={profile} settings={settings} />} />
            <Route path="/brackets" element={<BracketsPage profile={profile} />} />
            <Route path="/judging" element={<JudgingPage profile={profile} />} />
            <Route path="/ranking" element={<RankingPage />} />
            <Route path="/profile" element={<ProfilePage profile={profile} />} />
            <Route path="/regulations" element={<RegulationsPage settings={settings} />} />
            <Route path="/chat" element={<ChatPage profile={profile} />} />
            <Route path="/admin/*" element={<AdminPage profile={profile} settings={settings} />} />
          </Routes>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
}

function NextFightBanner({ profile, settings }: { profile: UserProfile | null, settings: EventSettings }) {
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
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'brackets');
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'athletes');
    });

    return () => unsubscribe();
  }, [profile]);

  if (!nextMatch) return null;

  return (
    <div className="px-4 py-2 text-center font-black uppercase text-xs tracking-widest animate-bounce" style={{ backgroundColor: settings.secondaryColor, color: settings.primaryColor }}>
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
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const location = useLocation();

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
        console.error('Login error:', error);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => signOut(auth);

  const navItems = [
    { label: 'Início', path: '/', icon: Home },
    { label: 'Inscrição', path: '/registration', icon: ClipboardList },
    { label: 'Chaveamento', path: '/brackets', icon: Trophy },
    { label: 'Ranking', path: '/ranking', icon: Star },
    { label: 'Regulamento', path: '/regulations', icon: ClipboardList },
    { label: 'Suporte', path: '/chat', icon: MessageSquare },
    { label: 'Perfil', path: '/profile', icon: UserIcon },
  ];

  if (profile?.role === 'judge' || profile?.role === 'admin' || profile?.role === 'staff') {
    navItems.push({ label: 'Julgamento', path: '/judging', icon: ShieldCheck });
  }

  if (profile?.role === 'admin' || profile?.role === 'staff') {
    navItems.push({ label: 'Admin', path: '/admin', icon: Settings });
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Notification Banner */}
      <NextFightBanner profile={profile} settings={settings} />
      
      {/* Header */}
      <header className="bg-primary text-white sticky top-0 z-50 shadow-md transition-colors" style={{ backgroundColor: settings.primaryColor }}>

        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center overflow-hidden border-2 shadow-lg transition-transform group-hover:scale-105" style={{ borderColor: settings.secondaryColor }}>
              <img 
                src={settings.logoURL} 
                alt={`Logo ${settings.eventName}`} 
                className="w-full h-full object-contain p-1.5" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg leading-none tracking-tighter uppercase italic">{settings.eventName}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] leading-none" style={{ color: settings.secondaryColor }}>Cup {settings.eventYear}</span>
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
                style={{ color: location.pathname === item.path ? settings.secondaryColor : undefined }}
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
              <button 
                onClick={handleLogin} 
                disabled={isLoggingIn}
                className={cn("btn-secondary text-sm", isLoggingIn && "opacity-50 cursor-not-allowed")}
              >
                {isLoggingIn ? 'Entrando...' : 'Entrar'}
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
          <div className="bg-primary w-64 h-full p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()} style={{ backgroundColor: settings.primaryColor }}>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center" style={{ backgroundColor: settings.secondaryColor }}>
                <Trophy className="text-primary" style={{ color: settings.primaryColor }} />
              </div>
              <span className="font-bold text-white">{settings.eventName}</span>
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
                style={location.pathname === item.path ? { backgroundColor: settings.secondaryColor, color: settings.primaryColor } : undefined}
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
      <footer className="bg-accent text-white py-12 mt-auto border-t border-white/10" style={{ backgroundColor: settings.primaryColor }}>
        <div className="max-w-7xl mx-auto px-4 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-white rounded-full p-2 mb-4 border-4 shadow-xl overflow-hidden" style={{ borderColor: settings.secondaryColor }}>
            <img 
              src={settings.logoURL} 
              alt={`Logo ${settings.eventName}`} 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <p className="font-black uppercase tracking-widest mb-2" style={{ color: settings.secondaryColor }}>{settings.eventName} Cup</p>
          <p className="text-xs text-white/50">© {settings.eventYear} - Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  );
}
