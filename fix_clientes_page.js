const fs = require('fs');
const file = 'c:/Sites/Gestimob_App/src/app/clientes/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Header section
content = content.replace(/text-4xl font-black text-white/, 'text-4xl font-black text-foreground');
content = content.replace(/text-gray-500 text-xs/, 'text-text-dim text-xs');
content = content.replace(/bg-blue-600 hover:bg-blue-500 text-white/g, 'bg-primary hover:bg-primary/90 text-primary-foreground btn-glow shadow-[0_0_40px_var(--primary-glow)]');

// Filters section
content = content.replace(/glass p-4 rounded-2xl mb-8/g, 'bg-panel border border-panel-border p-4 rounded-2xl mb-8 shadow-sm');
content = content.replace(/text-gray-500/g, 'text-accent');
content = content.replace(/bg-white\/5 border border-white\/10/g, 'bg-black/5 dark:bg-white/5 border border-panel-border');
content = content.replace(/text-white text-\[13px\]/, 'text-foreground text-[13px] placeholder:text-accent');
content = content.replace(/focus:border-blue-500/g, 'focus:border-primary');

// Buttons in filters
content = content.replace(/glass px-4 py-3 rounded-\[10px\]/g, 'bg-black/5 dark:bg-white/5 px-4 py-3 rounded-[10px]');
content = content.replace(/text-gray-400 hover:text-white/g, 'text-accent hover:text-foreground');
content = content.replace(/border border-white\/5/g, 'border border-panel-border');

// Table container
content = content.replace(/glass rounded-\[32px\] overflow-hidden border border-white\/5 shadow-2xl/g, 'bg-panel rounded-[24px] overflow-hidden border border-panel-border shadow-sm');
content = content.replace(/text-blue-500 animate-spin/g, 'text-primary animate-spin');
// loading text
content = content.replace(/text-\[10px\] font-black text-accent uppercase tracking-\[0\.3em\]/g, 'text-[10px] font-black text-accent uppercase tracking-[0.3em]');

// Table head
content = content.replace(/bg-white\/\[0\.02\] border-b border-white\/5/g, 'bg-black/5 dark:bg-white/5 border-b border-panel-border');
content = content.replace(/divide-white\/5/g, 'divide-panel-border');

// Table TRs
content = content.replace(/hover:bg-white\/\[0\.04\]/g, 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]');

// TEXT REPLACEMENT inside loop
// Codigo
const codigoHTML = `                                            <td className="px-6 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                                        <Hash className="w-3 h-3 text-blue-400" />
                                                    </div>
                                                    <span className="font-mono text-sm font-bold text-white tracking-tighter">#{cliente.codigo_interno}</span>
                                                </div>
                                            </td>`;
const newCodigoHTML = `                                            <td className="px-6 py-6">
                                                <div className="w-fit min-w-[32px] px-3 py-1.5 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                                                    <span className="font-mono text-[13px] font-bold text-primary tracking-tighter">#{cliente.codigo_interno}</span>
                                                </div>
                                            </td>`;
content = content.replace(codigoHTML, newCodigoHTML);

// Nome
content = content.replace(/text-white uppercase tracking-tight line-clamp-1/g, 'text-foreground uppercase tracking-tight line-clamp-1');
content = content.replace(/text-sm font-black text-foreground uppercase tracking-tight line-clamp-1/g, 'text-[13px] font-black text-foreground uppercase tracking-tight line-clamp-1');
content = content.replace(/bg-gradient-to-br from-blue-600\/20 to-indigo-600\/20/g, 'bg-primary/20');
content = content.replace(/text-blue-400/g, 'text-primary');

// Documento (Identificacao)
const docHTML = `                                            <td className="px-6 py-6">
                                                <div className="space-y-1">
                                                    <div className="text-xs font-bold text-gray-300 whitespace-nowrap">{cliente.documento}</div>
                                                    <div className="text-\[9px\] text-accent font-black uppercase tracking-widest whitespace-nowrap">{cliente.tipo === 'PF' \? 'Pessoa Física' : 'Pessoa Jurídica'}</div>
                                                </div>
                                            </td>`;
