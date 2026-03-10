"use client";

import { X, Loader2, User, Mail, Lock, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function RegistroAdminModal({ isOpen, onClose, onSuccess }: ModalProps) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        nome: "",
        email: "",
        senha: "",
        confirmarSenha: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.senha !== formData.confirmarSenha) {
            alert("As senhas não coincidem!");
            return;
        }

        setLoading(true);

        const { error } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.senha,
            options: {
                data: {
                    nome: formData.nome,
                    role: 'admin'
                }
            }
        });

        if (error) {
            alert("Erro ao cadastrar admin: " + error.message);
        } else {
            setSuccess(true);
            onSuccess?.();
            setTimeout(() => {
                onClose();
                window.location.href = "/dashboard";
            }, 2000);
        }
        setLoading(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-[#1A1A1B] border border-white/10 p-8 rounded-[32px] w-full max-w-lg relative z-10 shadow-2xl"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex flex-col items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                                <ShieldCheck className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-xl font-serif-premium text-white italic">Acesso Master</h2>
                        </div>

                        {success ? (
                            <div className="p-12 text-center space-y-4">
                                <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto">
                                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                                </div>
                                <h3 className="text-white font-bold text-xl italic">Acesso Criado!</h3>
                                <p className="text-white/40 text-sm">Pronto para assumir o controle.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-white/40 ml-1">Nome Completo</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                        <input
                                            required
                                            value={formData.nome}
                                            onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                            className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-sm text-white focus:outline-none focus:border-white/20 transition-all"
                                            placeholder="Seu nome"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-white/40 ml-1">E-mail</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                        <input
                                            required
                                            type="email"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-sm text-white focus:outline-none focus:border-white/20 transition-all"
                                            placeholder="admin@imobiliaria.com"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-white/40 ml-1">Senha</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                            <input
                                                required
                                                type="password"
                                                value={formData.senha}
                                                onChange={e => setFormData({ ...formData, senha: e.target.value })}
                                                className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-sm text-white focus:outline-none focus:border-white/20 transition-all"
                                                placeholder="••••••"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-white/40 ml-1">Confirmar</label>
                                        <input
                                            required
                                            type="password"
                                            value={formData.confirmarSenha}
                                            onChange={e => setFormData({ ...formData, confirmarSenha: e.target.value })}
                                            className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-5 text-sm text-white focus:outline-none focus:border-white/20 transition-all"
                                            placeholder="••••••"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-12 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 mt-4"
                                >
                                    {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Ativar Credenciais Máster"}
                                </button>
                            </form>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
