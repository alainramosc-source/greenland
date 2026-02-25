const fs = require('fs');
const path = require('path');

const files = [
    'src/app/api/send-notification/route.js',
    'src/app/(auth)/pending-approval/page.js',
    'src/app/(dashboard)/dashboard/inventarios/page.js',
    'src/app/(dashboard)/dashboard/usuarios/page.js',
    'src/app/(dashboard)/dashboard/estadisticas/page.js',
    'src/app/(dashboard)/dashboard/direcciones/page.js',
    'src/app/(dashboard)/dashboard/cms/page.js',
];

files.forEach(f => {
    try {
        const fullPath = path.join(__dirname, f);
        let content = fs.readFileSync(fullPath, 'utf8');
        const count = (content.match(/#ec5b13/g) || []).length;
        content = content.replace(/#ec5b13/g, '#6a9a04');
        fs.writeFileSync(fullPath, content);
        console.log(`OK: ${f} (${count} replacements)`);
    } catch (e) {
        console.log(`FAIL: ${f} - ${e.message}`);
    }
});
