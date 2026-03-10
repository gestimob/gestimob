const fs = require('fs');

const file = 'c:/Sites/Gestimob_App/src/app/empresas/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/className="px-6 py-4/g, 'className="px-6 py-2');

fs.writeFileSync(file, content, 'utf8');
console.log('Updated rows padding in page.tsx');
