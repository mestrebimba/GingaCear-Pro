import React from 'react';
import { EventSettings } from '../types';
import { ClipboardList, ShieldCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function RegulationsPage({ settings }: { settings: EventSettings }) {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
          <ClipboardList className="text-primary" />
          Regulamento Oficial
        </h1>
        <p className="text-zinc-500">Confira as regras e diretrizes do {settings.eventName} {settings.eventYear}.</p>
      </div>

      <div className="card p-8 sm:p-12 prose prose-zinc max-w-none">
        {settings.regulations ? (
          <div className="markdown-body">
            <ReactMarkdown>{settings.regulations}</ReactMarkdown>
          </div>
        ) : (
          <div className="text-center py-20 text-zinc-400">
            <ShieldCheck size={48} className="mx-auto mb-4 opacity-20" />
            <p>O regulamento ainda não foi publicado pela organização.</p>
          </div>
        )}
      </div>

      <div className="card bg-primary text-white p-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-white/50 uppercase">Dúvidas?</p>
          <p className="text-lg font-bold">Entre em contato com a organização</p>
        </div>
        <button className="btn-secondary text-primary">Suporte</button>
      </div>
    </div>
  );
}
