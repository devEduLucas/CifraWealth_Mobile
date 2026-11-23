// Uso (na raiz do projeto Expo): node apply-brand.js
const fs = require('fs');
const { execSync } = require('child_process');

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

if (!fs.existsSync('app.json')) {
  console.error('app.json não encontrado (ou o projeto usa app.config.js/ts). Rode na raiz; se usa app.config, copie as chaves abaixo para ele.');
  process.exit(1);
}

const json = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const e = json.expo || (json.expo = {});
const MID = '#1D8EC8'; // meio do degradê da marca (azul → teal)

e.icon = './assets/icon.png';
delete e.splash; // splash antigo (padrão do Expo)
e.plugins = (e.plugins || []).filter((p) => (Array.isArray(p) ? p[0] : p) !== 'expo-splash-screen');
e.plugins.push(['expo-splash-screen', { backgroundColor: MID, image: './assets/splash-icon.png', imageWidth: 200 }]);
e.android = { ...(e.android || {}), adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundImage: './assets/adaptive-background.png' } };
e.web = { ...(e.web || {}), favicon: './assets/favicon.png' };
fs.writeFileSync('app.json', JSON.stringify(json, null, 2) + '\n');

run('npx expo install expo-splash-screen');

// O ícone do APK vem da pasta android/. Se ela existir, o app.json é ignorado até regenerá-la.
if (fs.existsSync('android')) {
  fs.rmSync('android.bak', { recursive: true, force: true });
  fs.renameSync('android', 'android.bak'); // backup caso haja edição nativa manual
  console.log('android/ salvo em android.bak/');
}
run('npx expo prebuild --clean --platform android');

const ok = fs.existsSync('android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.webp');
console.log(ok ? 'OK: ícone nativo regenerado. Gere o APK de novo e desinstale o antigo antes de instalar.' : 'ATENÇÃO: ícones não foram gerados em android/. Veja os erros acima.');
