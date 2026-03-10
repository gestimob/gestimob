"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, Loader2 } from "lucide-react";
import { RegistroAdminModal } from "@/components/RegistroAdminModal";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [clickCount, setClickCount] = useState(0);
    const [showEasterEgg, setShowEasterEgg] = useState(false);
    const [email, setEmail] = useState("");
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const passwordRef = useRef<HTMLInputElement>(null);

    const handleLogoClick = () => {
        setClickCount((prev) => {
            const next = prev + 1;
            if (next === 5) {
                setShowEasterEgg(true);
                return 0;
            }
            return next;
        });
    };

    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase
                .from('configuracoes')
                .select('logo_url')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (data?.logo_url) {
                setLogoUrl(data.logo_url);
            }
        };
        fetchSettings();

        if (clickCount > 0) {
            const timer = setTimeout(() => {
                setClickCount(0);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [clickCount]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const passwordValue = passwordRef.current?.value || "";

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password: passwordValue
        });

        if (error) {
            alert("Erro ao fazer login: " + error.message);
            setLoading(false);
            return;
        }

        window.location.href = "/dashboard";
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 relative bg-background text-foreground font-sans">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md z-10"
            >
                <div className="bg-panel dark:glass p-10 rounded-[32px] border border-panel-border relative overflow-hidden shadow-2xl">
                    {/* Logo with Easter Egg */}
                    <div className="flex flex-col items-center mb-10 select-none">
                        <div
                            onClick={handleLogoClick}
                            className="cursor-pointer transition-transform active:scale-95 mb-6"
                        >
                            {logoUrl ? (
                                <img src={logoUrl} alt="Logo" className="h-16 w-auto object-contain mx-auto" />
                            ) : (
                                <div className="text-2xl font-extrabold text-foreground tracking-tighter uppercase italic">
                                    RR Imobiliária <span className="text-primary italic">Ltda.</span>
                                </div>
                            )}
                        </div>
                        <p className="text-accent text-sm font-medium">Acesse sua conta para continuar</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-accent ml-1 uppercase tracking-widest text-[10px]">E-mail</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent group-focus-within:text-foreground transition-colors pointer-events-none" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="exemplo@email.com"
                                    className="w-full bg-black/5 dark:bg-white/5 border border-panel-border rounded-[12px] py-4 pl-12 pr-5 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-panel-border focus:border-accent transition-all placeholder:text-accent/50"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 relative z-20">
                            <label htmlFor="password-input" className="text-sm font-bold text-accent ml-1 uppercase tracking-widest text-[10px]">Senha</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent group-focus-within:text-foreground transition-colors pointer-events-none" />
                                <input
                                    id="password-input"
                                    ref={passwordRef}
                                    type="password"
                                    name="password"
                                    required
                                    autoComplete="current-password"
                                    placeholder="Digite sua senha"
                                    className="w-full bg-black/5 dark:bg-white/5 border border-panel-border rounded-[12px] py-4 pl-12 pr-5 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-panel-border focus:border-accent transition-all placeholder:text-accent/50"
                                />
                            </div>
                        </div>



                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            disabled={loading}
                            className="btn-elite w-full py-4 transition-all shadow-xl flex items-center justify-center gap-2 text-base"
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin text-[#0B0B0C]" />
                            ) : (
                                "Entrar no Sistema"
                            )}
                        </motion.button>
                    </form>


                </div>
            </motion.div>

            <RegistroAdminModal
                isOpen={showEasterEgg}
                onClose={() => setShowEasterEgg(false)}
            />

            {/* Decorative Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full -z-0 pointer-events-none" />
        </div>
    );
}
