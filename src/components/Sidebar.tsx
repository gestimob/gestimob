"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
    BarChart3,
    Building2,
    Users,
    UserSquare2,
    Home,
    FileText,
    LogOut,
    ChevronRight,
    ChevronDown,
    Key,
    Settings,
    FolderOpen,
    DollarSign,
    ChevronLeft,
    Menu,
    X as CloseIcon,
    CreditCard
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

type MenuItem = {
    icon: any;
    label: string;
    href: string;
    external?: boolean;
};

type MenuGroup = {
    icon: any;
    label: string;
    children: MenuItem[];
};

type SidebarItem = MenuItem | MenuGroup;

function isGroup(item: SidebarItem): item is MenuGroup {
    return 'children' in item;
}

const sidebarItems: SidebarItem[] = [
    { icon: BarChart3, label: "Dashboard", href: "/dashboard" },
    { icon: Key, label: "Aluguel", href: "/aluguel" },
    {
        icon: FolderOpen,
        label: "Cadastros",
        children: [
            { icon: Home, label: "Imóveis", href: "/imoveis" },
            { icon: UserSquare2, label: "Proprietários", href: "/proprietarios" },
            { icon: Users, label: "Clientes", href: "/clientes" },
            { icon: Building2, label: "Empresas", href: "/empresas" },
        ]
    },
    { icon: FileText, label: "Contratos", href: "/contratos" },
    { icon: DollarSign, label: "Financeiro", href: "/financeiro" },
    { icon: CreditCard, label: "Contas a Pagar", href: "https://contasrrimob.pages.dev/login", external: true },
    { icon: Settings, label: "Configurações", href: "/configuracoes" },
];

// In-memory cache to prevent logo flickering during navigation
let cachedLogoUrl: string | null = null;

