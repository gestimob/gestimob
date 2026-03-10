const fs = require('fs');

const files = [
    'c:/Sites/Gestimob_App/src/components/DetalhesEmpresaModal.tsx',
    'c:/Sites/Gestimob_App/src/components/NovaEmpresaModal.tsx'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Replace modal specific deep dark theme hardcoded values
    content = content.replace(/bg-\[#0B1219\]\/90/g, 'bg-background/90');
    content = content.replace(/bg-\[#101921\]/g, 'bg-panel');
    content = content.replace(/border-\[#1E2D3D\]/g, 'border-panel-border');
    content = content.replace(/bg-\[#1A252F\]/g, 'bg-panel');
    content = content.replace(/border-\[#2D3D4D\]/g, 'border-panel-border');
    content = content.replace(/bg-\[#16212B\]\/50/g, 'bg-black/5 dark:bg-white/5');
    content = content.replace(/bg-\[#16212B\]/g, 'bg-panel border border-panel-border');
    content = content.replace(/bg-\[#1E2D3D\]/g, 'bg-panel-border');

    // Some buttons had E9ECEF
    content = content.replace(/bg-\[#E9ECEF\]/g, 'bg-badge-bg');
    content = content.replace(/text-\[#343A40\]/g, 'text-badge-text');

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
});
