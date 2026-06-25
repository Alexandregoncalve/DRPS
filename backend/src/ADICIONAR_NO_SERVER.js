// ADICIONAR esta linha no server.js, junto com as outras rotas:
// (após a linha: app.use('/api/avaliacoes', require('./routes/avaliacoes')(pool));)

app.use('/api/relatorio', require('./routes/relatorio')(pool));