export function Sidebar() {
    const pathname = usePathname();
    const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
    const [userName, setUserName] = useState<string>('');
    const [userEmail, setUserEmail] = useState<string>('');
    const [logoUrl, setLogoUrl] = useState<string | null>(cachedLogoUrl);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Initialize collapse state from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("sidebar-collapsed");
        if (saved === "true") {
            setIsCollapsed(true);
            document.documentElement.classList.add('sidebar-collapsed');
        } else {
            document.documentElement.classList.remove('sidebar-collapsed');
        }
    }, []);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem("sidebar-collapsed", newState.toString());

        if (newState) {
            document.documentElement.classList.add('sidebar-collapsed');
        } else {
            document.documentElement.classList.remove('sidebar-collapsed');
        }

        // Dispatch custom event for pages to update their margin
        window.dispatchEvent(new Event('sidebarToggle'));
    };

    // Fetch user profile
    useEffect(() => {
        const fetchUserProfile = async (session: any) => {
            if (session?.user) {
                setUserEmail(session.user.email || '');

                // First attempt to get the name from user_metadata (set during user creation)
                const metadataName = session.user.user_metadata?.nome_completo || session.user.user_metadata?.nome;

                // Also attempt to get from profile table just in case
                const { data } = await supabase
                    .from('profile')
                    .select('nome')
                    .eq('id', session.user.id)
                    .single();

                if (data && data.nome) {
                    setUserName(data.nome);
                } else if (metadataName) {
                    setUserName(metadataName);
                }
            } else {
                setUserName('');
                setUserEmail('');
            }
        };

        const fetchSettings = async () => {
            const { data } = await supabase
                .from('configuracoes')
                .select('logo_url')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (data?.logo_url) {
                setLogoUrl(data.logo_url);
                cachedLogoUrl = data.logo_url;
            }
        };

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            fetchUserProfile(session);
        });

        supabase.auth.getSession().then(({ data: { session } }) => {
            fetchUserProfile(session);
        });

        fetchSettings();

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    // Auto-expand group if current page is inside it
    useEffect(() => {
        sidebarItems.forEach(item => {
            if (isGroup(item)) {
                const isChildActive = item.children.some(child => pathname === child.href);
                if (isChildActive) {
                    setOpenGroups(prev => new Set(prev).add(item.label));
                }
            }
        });
    }, [pathname]);

    const toggleGroup = (label: string) => {
        setOpenGroups(prev => {
            const next = new Set(prev);
            if (next.has(label)) next.delete(label);
            else next.add(label);
            return next;
        });
    };

    const renderMenuItem = (item: MenuItem, isChild = false) => {
        const isActive = pathname === item.href;
        
        const content = (
            <div className={cn(
                "group flex items-center rounded-xl transition-all duration-200 cursor-pointer overflow-hidden relative",
                isChild ? "px-4 py-2.5 ml-4 border-l-2" : "px-4 py-3",
                isActive
                    ? isChild
                        ? "bg-primary/10 text-primary border-l-primary"
                        : "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_20px_rgba(0,0,0,0.02)] dark:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                    : isChild
                        ? "text-accent hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground border-l-transparent hover:border-l-accent/30"
                        : "text-accent hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground",
                isCollapsed && !isChild ? "justify-center px-0" : "justify-between"
            )}>
                <div className={cn("flex items-center gap-3", isCollapsed && !isChild && "gap-0")}>
                    <item.icon className={cn(
                        isChild ? "w-4 h-4" : "w-5 h-5",
                        isActive ? "text-primary" : "text-accent group-hover:text-foreground",
                        isCollapsed && !isChild && "w-6 h-6"
                    )} />
                    {!isCollapsed && <span className={cn("font-medium whitespace-nowrap", isChild && "text-[13px]")}>{item.label}</span>}
                    {isCollapsed && !isChild && (
                        <div className="absolute left-full ml-4 px-2 py-1 bg-panel border border-panel-border rounded-md text-[10px] font-bold text-foreground opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-xl">
                            {item.label}
                        </div>
                    )}
                </div>
                {isActive && !isChild && !isCollapsed && <ChevronRight className="w-4 h-4 text-primary" />}
                {isActive && !isChild && (
                    <div className={cn(
                        "absolute left-0 top-0 h-full bg-primary shadow-[0_0_10px_rgba(0,0,0,0.1)] dark:shadow-[0_0_10px_rgba(255,255,255,0.3)]",
                        isCollapsed ? "w-1" : "w-1"
                    )} />
                )}
            </div>
        );

        if (item.external) {
            return (
                <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" className="block outline-none">
                    {content}
                </a>
            );
        }

        return (
            <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                {content}
            </Link>
        );
    };

    const renderGroup = (group: MenuGroup) => {
        const isOpen = openGroups.has(group.label);
        const isChildActive = group.children.some(child => pathname === child.href);

        if (isCollapsed) {
            return (
                <div key={group.label} className="relative group/group">
                    <div className={cn(
                        "w-full flex items-center justify-center p-3 rounded-xl transition-all duration-200 cursor-pointer",
                        isChildActive ? "text-primary bg-primary/10" : "text-accent hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground"
                    )}>
                        <group.icon className="w-6 h-6" />
                    </div>
                    {/* Tooltip + Context Menu for Collapsed Group */}
                    <div className="absolute left-full top-0 ml-4 w-48 bg-panel glass-elite border border-panel-border rounded-2xl opacity-0 group-hover/group:opacity-100 pointer-events-none group-hover/group:pointer-events-auto transition-all z-50 shadow-2xl p-2 hidden group-hover/group:block">
                        <div className="px-3 py-2 mb-1 border-b border-panel-border">
                            <span className="text-[10px] font-black uppercase tracking-widest text-accent">{group.label}</span>
                        </div>
                        {group.children.map(child => renderMenuItem(child, true))}
                    </div>
                </div>
            );
        }

        return (
            <div key={group.label}>
                <button
                    onClick={() => toggleGroup(group.label)}
                    className={cn(
                        "w-full group flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer",
                        isChildActive
                            ? "text-primary bg-primary/10"
                            : "text-accent hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <group.icon className={cn("w-5 h-5", isChildActive ? "text-primary" : "text-accent group-hover:text-foreground")} />
                        <span className="font-medium">{group.label}</span>
                    </div>
                    <ChevronDown className={cn(
                        "w-4 h-4 transition-transform duration-200",
                        isOpen ? "rotate-0" : "-rotate-90",
                        isChildActive ? "text-primary" : "text-accent"
                    )} />
                </button>

                <div className={cn(
                    "overflow-hidden transition-all duration-200 ease-in-out",
                    isOpen ? "max-h-[500px] opacity-100 mt-1" : "max-h-0 opacity-0"
                )}>
                    <div className="space-y-0.5 pl-2">
                        {group.children.map(child => renderMenuItem(child, true))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            {/* Mobile Nav Top */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-20 bg-panel border-b border-panel-border z-[100] flex items-center justify-between px-4 sm:px-6">
                <Link href="/dashboard" className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="flex flex-col min-w-0">
                        <span className="text-[13px] font-bold text-foreground truncate">{userName || 'Usuário'}</span>
                    </div>
                </Link>
                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                    <ThemeToggle />
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-black/5 dark:bg-white/5 rounded-xl border border-panel-border">
                        {isMobileMenuOpen ? <CloseIcon className="w-6 h-6 text-foreground" /> : <Menu className="w-6 h-6 text-foreground" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="md:hidden fixed inset-0 top-20 bg-panel z-[90] overflow-y-auto p-6"
                    >
                        <nav className="space-y-2">
                            {sidebarItems.map(item =>
                                isGroup(item) ? (
                                    <div key={item.label} className="space-y-1">
                                        <div className="px-4 py-2 mt-4 text-[10px] font-black uppercase tracking-widest text-accent border-b border-panel-border mb-2">
                                            {item.label}
                                        </div>
                                        {item.children.map(child => renderMenuItem(child, true))}
                                    </div>
                                ) : renderMenuItem(item)
                            )}
                        </nav>
                        <div className="mt-8 pt-8 border-t border-panel-border space-y-4">
                            <div className="flex items-center gap-4 px-4">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    {userName?.charAt(0) || 'U'}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-foreground">{userName || 'Usuário'}</div>
                                    <div className="text-[11px] text-accent">{userEmail}</div>
                                </div>
                            </div>
                            <button
                                onClick={async () => {
                                    await supabase.auth.signOut();
                                    window.location.href = '/';
                                }}
                                className="w-full flex items-center gap-3 px-4 py-4 text-rose-500 bg-rose-500/5 rounded-2xl hover:bg-rose-500/10 transition-all font-bold text-sm"
                            >
                                <LogOut className="w-5 h-5" />
                                <span>Sair do Sistema</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <aside className={cn(
                "h-screen fixed left-0 top-0 glass-elite border-r border-panel-border z-40 hidden md:flex flex-col shadow-2xl transition-all duration-300 ease-in-out",
                isCollapsed ? "w-24" : "w-72"
            )}>
                {/* Collapse Toggle */}
                <button
                    onClick={toggleCollapse}
                    className="absolute -right-3 top-24 w-6 h-6 bg-panel border border-panel-border rounded-full flex items-center justify-center shadow-lg hover:bg-primary hover:text-background transition-all z-50 group"
                >
                    <ChevronLeft className={cn("w-4 h-4 transition-transform", isCollapsed && "rotate-180")} />
                </button>

                <div className={cn("p-8 flex flex-col items-center relative", isCollapsed && "px-4")}>
                    <div className={cn("absolute right-4 top-4 scale-75", isCollapsed && "right-auto relative mb-4 scale-90")}>
                        <ThemeToggle />
                    </div>
                    <Link href="/dashboard" className={cn("block w-full mt-4 transition-all", isCollapsed ? "max-w-[40px]" : "max-w-[120px]")}>
                        {logoUrl && (
                            <img src={logoUrl} alt="Logo" className="w-full h-auto object-contain max-h-16 mx-auto" />
                        )}
                        {!logoUrl && !isCollapsed && (
                            <div className="text-center">
                                {/* Nome removido conforme solicitado */}
                            </div>
                        )}
                    </Link>
                </div>

                <nav className={cn("flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar", isCollapsed && "px-2")}>
                    {sidebarItems.map(item =>
                        isGroup(item) ? renderGroup(item) : renderMenuItem(item)
                    )}
                </nav>

                <div className={cn("p-6 border-t border-black/5 dark:border-white/5", isCollapsed && "p-4 flex flex-col items-center")}>
                    {!isCollapsed && (
                        <div className="rounded-xl flex flex-col mb-4">
                            <div className="overflow-hidden w-full">
                                <div className="text-[13px] font-bold text-foreground truncate" title={userName || 'Usuário'}>
                                    {userName || 'Usuário'}
                                </div>
                                <div className="text-[11px] text-accent truncate" title={userEmail || ''}>
                                    {userEmail || ''}
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            window.location.href = '/';
                        }}
                        className={cn(
                            "group w-full flex items-center gap-3 px-4 py-3 text-accent hover:text-rose-500 hover:bg-rose-500/5 rounded-xl transition-all duration-200",
                            isCollapsed && "justify-center px-0 hover:bg-rose-500/10"
                        )}
                        title="Sair do Sistema"
                    >
                        <LogOut className={cn("w-5 h-5", isCollapsed && "w-6 h-6")} />
                        {!isCollapsed && <span className="font-medium">Sair do Sistema</span>}
                        {isCollapsed && (
                            <div className="absolute left-full ml-4 px-2 py-1 bg-panel border border-panel-border rounded-md text-[10px] font-bold text-rose-500 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-xl">
                                Sair do Sistema
                            </div>
                        )}
                    </button>
                </div>
            </aside>

            {/* Mobile Spacer (to push content below fixed header) */}
            <div className="h-20 md:hidden" />
        </>
    );
}