const docNewHTML = `                                            <td className="px-6 py-6 text-center">
                                                <div className="flex flex-col items-center space-y-1">
                                                    <div className="text-[13px] font-bold text-foreground overflow-hidden whitespace-nowrap">{cliente.documento}</div>
                                                    <div className="text-[10px] text-accent font-black uppercase tracking-widest whitespace-nowrap">{cliente.tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}</div>
                                                </div>
                                            </td>`;
content = content.replace(new RegExp(docHTML.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), docNewHTML);
// fallback doc replace if regex fails
content = content.replace(/text-xs font-bold text-gray-300 whitespace-nowrap/g, 'text-[13px] font-bold text-foreground overflow-hidden whitespace-nowrap');

// Whatsapp
const whatsappHTML = `                                            <td className="px-6 py-6">
                                                {cliente.celular ? (
                                                    <a
                                                        href={\`https://wa.me/55\${cliente.celular.replace(/\\D/g, '')}\`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 text-emerald-500 hover:text-emerald-400 transition-colors w-fit group/wa whitespace-nowrap"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover/wa:scale-110 transition-transform flex-shrink-0">
                                                            <MessageCircle className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-xs font-bold font-mono">
                                                            {cliente.celular.replace(/\\D/g, '').replace(/(\\d{2})(\\d{5})(\\d{4})/, '($1) $2-$3')}
                                                        </span>
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-600 text-[10px] font-bold uppercase tracking-widest italic whitespace-nowrap">Não informado</span>
                                                )}
                                            </td>`;
const whatsappNewHTML = `                                            <td className="px-6 py-6 text-center">
                                                <div className="flex justify-center">
                                                    {cliente.celular ? (
                                                        <a
                                                            href={\`https://wa.me/55\${cliente.celular.replace(/\\D/g, '')}\`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 text-emerald-500 hover:text-emerald-400 transition-colors w-fit group/wa whitespace-nowrap"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover/wa:scale-110 transition-transform flex-shrink-0">
                                                                <MessageCircle className="w-4 h-4" />
                                                            </div>
                                                            <span className="text-xs font-bold font-mono">
                                                                {cliente.celular.replace(/\\D/g, '').replace(/(\\d{2})(\\d{5})(\\d{4})/, '($1) $2-$3')}
                                                            </span>
                                                        </a>
                                                    ) : (
                                                        <span className="text-accent text-[10px] font-bold uppercase tracking-widest italic whitespace-nowrap">Não informado</span>
                                                    )}
                                                </div>
                                            </td>`;
content = content.replace(whatsappHTML, whatsappNewHTML);

// Th classes
content = content.replace(/<th className="px-6 py-6 text-\[10px\] font-black text-gray-500 uppercase tracking-\[0\.2em\]">Identificação<\/th>/g,
    '<th className="px-6 py-6 text-[10px] font-black text-accent uppercase tracking-[0.2em] text-center">Identificação</th>');
content = content.replace(/<th className="px-6 py-6 text-\[10px\] font-black text-gray-500 uppercase tracking-\[0\.2em\]">WhatsApp<\/th>/g,
    '<th className="px-6 py-6 text-[10px] font-black text-accent uppercase tracking-[0.2em] text-center">WhatsApp</th>');

// Control Buttons
content = content.replace(/text-blue-400/g, 'text-primary');
content = content.replace(/bg-white\/5 hover:bg-white\/10 text-primary border border-panel-border/g, 'text-primary bg-black/5 dark:bg-white/5 hover:bg-primary/10 border border-panel-border');

content = content.replace(/text-gray-600/g, 'text-accent');
content = content.replace(/text-gray-500/g, 'text-accent');

fs.writeFileSync(file, content, 'utf8');
console.log('Finished migrating themes and adjusting columns for clientes/page.tsx');
