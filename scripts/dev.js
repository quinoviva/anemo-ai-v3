
const { exec } = require('child_process');

(async () => {
  const { default: getPort } = await import('get-port');
  const port = await getPort({ port: 9002 });
  exec(`next dev --turbopack -p ${port}`);
})();
