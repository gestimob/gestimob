const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Purge blue-500
    content = content.replace(/text-blue-500/g, 'text-white');
    content = content.replace(/bg-blue-500/g, 'bg-white');
    content = content.replace(/border-blue-500/g, 'border-white');

    // Purge emerald-500
    content = content.replace(/text-emerald-500/g, 'text-accent');
    content = content.replace(/bg-emerald-500/g, 'bg-accent');
    content = content.replace(/border-emerald-500/g, 'border-accent');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.tsx')) {
            replaceInFile(fullPath);
        }
    });
}

const srcDir = path.join(process.cwd(), 'src');
walk(srcDir);
