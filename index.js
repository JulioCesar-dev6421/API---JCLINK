const express = require('express');
const axios = require('axios');
const { nanoid } = require('nanoid');
require('dotenv').config();

const app = express();
app.use(express.json());

const USERS_URL = process.env.SHEETDB_USERS;
const LINKS_URL = process.env.SHEETDB_LINKS;
const PORT = 3000;

// Middleware de autenticacao
async function authenticate(req, res, next) {
  const token = req.headers['x-api-key'];
  if (!token) return res.status(401).json({ error: 'Token nao enviado' });

  try {
    const response = await axios.get(`${USERS_URL}/search?token=${token}`);
    const user = response.data[0];
    if (!user) return res.status(401).json({ error: 'Token invalido' });

    const isExpired = new Date() > new Date(user.expiresAt);
    if (isExpired) return res.status(401).json({ error: 'Token expirado' });

    req.user = user;
    next();
  } catch {
    res.status(500).json({ error: 'Erro na validacao de token' });
  }
}

// Registro de novo usuario
app.post('/register', async (req, res) => {
  const { name, email } = req.body;
  const token = nanoid(20);
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + parseInt(process.env.TOKEN_VALIDITY_DAYS) * 86400000).toISOString();

  const user = { name, email, token, createdAt, expiresAt };

  try {
    await axios.post(USERS_URL, { data: [user] });
    res.json({ message: 'Usuario registrado', token, expiresAt });
  } catch {
    res.status(500).json({ error: 'Erro ao registrar usuario' });
  }
});

// Renovacao de token
app.post('/renew-token', authenticate, async (req, res) => {
  const newToken = nanoid(20);
  const newExpiresAt = new Date(Date.now() + parseInt(process.env.TOKEN_VALIDITY_DAYS) * 86400000).toISOString();

  try {
    await axios.patch(`${USERS_URL}/search?token=${req.user.token}`, {
      data: { token: newToken, expiresAt: newExpiresAt }
    });
    res.json({ message: 'Token renovado', newToken, expiresAt: newExpiresAt });
  } catch {
    res.status(500).json({ error: 'Erro ao renovar token' });
  }
});

// Criar link encurtado
app.post('/shorten', authenticate, async (req, res) => {
  const { long_url, title } = req.body;
  const id = nanoid(6);
  const createdAt = new Date().toISOString();

  const newLink = {
    id,
    originalUrl: long_url,
    title: title || '',
    clicks: 0,
    createdAt,
    token: req.user.token
  };

  try {
    await axios.post(LINKS_URL, { data: [newLink] });
    res.json({ shortUrl: `http://localhost:${PORT}/${id}`, ...newLink });
  } catch {
    res.status(500).json({ error: 'Erro ao salvar o link' });
  }
});

// Redirecionamento publico
app.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const response = await axios.get(`${LINKS_URL}/search?id=${id}`);
    const link = response.data[0];
    if (!link) return res.status(404).json({ error: 'Link nao encontrado' });

    const newClicks = parseInt(link.clicks || 0) + 1;
    await axios.patch(`${LINKS_URL}/id/${id}`, { data: { clicks: newClicks } });

    res.redirect(link.originalUrl);
  } catch {
    res.status(500).json({ error: 'Erro ao redirecionar o link' });
  }
});

// Listar links do usuario
app.get('/links', authenticate, async (req, res) => {
  try {
    const response = await axios.get(`${LINKS_URL}/search?token=${req.user.token}`);
    res.json(response.data);
  } catch {
    res.status(500).json({ error: 'Erro ao listar os links' });
  }
});

// Editar link
app.patch('/edit/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { long_url, title } = req.body;

  try {
    const linkRes = await axios.get(`${LINKS_URL}/search?id=${id}`);
    const link = linkRes.data[0];

    if (!link || link.token !== req.user.token)
      return res.status(403).json({ error: 'Acesso negado ao link' });

    await axios.patch(`${LINKS_URL}/id/${id}`, {
      data: {
        originalUrl: long_url || link.originalUrl,
        title: title || link.title
      }
    });

    res.json({ message: 'Link atualizado' });
  } catch {
    res.status(500).json({ error: 'Erro ao editar o link' });
  }
});

// Deletar link
app.delete('/delete/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const linkRes = await axios.get(`${LINKS_URL}/search?id=${id}`);
    const link = linkRes.data[0];

    if (!link || link.token !== req.user.token)
      return res.status(403).json({ error: 'Acesso negado ao link' });

    await axios.delete(`${LINKS_URL}/id/${id}`);
    res.json({ message: 'Link deletado' });
  } catch {
    res.status(500).json({ error: 'Erro ao deletar link' });
  }
});

// Estatisticas de um link
app.get('/stats/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const response = await axios.get(`${LINKS_URL}/search?id=${id}`);
    const link = response.data[0];

    if (!link || link.token !== req.user.token)
      return res.status(403).json({ error: 'Acesso negado ao link' });

    res.json({
      id: link.id,
      title: link.title,
      clicks: link.clicks,
      createdAt: link.createdAt,
      shortUrl: `http://localhost:${PORT}/${link.id}`,
      originalUrl: link.originalUrl
    });
  } catch {
    res.status(500).json({ error: 'Erro ao obter estatisticas' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
