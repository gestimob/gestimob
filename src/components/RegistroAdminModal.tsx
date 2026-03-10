"use client";

import { X, Loader2, User, Mail, Lock, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function RegistroAdminModal({ isOpen, onClose }: ModalProps) {
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

        // Supabase Auth Signup
        const { data, error } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.senha,
            options: {
                data: {
                    nome_completo: formData.nome,
                    role: 'admin'
                }
            }
        });

        if (error) {
            alert("Erro ao cadastrar admin: " + error.message);
        } else {
            setSuccess(true);
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
                        className="absolute inset-0 bg-background/90 backdrop-blur-xl"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, rotateX: 20 }}
                        animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="bg-panel dark:glass w-full max-w-lg rounded-[40px] overflow-hidden relative z-10 border border-panel-border shadow-2xl"
                    >
                        <div className="p-8 border-b border-panel-border text-center relative bg-panel/30 dark:bg-white/5 backdrop-blur-md">
                            <div className="absolute top-4 right-4 text-xs text-white bg-white/10 px-2 py-1 rounded border border-white/20">
                                MODO DE SEGURANÇA: ATIVADO
                            </div>
                            <ShieldCheck className="w-12 h-12 text-white mx-auto mb-4" />
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Primeiro Administrador</h2>
                            <p className="text-gray-400 text-sm">Configure o acesso mestre ao sistema.</p>
                        </div>

                        {success ? (
                            <div className="p-12 text-center space-y-4">
                                <div className="w-20 h-20 bg-white/20 border border-white/40 rounded-full flex items-center justify-center mx-auto">
                                    <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                                </div>
                                <h3 className="text-blue-400 font-bold text-xl">Acesso Criado!</h3>
                                <p className="text-gray-400">Redirecionando para o painel de controle...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="p-8 space-y-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Nome de Administrador</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                                        <input
                                            required
                                            value={formData.nome}
                                            onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-[10px] py-3 pl-12 pr-5 text-white text-[13px] focus:outline-none focus:border-white"
                                            placeholder="Nome completo"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">E-mail de Acesso</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                                        <input
                                            required
                                            type="email"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-[10px] py-3 pl-12 pr-5 text-white text-[13px] focus:outline-none focus:border-white"
                                            placeholder="admin@imobiliaria.com"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Senha</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                            <input
                                                required
                                                type="password"
                                                value={formData.senha}
                                                onChange={e => setFormData({ ...formData, senha: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-[10px] py-3 pl-10 pr-5 text-white text-[13px] focus:outline-none focus:border-white"
                                                placeholder="••••••"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Confirmar</label>
                                        <input
                                            required
                                            type="password"
                                            value={formData.confirmarSenha}
                                            onChange={e => setFormData({ ...formData, confirmarSenha: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-[10px] py-3 px-5 text-white text-[13px] focus:outline-none focus:border-white"
                                            placeholder="••••••"
                                        />
                                    </div>
                                </div>

                                <div className="pt-6">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-blue-600 hover:bg-white text-white font-black py-4 rounded-[10px] transition-all btn-glow uppercase tracking-widest shadow-lg"
                                    >
                                        {loading ? <Loader2 className="animate-spin w-6 h-6 mx-auto" /> : "Ativar Credenciais Máster"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
