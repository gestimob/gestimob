const fs = require('fs');

const clienteFile = 'c:/Sites/Gestimob_App/src/components/DetalhesClienteModal.tsx';
const empresaFile = 'c:/Sites/Gestimob_App/src/components/DetalhesEmpresaModal.tsx';

let clienteContent = fs.readFileSync(clienteFile, 'utf8');
let empresaContent = fs.readFileSync(empresaFile, 'utf8');

// Extract style block
const styleMatch = clienteContent.match(/<style dangerouslySetInnerHTML=\{\{[\s\S]*?\}\} \/>/);
if (!styleMatch) {
    console.error("Could not extract style block");
    process.exit(1);
}
let styleBlock = styleMatch[0];

// Tweak some tailwind variables for the print block to handle semantic variables
const cssAdditions = `
                                /* CUSTOM FOR EMPRESA MODAL CSS variables to black/white */
                                .print-container [class*="bg-black"], .print-container [class*="bg-white"], .print-container [class*="bg-panel"] {
                                    background-color: #ffffff !important;
                                }
                                .print-container [class*="text-foreground"], .print-container [class*="text-accent"], .print-container [class*="text-text-dim"] {
                                    color: #000000 !important;
                                }
                                .print-container [class*="border-panel-border"] {
                                    border-color: #d1d5db !important;
                                }
                                .print-container [class*="bg-badge-bg"] {
                                    background-color: #ffffff !important;
                                    border: 1px solid #d1d5db !important;
                                }
`;
styleBlock = styleBlock.replace(
    /(\.no-print\s*\{\s*display:\s*none\s*!important;\s*visibility:\s*hidden\s*!important;\s*\})/,
    `$1\n${cssAdditions}`
);

// Delete Unidade Verificada section
const verifSection = /<div className="mt-8 pt-8 border-t border-panel-border">[\s\S]*?Unidade Verificada[\s\S]*?<\/div>[\s\S]*?<\/div>\s*<\/div>/;
empresaContent = empresaContent.replace(verifSection, '</div>');

// Inject handlePrint
if (!empresaContent.includes('const handlePrint = () => {')) {
    empresaContent = empresaContent.replace(
        'return (',
        `const handlePrint = () => {\n        window.print();\n    };\n\n    return (`
    );
}

// Inject style block inside <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
if (!empresaContent.includes('<style dangerouslySetInnerHTML={{')) {
    empresaContent = empresaContent.replace(
        '<div className="fixed inset-0 z-50 flex items-center justify-center p-4">',
        `<div className="fixed inset-0 z-50 flex items-center justify-center p-4">\n                    ${styleBlock}\n`
    );
}

// Add classes: print-container and no-print
empresaContent = empresaContent.replace(
    /className="bg-panel w-full max-w-4xl max-h-\[90vh\] rounded-2xl shadow-3xl overflow-hidden relative z-10 border border-panel-border flex flex-col font-sans"/,
    'className="bg-panel w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-3xl overflow-hidden relative z-10 border border-panel-border flex flex-col font-sans print-container"'
);

// voltr
empresaContent = empresaContent.replace(
    /className="px-4 py-2 bg-panel border border-panel-border rounded-lg flex items-center gap-3 text-foreground hover:text-foreground transition-all group"/,
    'className="px-4 py-2 bg-panel border border-panel-border rounded-lg flex items-center gap-3 text-foreground hover:text-foreground transition-all group no-print"'
);

// Imprimir
empresaContent = empresaContent.replace(
    /<button className="flex items-center gap-2 bg-panel border border-panel-border text-foreground hover:text-foreground px-5 py-2.5 rounded-lg text-sm font-semibold transition-all">/,
    '<button onClick={handlePrint} className="flex items-center gap-2 bg-panel border border-panel-border text-foreground hover:text-foreground px-5 py-2.5 rounded-lg text-sm font-semibold transition-all no-print">'
);

// X
empresaContent = empresaContent.replace(
    /<button onClick=\{onClose\} className="p-2 text-text-dim hover:text-foreground ml-2">/,
    '<button onClick={onClose} className="p-2 text-text-dim hover:text-foreground ml-2 no-print">'
);

// Overlay
empresaContent = empresaContent.replace(
    /className="absolute inset-0 bg-background\/90 backdrop-blur-md"/,
    'className="absolute inset-0 bg-background/90 backdrop-blur-md no-print"'
);

// Bottom close
const closeBtnSearch = '<button\n                                onClick={onClose}\n                                className="w-full py-4 text-xs font-bold tracking-[0.3em] uppercase text-text-dim hover:text-foreground transition-colors"';
empresaContent = empresaContent.replace(
    closeBtnSearch,
    closeBtnSearch.replace(' transition-colors"', ' transition-colors no-print"')
);


fs.writeFileSync(empresaFile, empresaContent, 'utf8');
console.log('Modified DetalhesEmpresaModal successfully! Done');
