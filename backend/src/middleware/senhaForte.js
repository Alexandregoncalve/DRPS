// Exige: mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número, 1 símbolo
function senhaForte(senha) {
  if (!senha || senha.length < 8) return { valido: false, erro: 'A senha deve ter no mínimo 8 caracteres' };
  if (!/[A-Z]/.test(senha)) return { valido: false, erro: 'A senha deve ter ao menos uma letra maiúscula' };
  if (!/[a-z]/.test(senha)) return { valido: false, erro: 'A senha deve ter ao menos uma letra minúscula' };
  if (!/[0-9]/.test(senha)) return { valido: false, erro: 'A senha deve ter ao menos um número' };
  if (!/[^A-Za-z0-9]/.test(senha)) return { valido: false, erro: 'A senha deve ter ao menos um caractere especial (ex: ! @ # $ %)' };
  return { valido: true };
}

module.exports = { senhaForte };