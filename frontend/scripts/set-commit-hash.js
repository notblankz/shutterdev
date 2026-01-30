const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
    const commitHashShort = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    const commitHashFull = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();

    const isDev = process.env.NODE_ENV !== 'production';
    const envFile = isDev ? '.env.local' : '.env.production';
    const envPath = path.join(__dirname, '..', envFile);

    let envContent = '';
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
    }

    envContent = envContent
        .split('\n')
        .filter(line => !line.startsWith('NEXT_PUBLIC_GIT_COMMIT'))
        .join('\n');

    envContent += `\nNEXT_PUBLIC_GIT_COMMIT_SHORT=${commitHashShort}\n`;
    envContent += `NEXT_PUBLIC_GIT_COMMIT_FULL=${commitHashFull}\n`;

    fs.writeFileSync(envPath, envContent.trim() + '\n');
    console.log(`Git commit hash set to: ${commitHashShort} / ${commitHashFull} (${envFile})`);
} catch (error) {
    console.error('Failed to get git commit hash:', error.message);
    console.log('Using fallback: unknown');
}
