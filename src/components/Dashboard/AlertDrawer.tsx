import { X, ArrowRight, FileText, Clock, AlertTriangle, Users, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Link from "next/link";

interface AlertItem {
    id: string;
    title: string;
    description: string;
    metadata: string;
    href: string;
}

interface AlertDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    items: AlertItem[];
    type: 'utility' | 'upcoming' | 'overdue' | 'clients';
    onItemClick?: (id: string) => void;
}

export function AlertDrawer({ isOpen, onClose, title, items, type, onItemClick }: AlertDrawerProps) {
    const [searchTerm, setSearchTerm] = useState("");

    const getIcon = () => {
        switch (type) {
            case 'utility': return <FileText className="w-5 h-5 text-accent" />;
            case 'upcoming': return <Clock className="w-5 h-5 text-amber-500" />;
            case 'overdue': return <AlertTriangle className="w-5 h-5 text-rose-500" />;
            case 'clients': return <Users className="w-5 h-5 text-primary" />;
            default: return null;
        }
    };

    const filteredItems = items.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.metadata.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-background/90 backdrop-blur-xl z-[110]"
                    />

                    {/* Drawer */}
                    <motion.div
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-panel border-l border-panel-border z-[120] shadow-2xl flex flex-col"
                    >
                        <header className="p-8 border-b border-panel-border flex items-center justify-between bg-black/5 dark:bg-white/5 backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                {getIcon()}
                                <h3 className="text-xl font-bold text-foreground uppercase tracking-tight">{title}</h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full flex items-center justify-center text-accent transition-all border border-panel-border"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </header>

                        <div className="p-8 pb-0 no-print">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Busca inteligente..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-black/5 dark:bg-white/5 border border-panel-border focus:border-primary/30 focus:bg-black/10 dark:focus:bg-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-text-dim outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            {filteredItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                                    <p>{searchTerm ? "Nenhum resultado para sua busca." : "Nenhuma pendência encontrada."}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className="group relative bg-black/5 dark:bg-white/5 border border-panel-border hover:border-primary/20 rounded-2xl p-5 transition-all"
                                        >
                                            <div className="mb-1 text-foreground font-bold transition-colors">
                                                {item.title}
                                            </div>
                                            <div className="text-sm text-text-dim mb-2">
                                                {item.description}
                                            </div>
                                            <p className="text-[10px] text-accent font-black uppercase tracking-widest">
                                                {item.metadata}
                                            </p>

                                            {onItemClick ? (
                                                <button
                                                    onClick={() => onItemClick(item.id)}
                                                    className="mt-4 w-full bg-primary/10 hover:bg-primary/20 text-primary py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                                >
                                                    Ver Detalhes
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <Link
                                                    href={item.href}
                                                    className="mt-4 w-full bg-primary/10 hover:bg-primary/20 text-primary py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                                >
                                                    Ver Detalhes
                                                    <ArrowRight className="w-4 h-4" />
                                                </Link>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
