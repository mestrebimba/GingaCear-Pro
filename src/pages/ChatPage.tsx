import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { MessageSquare, Send, User, Shield, Bot, ChevronLeft, Search } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: any;
  isAI: boolean;
}

interface Chat {
  id: string;
  userId: string;
  userName: string;
  lastMessage: string;
  timestamp: any;
  status: 'open' | 'closed';
  unreadCount: number;
}

export default function ChatPage({ profile }: { profile: UserProfile | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAITyping, setIsAITyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isStaff = profile?.role === 'admin' || profile?.role === 'staff';

  useEffect(() => {
    if (!profile) return;

    let unsubscribe: () => void;

    if (isStaff) {
      // Staff sees all active chats
      const q = query(collection(db, 'chats'), orderBy('timestamp', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        setChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat)));
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'chats');
      });
    } else {
      // User sees only their chat
      const q = query(collection(db, 'chats'), where('userId', '==', profile.uid));
      unsubscribe = onSnapshot(q, async (snapshot) => {
        if (snapshot.empty) {
          // Create initial chat for user
          const newChatRef = await addDoc(collection(db, 'chats'), {
            userId: profile.uid,
            userName: profile.displayName,
            lastMessage: 'Chat iniciado',
            timestamp: serverTimestamp(),
            status: 'open',
            unreadCount: 0
          });
          setActiveChatId(newChatRef.id);
        } else {
          const userChat = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Chat;
          setChats([userChat]);
          setActiveChatId(userChat.id);
        }
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'chats');
      });
    }

    return () => unsubscribe && unsubscribe();
  }, [profile, isStaff]);

  useEffect(() => {
    if (!activeChatId) return;

    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', activeChatId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
      scrollToBottom();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    });

    return () => unsubscribe();
  }, [activeChatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !profile || !activeChatId) return;

    const text = inputText;
    setInputText('');

    try {
      await addDoc(collection(db, 'messages'), {
        chatId: activeChatId,
        senderId: profile.uid,
        senderName: profile.displayName,
        text,
        timestamp: serverTimestamp(),
        isAI: false
      });

      await updateDoc(doc(db, 'chats', activeChatId), {
        lastMessage: text,
        timestamp: serverTimestamp()
      });

      // AI Response for non-staff users
      if (!isStaff) {
        handleAIResponse(text);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleAIResponse = async (userText: string) => {
    setIsAITyping(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Você é um assistente de suporte para o evento "Ceará Ginga Pro 2026", um campeonato de capoeira. 
        Ajude o usuário com dúvidas sobre inscrição, regulamento, categorias e cronograma. 
        Seja cordial e use termos da capoeira. Se não souber a resposta, diga que um membro da Staff responderá em breve.
        
        Pergunta do usuário: ${userText}`,
      });

      if (response.text) {
        await addDoc(collection(db, 'messages'), {
          chatId: activeChatId!,
          senderId: 'ai-bot',
          senderName: 'Mestre IA',
          text: response.text,
          timestamp: serverTimestamp(),
          isAI: true
        });
      }
    } catch (error) {
      console.error('AI Error:', error);
    } finally {
      setIsAITyping(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col md:flex-row gap-6">
      {/* Sidebar for Staff */}
      {isStaff && (
        <div className="w-full md:w-80 flex flex-col gap-4">
          <div className="card p-4 flex flex-col h-full">
            <h2 className="font-black uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
              <MessageSquare size={18} className="text-primary" /> Atendimentos
            </h2>
            <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
              {chats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    activeChatId === chat.id ? 'bg-primary text-white shadow-lg' : 'bg-zinc-50 hover:bg-zinc-100'
                  }`}
                >
                  <p className="font-bold text-sm truncate">{chat.userName}</p>
                  <p className={`text-[10px] truncate ${activeChatId === chat.id ? 'text-white/70' : 'text-zinc-400'}`}>
                    {chat.lastMessage}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 card p-0 flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white shadow-md">
              {isStaff ? <User size={20} /> : <Bot size={20} />}
            </div>
            <div>
              <h3 className="font-bold text-sm">
                {isStaff 
                  ? chats.find(c => c.id === activeChatId)?.userName || 'Selecione um chat'
                  : 'Suporte Ceará Ginga Pro'}
              </h3>
              <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest">
                {isStaff ? 'Usuário em Atendimento' : 'Mestre IA & Staff Online'}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {messages.map((msg, idx) => {
            const isMe = msg.senderId === profile.uid;
            return (
              <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${
                  isMe 
                    ? 'bg-primary text-white rounded-tr-none' 
                    : msg.isAI 
                      ? 'bg-secondary/20 text-primary border border-secondary/30 rounded-tl-none'
                      : 'bg-zinc-100 text-zinc-800 rounded-tl-none'
                }`}>
                  {!isMe && <p className="text-[8px] font-black uppercase mb-1 opacity-50">{msg.senderName}</p>}
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  <p className={`text-[8px] mt-1 text-right opacity-50`}>
                    {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                  </p>
                </div>
              </div>
            );
          })}
          {isAITyping && (
            <div className="flex justify-start">
              <div className="bg-zinc-100 rounded-2xl px-4 py-2 rounded-tl-none animate-pulse">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-4 bg-zinc-50 border-t border-zinc-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Digite sua dúvida aqui..."
              className="flex-1 bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
            />
            <button 
              type="submit"
              disabled={!inputText.trim() || !activeChatId}
              className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
