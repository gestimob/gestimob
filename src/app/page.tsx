"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Crown,
  MousePointer2,
  Building2,
  Loader2,
  X,
  Mail,
  Lock,
  UserPlus,
  User
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LandingPage() {
  const [logoUrl, setLogoUrl] = useState<string | null>("https://jkgkwzyxtmqmhaypobba.supabase.co/storage/v1/object/public/configuracoes/logo_rr_sombra.png");
  const [bgDesktop, setBgDesktop] = useState('https://jkgkwzyxtmqmhaypobba.supabase.co/storage/v1/object/public/configuracoes/fundo_desktop_rr.jpeg');
  const [bgMobile, setBgMobile] = useState('https://jkgkwzyxtmqmhaypobba.supabase.co/storage/v1/object/public/configuracoes/fundo_mobile_rr.jpeg');
  const [loading, setLoading] = useState(true);

  // Easter Egg States
  const [clickCount, setClickCount] = useState(0);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [usageCount, setUsageCount] = useState(0);

  useEffect(() => {
    async function fetchHeroSettings() {
      try {
        const { data } = await supabase
          .from('configuracoes')
          .select('hero_bg_desktop_url, hero_bg_mobile_url')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data) {
          if (data.hero_bg_desktop_url) setBgDesktop(data.hero_bg_desktop_url);
          if (data.hero_bg_mobile_url) setBgMobile(data.hero_bg_mobile_url);
        }
      } catch (err) {
        console.error('Erro ao buscar configurações da hero:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHeroSettings();

    // Load usage count from localStorage
    const count = localStorage.getItem('gestimob_ee_usage');
    if (count) setUsageCount(parseInt(count));
  }, []);

  const handleLogoClick = () => {
    if (usageCount >= 3) return;

    const nextCount = clickCount + 1;
    setClickCount(nextCount);

    if (nextCount === 5) {
      setShowEasterEgg(true);
      setClickCount(0);
    }

    // Reset counter if no clicks for 5 seconds
    setTimeout(() => {
      setClickCount(0);
    }, 5000);
  };

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#0B0B0C] text-foreground font-sans">
      {/* Cinematic Hero Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Desktop Background */}
        <motion.div
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{ duration: 10, ease: "easeOut" }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat hidden md:block"
          style={{ backgroundImage: `url('${bgDesktop}')` }}
        />
        {/* Mobile Background */}
        <motion.div
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{ duration: 10, ease: "easeOut" }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat block md:hidden"
          style={{ backgroundImage: `url('${bgMobile}')` }}
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Floating Elements for Atmosphere */}
      <div className="absolute top-[20%] right-[-5%] w-[600px] h-[600px] bg-blue-600/5 blur-[150px] rounded-full" />
      <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] bg-indigo-600/5 blur-[120px] rounded-full" />

      {/* Hero Content - Central Glassmorphism Container */}
      <section className="relative z-10 px-8 min-h-screen flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-white/[0.03] backdrop-blur-[30px] p-12 md:p-16 rounded-[40px] border border-white/10 max-w-2xl w-full flex flex-col items-center gap-10 shadow-3xl relative overflow-hidden group"
        >
          {/* Subtle logo background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 blur-[120px] rounded-full group-hover:bg-white/10 transition-colors pointer-events-none" />

          {loading ? (
            <Loader2 className="w-10 h-10 text-white/20 animate-spin" />
          ) : (
            logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                onClick={handleLogoClick}
                className="h-16 md:h-24 w-auto object-contain transition-all duration-700 transform group-hover:scale-110 drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] group-hover:drop-shadow-[0_0_50px_rgba(255,255,255,0.4)] cursor-pointer"
                title="RR Imobiliária"
              />
            ) : (
              <div className="h-20 w-20 glass rounded-[24px] flex items-center justify-center glow-border cursor-pointer" onClick={handleLogoClick}>
                <Building2 className="w-10 h-10 text-white/40" />
              </div>
            )
          )}

          <div className="space-y-6 relative">
            <h1 className="text-3xl md:text-5xl font-serif-premium text-white leading-tight tracking-tight drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
              Mais que imóveis. <br />
              <span className="text-xl md:text-3xl bg-gradient-to-r from-white via-white/80 to-white/40 bg-clip-text text-transparent italic font-light">
                Entregamos decisões seguras.
              </span>
            </h1>
          </div>

          <Link
            href="/login"
            className="group relative bg-white text-black px-9 py-3.5 rounded-xl font-black text-[10px] md:text-[11px] transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-[0.4em] flex items-center gap-4 shadow-[0_15px_30px_rgba(0,0,0,0.4),0_0_25px_rgba(255,255,255,0.4)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.5),0_0_40px_rgba(255,255,255,0.6)] hover:bg-white transition-all duration-300 ring-offset-2 ring-white/10 focus:ring-2"
          >
            Acessar Sistema
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-500 ease-in-out" />
          </Link>
        </motion.div>
      </section>

      {/* Easter Egg Modal */}
      <AnimatePresence>
        {showEasterEgg && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEasterEgg(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#1A1A1B] border border-white/10 p-8 rounded-[32px] w-full max-w-md relative z-10 shadow-2xl"
            >
              <button
                onClick={() => setShowEasterEgg(false)}
                className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-serif-premium text-white italic">Novo Acesso</h2>
                <p className="text-[10px] uppercase font-black tracking-widest text-white/40">
                  Uso restante: {3 - usageCount}
                </p>
              </div>

              <RegisterForm
                onSuccess={() => {
                  const nextUsage = usageCount + 1;
                  setUsageCount(nextUsage);
                  localStorage.setItem('gestimob_ee_usage', nextUsage.toString());
                  setShowEasterEgg(false);
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'operador',
            nome: nome
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        alert("Usuário registrado com sucesso!");
        onSuccess();
      }
    } catch (err: any) {
      console.error("Erro completo no registro:", err);
      const detail = err.message || "Erro de conexão (Failed to fetch)";
      setError(`Erro: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-black tracking-widest text-white/40 ml-1">Nome Completo</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-sm text-white focus:outline-none focus:border-white/20 transition-all font-medium"
              placeholder="Seu nome"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase font-black tracking-widest text-white/40 ml-1">E-mail</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-sm text-white focus:outline-none focus:border-white/20 transition-all font-medium"
              placeholder="exemplo@email.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase font-black tracking-widest text-white/40 ml-1">Senha</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-sm text-white focus:outline-none focus:border-white/20 transition-all font-medium"
              placeholder="••••••••"
            />
          </div>
        </div>
      </div>

      {error && <p className="text-rose-500 text-[10px] font-black uppercase text-center">{error}</p>}

      <button
        disabled={loading}
        className="w-full h-12 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Operador"}
      </button>
    </form>
  );
}
