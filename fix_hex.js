const fs = require('fs');

const files = [
    'c:/Sites/Gestimob_App/src/components/NovoClienteModal.tsx',
    'c:/Sites/Gestimob_App/src/components/DetalhesClienteModal.tsx'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Protect style blocks
    const styleRegex = /(<style dangerouslySetInnerHTML=\{\{[\s\S]*?\}\}\s*\/>)/;
    let match = content.match(styleRegex);
    let styleBlock = '';
    if (match) {
        styleBlock = match[0];
        content = content.replace(styleRegex, '___STYLE_BLOCK_PLACEHOLDER___');
    }

    const themeReplacements = [
        { search: /bg-\[#0B1219\]/g, replace: 'bg-background' },
        { search: /bg-\[#101921\]/g, replace: 'bg-panel' },
        { search: /bg-\[#16212B\]/g, replace: 'bg-black/5 dark:bg-white/5' },
        { search: /bg-\[#1A252F\]/g, replace: 'bg-black/5 dark:bg-white/5' },
        { search: /bg-\[#0c0c0c\]/gi, replace: 'bg-panel' },
        { search: /bg-\[#111111\]/gi, replace: 'bg-panel' },
        { search: /bg-\[#111\]/gi, replace: 'bg-panel/50' },

        // Fix weird artifacts from previous script
        { search: /bg-black\/5 dark:bg-black\/5 dark:bg-white\/5\/50/g, replace: 'bg-black/5 dark:bg-white/5' },
        { search: /bg-black\/5 dark:bg-black\/5 dark:bg-white\/5/g, replace: 'bg-black/5 dark:bg-white/5' },
        { search: /dark:bg-black\/5 dark:bg-white\/5/g, replace: 'dark:bg-white/5' },

        // Some specific color texts on buttons
        { search: /bg-white text-black/g, replace: 'bg-primary text-primary-foreground' },
        { search: /text-gray-700/g, replace: 'text-text-dim' }
    ];

    themeReplacements.forEach(({ search, replace }) => {
        content = content.replace(search, replace);
    });

    if (styleBlock) {
        content = content.replace('___STYLE_BLOCK_PLACEHOLDER___', styleBlock);
    }

    fs.writeFileSync(file, content, 'utf8');
});

console.log('Fixed deep hex colors in modals!');
