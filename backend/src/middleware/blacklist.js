// Blacklist em memória — em produção substituir por Redis
const tokenBlacklist = new Set();
module.exports = tokenBlacklist;
