import fs from 'fs';
const data = JSON.parse(fs.readFileSync('models.json', 'utf8').replace(/^\uFEFF/, '')); // Handle BOM
data.models.forEach(m => {
    console.log(`${m.name} - ${m.displayName}`);
});
