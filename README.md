# JCLink API

API local para encurtamento de URLs com suporte a multiplos usuarios, expiracao de tokens e persistencia via SheetDB.

## Recursos

- Registro de usuarios com token unico
- Tokens expiram e podem ser renovados
- Encurtamento, redirecionamento, edicao e estatisticas de links
- Cada usuario so ve e manipula seus proprios links
- Tudo armazenado via planilha SheetDB

## Abas da planilha

Crie duas abas no Google Sheets:

1. **users**: name, email, token, createdAt, expiresAt  
2. **links**: id, originalUrl, title, clicks, createdAt, token

Configure no SheetDB e use os links no arquivo .env

## Variaveis de ambiente (.env)

- SHEETDB_USERS=https://sheetdb.io/api/v1/ID_DA_ABA_USERS  
- SHEETDB_LINKS=https://sheetdb.io/api/v1/ID_DA_ABA_LINKS  
- TOKEN_VALIDITY_DAYS=7  

## Rotas da API

### POST /register  
Registra um novo usuario  
**Body:**  
{
  "name": "Nome",
  "email": "email@exemplo.com"
}

### POST /renew-token  
Renova o token do usuario autenticado  
**Header:** x-api-key

### POST /shorten  
Cria um link encurtado  
**Header:** x-api-key  
**Body:**  
{
  "long_url": "https://exemplo.com",
  "title": "Opcional"
}

### GET /:id  
Redireciona o link encurtado

### GET /links  
Lista todos os links do usuario  
**Header:** x-api-key

### PATCH /edit/:id  
Edita um link do usuario  
**Header:** x-api-key

### DELETE /delete/:id  
Deleta um link  
**Header:** x-api-key

### GET /stats/:id  
Retorna estatisticas de um link  
**Header:** x-api-key

## Licenca

MIT
