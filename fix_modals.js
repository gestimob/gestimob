const fs = require('fs');

const novoClienteFile = 'c:/Sites/Gestimob_App/src/components/NovoClienteModal.tsx';
const detalhesClienteFile = 'c:/Sites/Gestimob_App/src/components/DetalhesClienteModal.tsx';

let novoContent = fs.readFileSync(novoClienteFile, 'utf8');
let detalhesContent = fs.readFileSync(detalhesClienteFile, 'utf8');

const themeReplacements = [
    // Backgrounds
    { search: /bg-\[#0B1219\]/g, replace: 'bg-background' },
    { search: /bg-\[#101921\]/g, replace: 'bg-panel' },
    { search: /bg-\[#16212B\]/g, replace: 'bg-black/5 dark:bg-white/5' },
    { search: /bg-\[#1A252F\]/g, replace: 'bg-black/5 dark:bg-white/5' },
    { search: /bg-white\/5(?!0)(?!\s*backdrop)/g, replace: 'bg-black/5 dark:bg-white/5' },
    { search: /hover:bg-white\/5(?!0)/g, replace: 'hover:bg-black/5 dark:hover:bg-white/5' },
    { search: /hover:bg-white\/10/g, replace: 'hover:bg-black/10 dark:hover:bg-white/10' },
    { search: /bg-white\/\[0\.02\]/g, replace: 'bg-black/[0.02] dark:bg-white/[0.02]' },

    // Borders
    { search: /border-\[#1E2D3D\]/g, replace: 'border-panel-border' },
    { search: /border-\[#2D3D4D\]/g, replace: 'border-panel-border' },
    { search: /border-white\/5(?!0)/g, replace: 'border-panel-border' },
    { search: /divide-\[#1E2D3D\]/g, replace: 'divide-panel-border' },

    // Texts
    { search: /text-white(?!(\s*!important|\/|\s*black))/g, replace: 'text-foreground' },
    { search: /text-gray-200/g, replace: 'text-foreground' },
    { search: /text-gray-300/g, replace: 'text-foreground' },
    { search: /text-gray-400/g, replace: 'text-accent' },
    { search: /text-gray-500/g, replace: 'text-text-dim' },
    { search: /text-gray-600/g, replace: 'text-text-dim' },

    // Inputs (very common in these forms)
    { search: /placeholder:text-gray-600/g, replace: 'placeholder:text-text-dim' },
    { search: /placeholder:text-gray-500/g, replace: 'placeholder:text-text-dim' },
    { search: /focus:border-blue-500/g, replace: 'focus:border-primary' },
    { search: /focus:border-blue-500\/50/g, replace: 'focus:border-primary/50' },
    { search: /focus:ring-blue-500\/20/g, replace: 'focus:ring-primary/20' },

    // Icons/Brands
    { search: /text-blue-500/g, replace: 'text-primary' },
    { search: /text-blue-400/g, replace: 'text-primary' },
    { search: /bg-blue-600/g, replace: 'bg-primary' },
    { search: /bg-blue-500/g, replace: 'bg-primary' },
    { search: /hover:bg-blue-500/g, replace: 'hover:bg-primary/90' },
    { search: /bg-blue-500\/10/g, replace: 'bg-primary/10' },
    { search: /border-blue-500\/20/g, replace: 'border-primary/20' },
];

themeReplacements.forEach(({ search, replace }) => {
    // Only replace outside of HTML string blocks if possible, or just be careful.
    // The <style dangerouslySetInnerHTML={{ __html: ` ... `}}> block exists in DetalhesClienteModal
    // Let's do replacements, but then "revert" within the <style> block just to be safe if that's an issue?
    // Actually, background etc in the style block are for printing.
    novoContent = novoContent.replace(search, replace);
});

// For DetalhesClienteModal, we need to protect the style block from replacements that might break it.
const styleRegex = /(<style dangerouslySetInnerHTML=\{\{[\s\S]*?\}\}\s*\/>)/;
let match = detalhesContent.match(styleRegex);
let styleBlock = '';
if (match) {
    styleBlock = match[0];
    detalhesContent = detalhesContent.replace(styleRegex, '___STYLE_BLOCK_PLACEHOLDER___');
}

themeReplacements.forEach(({ search, replace }) => {
    detalhesContent = detalhesContent.replace(search, replace);
});

if (styleBlock) {
    detalhesContent = detalhesContent.replace('___STYLE_BLOCK_PLACEHOLDER___', styleBlock);
}

fs.writeFileSync(novoClienteFile, novoContent, 'utf8');
fs.writeFileSync(detalhesClienteFile, detalhesContent, 'utf8');

console.log('Fixed themes for NovoClienteModal and DetalhesClienteModal!');
