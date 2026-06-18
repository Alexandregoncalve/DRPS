const bcrypt = require('bcrypt');

const senha = process.argv[2];
if (!senha) {
  console.log('Uso: node gerar_hash.js SUA_SENHA');
  process.exit(1);
}

bcrypt.hash(senha, 10).then(hash => {
  console.log('Hash gerado:');
  console.log(hash);
});