const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 1. Clean Next.js lock file
const lockFile = path.join(process.cwd(), '.next', 'dev', 'lock');
if (fs.existsSync(lockFile)) {
    try {
        fs.unlinkSync(lockFile);
        console.log('Removed Next.js dev lock file.');
    } catch (e) {
        console.warn('Could not remove lock file, might be in use.');
    }
}

// 2. Kill processes on critical ports
const ports = [4100, 4000, 4001, 4002, 4003, 4004, 4005, 4030, 4031, 4032, 4033, 4034, 4035, 3100, 3101, 3102, 3103, 3104, 3105];

if (process.platform === 'win32') {
    ports.forEach(port => {
        try {
            const stdout = execSync(`netstat -ano | findstr :${port}`).toString();
            const pids = stdout
                .split('\n')
                .map(line => line.trim().split(/\s+/).pop())
                .filter(pid => pid && pid !== '0' && pid !== 'LISTENING');
                
            const uniquePids = [...new Set(pids)];
            uniquePids.forEach(pid => {
                try {
                    execSync(`taskkill /F /PID ${pid}`);
                    console.log(`Killed process ${pid} on port ${port}`);
                } catch (e) {
                    // Ignore errors if process already exited
                }
            });
        } catch (e) {
            // No process found on this port
        }
    });
} else {
    // Unix fallback if they ever switch
    try {
        const portStr = ports.join('|');
        execSync(`ss -tulpn | grep -E ':(${portStr})' | awk -F'pid=' '{for(i=2;i<=NF;i++) print $i}' | cut -d',' -f1 | sort -u | xargs -r kill -9 2>/dev/null || true`);
        console.log('Cleaned up ports on Unix.');
    } catch (e) {
        // Ignore errors
    }
}

console.log('Environment ready.');
