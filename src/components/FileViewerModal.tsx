import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileUrl: string | null;
    fileName: string;
    onDelete?: () => void;
}

export function FileViewerModal({ isOpen, onClose, fileUrl, fileName, onDelete }: FileViewerModalProps) {
    const isImage = fileUrl && (fileUrl.match(/\.(jpeg|jpg|gif|png)$/) != null || fileUrl.startsWith('blob:') || (fileUrl.includes('firebasestorage') && !fileUrl.includes('.pdf')));
    const isPdf = fileUrl && (fileUrl.toLowerCase().includes('.pdf') || fileUrl.startsWith('data:application/pdf'));

    return (
        <AnimatePresence>
            {isOpen && fileUrl && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-background/90 backdrop-blur-xl"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-panel dark:glass w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl relative z-10 border border-panel-border flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-panel-border flex items-center justify-between bg-panel/30 dark:bg-white/5 backdrop-blur-md">
                            <h3 className="text-sm font-bold text-white tracking-widest uppercase truncate max-w-xl">
                                {fileName}
                            </h3>
                            <div className="flex items-center gap-4">
                                {onDelete && (
                                    <button
                                        onClick={() => {
                                            onDelete();
                                            onClose();
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all text-xs font-bold tracking-widest uppercase"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Excluir
                                    </button>
                                )}
                                <a
                                    href={fileUrl}
                                    download={fileName}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 text-gray-400 hover:text-white hover:bg-[#101921] rounded-lg transition-all"
                                    title="Baixar/Abrir"
                                >
                                    <Download className="w-5 h-5" />
                                </a>
                                <button onClick={onClose} className="p-2 text-gray-400 hover:text-rose-500 hover:bg-[#101921] rounded-lg transition-all">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-auto bg-panel flex items-center justify-center p-6">
                            {isPdf || fileUrl.includes('.pdf') ? (
                                <iframe src={fileUrl} className="w-full h-full rounded-xl bg-white" title={fileName} />
                            ) : (
                                <img src={fileUrl} alt={fileName} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
