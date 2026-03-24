
const serviceAccountKey = '{"private_key":"-----BEGIN PRIVATE KEY-----\\nline1\\n-----END PRIVATE KEY-----\\n"}';
try {
  const serviceAccount = JSON.parse(serviceAccountKey);
  console.log('Parsed privateKey length:', serviceAccount.private_key.length);
  console.log('Contains newline char:', serviceAccount.private_key.includes('\n'));
  console.log('Contains literal \\n:', serviceAccount.private_key.includes('\\n'));
  
  // My fix
  const fixed = serviceAccount.private_key.replace(/\\n/g, '\n');
  console.log('After fix length:', fixed.length);
  console.log('After fix contains newline char:', fixed.includes('\n'));
} catch (e) {
  console.error(e);
}
