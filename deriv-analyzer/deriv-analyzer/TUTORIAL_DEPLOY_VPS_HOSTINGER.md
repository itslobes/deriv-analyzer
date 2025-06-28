# Tutorial Completo: Deploy do Deriv Analyzer no VPS Hostinger

**Autor:** Manus AI  
**Data:** 27 de Junho de 2025  
**Versão:** 1.0

## Sumário

1. [Introdução](#introdução)
2. [Pré-requisitos](#pré-requisitos)
3. [Configuração Inicial do VPS](#configuração-inicial-do-vps)
4. [Instalação das Dependências](#instalação-das-dependências)
5. [Configuração do Projeto](#configuração-do-projeto)
6. [Configuração do Banco de Dados](#configuração-do-banco-de-dados)
7. [Build e Deploy do Frontend](#build-e-deploy-do-frontend)
8. [Configuração do Backend](#configuração-do-backend)
9. [Configuração do Nginx](#configuração-do-nginx)
10. [Configuração de SSL/HTTPS](#configuração-de-sslhttps)
11. [Configuração de Serviços Systemd](#configuração-de-serviços-systemd)
12. [Monitoramento e Logs](#monitoramento-e-logs)
13. [Backup e Manutenção](#backup-e-manutenção)
14. [Troubleshooting](#troubleshooting)
15. [Conclusão](#conclusão)

---

## Introdução

Este tutorial fornece um guia completo e prático para fazer o deploy da aplicação **Deriv Analyzer** em um VPS (Virtual Private Server) da Hostinger. O Deriv Analyzer é uma aplicação full-stack composta por um frontend React e um backend Python/Flask que realiza análise de dados de mercado em tempo real.

A Hostinger oferece soluções VPS robustas e acessíveis, ideais para hospedar aplicações web modernas. Este guia aborda desde a configuração inicial do servidor até a implementação de práticas de segurança e monitoramento, garantindo que sua aplicação funcione de forma estável e segura em produção.

### Arquitetura da Aplicação

O Deriv Analyzer possui a seguinte arquitetura:

- **Frontend**: Aplicação React com interface moderna usando Tailwind CSS e componentes shadcn/ui
- **Backend**: API REST em Python/Flask para processamento de dados e análise de mercado
- **Banco de Dados**: SQLite para armazenamento de dados históricos e configurações
- **WebSocket**: Conexão em tempo real para atualizações de dados
- **Notificações**: Sistema de alertas sonoros e notificações do navegador

### Benefícios do Deploy no VPS

Hospedar o Deriv Analyzer em um VPS oferece várias vantagens:

- **Controle Total**: Acesso root completo para configurações personalizadas
- **Performance**: Recursos dedicados garantem melhor performance
- **Escalabilidade**: Possibilidade de upgrade conforme necessário
- **Segurança**: Controle total sobre configurações de segurança
- **Custo-Benefício**: Solução mais econômica que serviços gerenciados para aplicações médias

---


## Pré-requisitos

Antes de iniciar o processo de deploy, certifique-se de ter os seguintes itens preparados:

### Conta e Serviços

- **Conta Hostinger**: Acesso ao painel de controle da Hostinger com plano VPS ativo
- **Domínio**: Um domínio registrado e configurado para apontar para o VPS (opcional, mas recomendado)
- **Acesso SSH**: Chaves SSH configuradas ou senha de acesso ao VPS

### Conhecimentos Técnicos

- **Linux Básico**: Familiaridade com comandos básicos do terminal Linux
- **SSH**: Conhecimento sobre conexão e uso de SSH
- **Git**: Entendimento básico de controle de versão
- **Nginx**: Conceitos básicos de servidor web (será explicado no tutorial)

### Ferramentas Locais

- **Cliente SSH**: Terminal (Linux/Mac) ou PuTTY (Windows)
- **Editor de Texto**: Para edição de arquivos de configuração
- **Git**: Para clonagem do repositório do projeto

### Especificações Mínimas do VPS

Para o Deriv Analyzer, recomendamos as seguintes especificações mínimas:

| Componente | Especificação Mínima | Recomendado |
|------------|---------------------|-------------|
| CPU | 1 vCPU | 2 vCPUs |
| RAM | 1 GB | 2 GB |
| Armazenamento | 20 GB SSD | 40 GB SSD |
| Largura de Banda | 1 TB/mês | Ilimitado |
| Sistema Operacional | Ubuntu 20.04+ | Ubuntu 22.04 LTS |

### Informações Necessárias

Antes de começar, tenha em mãos:

- **IP do VPS**: Endereço IP público fornecido pela Hostinger
- **Credenciais de Acesso**: Usuário root e senha ou chave SSH
- **Informações do Domínio**: Se aplicável, dados de DNS
- **Código do Projeto**: Acesso ao repositório ou arquivos do Deriv Analyzer

---

## Configuração Inicial do VPS

### Passo 1: Acesso Inicial ao VPS

Após a criação do VPS na Hostinger, você receberá as credenciais de acesso. Conecte-se ao servidor via SSH:

```bash
ssh root@SEU_IP_DO_VPS
```

Substitua `SEU_IP_DO_VPS` pelo endereço IP real fornecido pela Hostinger. Na primeira conexão, você será solicitado a confirmar a autenticidade do servidor.

### Passo 2: Atualização do Sistema

Sempre inicie com a atualização completa do sistema operacional:

```bash
# Atualiza a lista de pacotes
apt update

# Atualiza todos os pacotes instalados
apt upgrade -y

# Remove pacotes desnecessários
apt autoremove -y

# Limpa cache de pacotes
apt autoclean
```

Este processo pode levar alguns minutos, dependendo da quantidade de atualizações disponíveis.

### Passo 3: Configuração de Usuário Não-Root

Por questões de segurança, é fundamental criar um usuário não-root para operações cotidianas:

```bash
# Cria um novo usuário
adduser derivuser

# Adiciona o usuário ao grupo sudo
usermod -aG sudo derivuser

# Testa o acesso sudo
su - derivuser
sudo whoami
```

### Passo 4: Configuração de SSH

Configure o SSH para maior segurança:

```bash
# Edita a configuração do SSH
sudo nano /etc/ssh/sshd_config
```

Faça as seguintes alterações no arquivo:

```
# Desabilita login root direto
PermitRootLogin no

# Altera a porta padrão (opcional, mas recomendado)
Port 2222

# Desabilita autenticação por senha (se usando chaves SSH)
PasswordAuthentication no

# Permite apenas usuários específicos
AllowUsers derivuser
```

Reinicie o serviço SSH:

```bash
sudo systemctl restart ssh
```

### Passo 5: Configuração de Firewall

Configure o firewall UFW (Uncomplicated Firewall) para proteger o servidor:

```bash
# Habilita o UFW
sudo ufw enable

# Permite SSH na nova porta
sudo ufw allow 2222/tcp

# Permite HTTP e HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Permite a porta da aplicação (se necessário)
sudo ufw allow 5000/tcp

# Verifica o status
sudo ufw status verbose
```

### Passo 6: Configuração de Timezone

Configure o fuso horário correto para o Brasil:

```bash
# Lista fusos horários disponíveis
timedatectl list-timezones | grep America

# Configura para horário de Brasília
sudo timedatectl set-timezone America/Sao_Paulo

# Verifica a configuração
timedatectl status
```

---


## Instalação das Dependências

### Passo 1: Instalação do Python e Pip

O Deriv Analyzer utiliza Python para o backend. Instale o Python 3.11 e ferramentas relacionadas:

```bash
# Atualiza repositórios
sudo apt update

# Instala Python 3.11 e ferramentas
sudo apt install -y python3.11 python3.11-pip python3.11-venv python3.11-dev

# Instala ferramentas de build
sudo apt install -y build-essential

# Verifica a instalação
python3.11 --version
pip3.11 --version
```

### Passo 2: Instalação do Node.js e npm

Para o frontend React, instale o Node.js 20.x:

```bash
# Adiciona o repositório NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Instala Node.js
sudo apt install -y nodejs

# Verifica as versões
node --version
npm --version

# Instala o yarn globalmente (opcional)
sudo npm install -g yarn
```

### Passo 3: Instalação do Nginx

O Nginx será usado como servidor web e proxy reverso:

```bash
# Instala o Nginx
sudo apt install -y nginx

# Inicia e habilita o Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verifica o status
sudo systemctl status nginx
```

### Passo 4: Instalação do Git

Para clonagem do repositório:

```bash
# Instala o Git
sudo apt install -y git

# Configura informações globais (opcional)
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"

# Verifica a instalação
git --version
```

### Passo 5: Instalação de Ferramentas Adicionais

Instale ferramentas úteis para monitoramento e manutenção:

```bash
# Ferramentas de sistema
sudo apt install -y htop tree curl wget unzip

# Ferramentas de rede
sudo apt install -y net-tools

# Editor de texto avançado
sudo apt install -y vim

# Ferramentas de compressão
sudo apt install -y zip unzip
```

### Passo 6: Instalação do Certbot (para SSL)

Para certificados SSL gratuitos via Let's Encrypt:

```bash
# Instala o Certbot
sudo apt install -y certbot python3-certbot-nginx

# Verifica a instalação
certbot --version
```

### Passo 7: Configuração de Limites do Sistema

Configure limites apropriados para a aplicação:

```bash
# Edita os limites do sistema
sudo nano /etc/security/limits.conf
```

Adicione as seguintes linhas ao final do arquivo:

```
# Limites para o usuário da aplicação
derivuser soft nofile 65536
derivuser hard nofile 65536
derivuser soft nproc 32768
derivuser hard nproc 32768
```

### Passo 8: Configuração de Swap (se necessário)

Se o VPS tem pouca RAM, configure um arquivo de swap:

```bash
# Verifica se já existe swap
sudo swapon --show

# Cria arquivo de swap de 2GB
sudo fallocate -l 2G /swapfile

# Define permissões corretas
sudo chmod 600 /swapfile

# Configura como swap
sudo mkswap /swapfile
sudo swapon /swapfile

# Torna permanente
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verifica a configuração
free -h
```

---

## Configuração do Projeto

### Passo 1: Criação da Estrutura de Diretórios

Organize os diretórios do projeto de forma estruturada:

```bash
# Muda para o diretório home do usuário
cd /home/derivuser

# Cria estrutura de diretórios
mkdir -p projects/deriv-analyzer
mkdir -p logs/deriv-analyzer
mkdir -p backups/deriv-analyzer

# Define permissões
sudo chown -R derivuser:derivuser /home/derivuser/projects
sudo chown -R derivuser:derivuser /home/derivuser/logs
sudo chown -R derivuser:derivuser /home/derivuser/backups
```

### Passo 2: Clonagem ou Upload do Projeto

Se você tem o projeto em um repositório Git:

```bash
# Navega para o diretório de projetos
cd /home/derivuser/projects

# Clona o repositório (substitua pela URL real)
git clone https://github.com/seu-usuario/deriv-analyzer.git

# Ou se você tem os arquivos localmente, use scp para upload:
# scp -r -P 2222 /caminho/local/deriv-analyzer derivuser@SEU_IP:/home/derivuser/projects/
```

Se você não tem um repositório, crie a estrutura manualmente e faça upload dos arquivos.

### Passo 3: Configuração do Backend Python

Navegue para o diretório do backend e configure o ambiente virtual:

```bash
# Navega para o diretório do projeto
cd /home/derivuser/projects/deriv-analyzer

# Cria ambiente virtual Python
python3.11 -m venv venv

# Ativa o ambiente virtual
source venv/bin/activate

# Atualiza pip
pip install --upgrade pip

# Instala dependências do backend
pip install flask flask-cors flask-socketio requests sqlite3 python-dotenv
pip install gunicorn eventlet

# Se houver arquivo requirements.txt
# pip install -r requirements.txt
```

### Passo 4: Configuração do Frontend React

Configure e faça build do frontend:

```bash
# Navega para o diretório do frontend
cd /home/derivuser/projects/deriv-analyzer/deriv-analyzer-frontend

# Instala dependências
npm install

# Ou usando yarn
# yarn install

# Configura variáveis de ambiente para produção
echo "VITE_API_BASE_URL=https://seudominio.com/api" > .env.production

# Faz build para produção
npm run build

# Ou usando yarn
# yarn build
```

### Passo 5: Configuração de Variáveis de Ambiente

Crie arquivo de configuração para o backend:

```bash
# Navega para o diretório raiz do projeto
cd /home/derivuser/projects/deriv-analyzer

# Cria arquivo .env
nano .env
```

Adicione as seguintes configurações:

```env
# Configurações da aplicação
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=sua_chave_secreta_muito_segura_aqui

# Configurações do banco de dados
DATABASE_PATH=/home/derivuser/projects/deriv-analyzer/data/deriv_analyzer.db

# Configurações de rede
HOST=0.0.0.0
PORT=5000

# Configurações de CORS
CORS_ORIGINS=https://seudominio.com

# Configurações de logs
LOG_LEVEL=INFO
LOG_FILE=/home/derivuser/logs/deriv-analyzer/app.log

# Configurações específicas da aplicação
DATA_RETENTION_DAYS=30
MAX_CONCURRENT_CONNECTIONS=100
```

### Passo 6: Criação de Diretórios de Dados

Crie os diretórios necessários para dados e logs:

```bash
# Cria diretório de dados
mkdir -p /home/derivuser/projects/deriv-analyzer/data

# Cria diretório de logs
mkdir -p /home/derivuser/logs/deriv-analyzer

# Define permissões
chmod 755 /home/derivuser/projects/deriv-analyzer/data
chmod 755 /home/derivuser/logs/deriv-analyzer
```

---


## Configuração do Banco de Dados

### Passo 1: Inicialização do Banco SQLite

O Deriv Analyzer utiliza SQLite como banco de dados. Configure a estrutura inicial:

```bash
# Navega para o diretório do projeto
cd /home/derivuser/projects/deriv-analyzer

# Ativa o ambiente virtual
source venv/bin/activate

# Cria script de inicialização do banco
nano init_database.py
```

Adicione o seguinte conteúdo ao script:

```python
import sqlite3
import os
from datetime import datetime

def init_database():
    db_path = '/home/derivuser/projects/deriv-analyzer/data/deriv_analyzer.db'
    
    # Garante que o diretório existe
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Tabela de tickets
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            market TEXT NOT NULL,
            timestamp REAL NOT NULL,
            digit INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Tabela de configurações
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Tabela de logs de sistema
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS system_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            level TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Insere configurações padrão
    default_settings = [
        ('data_filter', '1000'),
        ('alerts_enabled', 'true'),
        ('notification_enabled', 'false'),
        ('last_cleanup', str(datetime.now().timestamp()))
    ]
    
    for key, value in default_settings:
        cursor.execute('''
            INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
        ''', (key, value))
    
    conn.commit()
    conn.close()
    print("Banco de dados inicializado com sucesso!")

if __name__ == "__main__":
    init_database()
```

Execute o script de inicialização:

```bash
python init_database.py
```

### Passo 2: Configuração de Backup Automático

Crie script para backup automático do banco:

```bash
# Cria script de backup
nano /home/derivuser/backups/deriv-analyzer/backup_db.sh
```

Adicione o seguinte conteúdo:

```bash
#!/bin/bash

# Configurações
DB_PATH="/home/derivuser/projects/deriv-analyzer/data/deriv_analyzer.db"
BACKUP_DIR="/home/derivuser/backups/deriv-analyzer"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/deriv_analyzer_backup_$DATE.db"

# Cria backup
cp "$DB_PATH" "$BACKUP_FILE"

# Comprime o backup
gzip "$BACKUP_FILE"

# Remove backups antigos (mantém últimos 7 dias)
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete

echo "Backup criado: ${BACKUP_FILE}.gz"
```

Torne o script executável:

```bash
chmod +x /home/derivuser/backups/deriv-analyzer/backup_db.sh
```

---

## Build e Deploy do Frontend

### Passo 1: Configuração Final do Build

Certifique-se de que o frontend está configurado corretamente para produção:

```bash
# Navega para o diretório do frontend
cd /home/derivuser/projects/deriv-analyzer/deriv-analyzer-frontend

# Verifica se o arquivo .env.production existe
cat .env.production

# Se necessário, edite as configurações
nano .env.production
```

Conteúdo do `.env.production`:

```env
VITE_API_BASE_URL=https://seudominio.com/api
VITE_WS_URL=wss://seudominio.com/ws
VITE_APP_TITLE=Deriv Analyzer
VITE_APP_VERSION=1.0.0
```

### Passo 2: Build de Produção

Execute o build otimizado para produção:

```bash
# Limpa builds anteriores
rm -rf dist/

# Executa build de produção
npm run build

# Verifica se o build foi criado
ls -la dist/
```

### Passo 3: Configuração do Nginx para Frontend

Crie a configuração do Nginx para servir o frontend:

```bash
# Remove configuração padrão
sudo rm /etc/nginx/sites-enabled/default

# Cria nova configuração
sudo nano /etc/nginx/sites-available/deriv-analyzer
```

Adicione a seguinte configuração:

```nginx
server {
    listen 80;
    server_name seudominio.com www.seudominio.com;
    
    # Redireciona HTTP para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seudominio.com www.seudominio.com;
    
    # Configurações SSL (serão configuradas posteriormente)
    ssl_certificate /etc/letsencrypt/live/seudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudominio.com/privkey.pem;
    
    # Configurações de segurança SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Headers de segurança
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Diretório raiz do frontend
    root /home/derivuser/projects/deriv-analyzer/deriv-analyzer-frontend/dist;
    index index.html;
    
    # Configuração para SPA (Single Page Application)
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy para API do backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # Proxy para WebSocket
    location /ws/ {
        proxy_pass http://127.0.0.1:5000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Cache para arquivos estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Logs
    access_log /var/log/nginx/deriv-analyzer-access.log;
    error_log /var/log/nginx/deriv-analyzer-error.log;
}
```

### Passo 4: Ativação da Configuração

Ative a configuração do Nginx:

```bash
# Cria link simbólico
sudo ln -s /etc/nginx/sites-available/deriv-analyzer /etc/nginx/sites-enabled/

# Testa a configuração
sudo nginx -t

# Se o teste passou, recarrega o Nginx
sudo systemctl reload nginx
```

---

## Configuração do Backend

### Passo 1: Criação do Script de Inicialização

Crie um script para inicializar o backend com Gunicorn:

```bash
# Navega para o diretório do projeto
cd /home/derivuser/projects/deriv-analyzer

# Cria script de inicialização
nano start_backend.sh
```

Adicione o seguinte conteúdo:

```bash
#!/bin/bash

# Configurações
PROJECT_DIR="/home/derivuser/projects/deriv-analyzer"
VENV_DIR="$PROJECT_DIR/venv"
LOG_DIR="/home/derivuser/logs/deriv-analyzer"

# Ativa ambiente virtual
source "$VENV_DIR/bin/activate"

# Navega para o diretório do projeto
cd "$PROJECT_DIR"

# Inicia aplicação com Gunicorn
exec gunicorn \
    --bind 127.0.0.1:5000 \
    --workers 4 \
    --worker-class eventlet \
    --worker-connections 1000 \
    --timeout 120 \
    --keepalive 5 \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --preload \
    --access-logfile "$LOG_DIR/access.log" \
    --error-logfile "$LOG_DIR/error.log" \
    --log-level info \
    --capture-output \
    app:app
```

Torne o script executável:

```bash
chmod +x start_backend.sh
```

### Passo 2: Configuração do Arquivo Principal da Aplicação

Certifique-se de que o arquivo principal (`app.py`) está configurado corretamente:

```bash
# Verifica se o arquivo app.py existe
ls -la app.py

# Se necessário, crie ou edite o arquivo
nano app.py
```

Exemplo de estrutura básica do `app.py`:

```python
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO
import os
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Inicializa aplicação
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-key-change-in-production')

# Configuração CORS
CORS(app, origins=os.getenv('CORS_ORIGINS', '*').split(','))

# Inicializa SocketIO
socketio = SocketIO(app, cors_allowed_origins=os.getenv('CORS_ORIGINS', '*'))

# Importa rotas
from routes import api_bp
app.register_blueprint(api_bp, url_prefix='/api')

@app.route('/')
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'Deriv Analyzer API is running'
    })

if __name__ == '__main__':
    host = os.getenv('HOST', '127.0.0.1')
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    socketio.run(app, host=host, port=port, debug=debug)
```

### Passo 3: Teste do Backend

Teste se o backend inicia corretamente:

```bash
# Ativa o ambiente virtual
source venv/bin/activate

# Testa a aplicação
python app.py
```

Se tudo estiver funcionando, pare a aplicação (Ctrl+C) e continue com a configuração do serviço.

---


## Configuração de SSL/HTTPS

### Passo 1: Obtenção de Certificado SSL

Use o Certbot para obter certificados SSL gratuitos do Let's Encrypt:

```bash
# Para um domínio específico
sudo certbot --nginx -d seudominio.com -d www.seudominio.com

# Ou para configuração automática
sudo certbot --nginx
```

Durante o processo, você será solicitado a:
- Fornecer um endereço de email para notificações
- Concordar com os termos de serviço
- Escolher se deseja compartilhar seu email com a EFF

### Passo 2: Configuração de Renovação Automática

Configure a renovação automática dos certificados:

```bash
# Testa a renovação
sudo certbot renew --dry-run

# Adiciona tarefa cron para renovação automática
sudo crontab -e
```

Adicione a seguinte linha ao crontab:

```cron
# Renova certificados SSL automaticamente às 2h da manhã
0 2 * * * /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
```

### Passo 3: Configuração de Segurança Adicional

Crie configuração adicional de segurança SSL:

```bash
# Cria arquivo de configuração SSL
sudo nano /etc/nginx/snippets/ssl-params.conf
```

Adicione o seguinte conteúdo:

```nginx
# Configurações SSL modernas
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# HSTS (HTTP Strict Transport Security)
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

# Headers de segurança
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy "strict-origin-when-cross-origin";

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
```

---

## Configuração de Serviços Systemd

### Passo 1: Criação do Serviço para o Backend

Crie um serviço systemd para gerenciar o backend automaticamente:

```bash
# Cria arquivo de serviço
sudo nano /etc/systemd/system/deriv-analyzer.service
```

Adicione o seguinte conteúdo:

```ini
[Unit]
Description=Deriv Analyzer Backend
After=network.target

[Service]
Type=exec
User=derivuser
Group=derivuser
WorkingDirectory=/home/derivuser/projects/deriv-analyzer
Environment=PATH=/home/derivuser/projects/deriv-analyzer/venv/bin
ExecStart=/home/derivuser/projects/deriv-analyzer/start_backend.sh
ExecReload=/bin/kill -s HUP $MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=deriv-analyzer

# Configurações de segurança
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/home/derivuser/projects/deriv-analyzer/data
ReadWritePaths=/home/derivuser/logs/deriv-analyzer

# Limites de recursos
LimitNOFILE=65536
LimitNPROC=32768

[Install]
WantedBy=multi-user.target
```

### Passo 2: Ativação e Inicialização do Serviço

Configure o serviço para iniciar automaticamente:

```bash
# Recarrega configurações do systemd
sudo systemctl daemon-reload

# Habilita o serviço para iniciar no boot
sudo systemctl enable deriv-analyzer

# Inicia o serviço
sudo systemctl start deriv-analyzer

# Verifica o status
sudo systemctl status deriv-analyzer

# Verifica logs em tempo real
sudo journalctl -u deriv-analyzer -f
```

### Passo 3: Criação de Script de Monitoramento

Crie um script para monitorar a saúde da aplicação:

```bash
# Cria script de monitoramento
nano /home/derivuser/scripts/health_check.sh
```

Adicione o seguinte conteúdo:

```bash
#!/bin/bash

# Configurações
API_URL="http://127.0.0.1:5000/"
LOG_FILE="/home/derivuser/logs/deriv-analyzer/health_check.log"
EMAIL="seu@email.com"

# Função para log
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Verifica se a API está respondendo
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL" --max-time 10)

if [ "$response" != "200" ]; then
    log_message "ERRO: API não está respondendo (HTTP $response)"
    
    # Tenta reiniciar o serviço
    sudo systemctl restart deriv-analyzer
    sleep 30
    
    # Verifica novamente
    response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL" --max-time 10)
    
    if [ "$response" != "200" ]; then
        log_message "CRÍTICO: Falha ao reiniciar o serviço"
        # Aqui você pode adicionar notificação por email
        # echo "Deriv Analyzer está fora do ar" | mail -s "Alerta Crítico" "$EMAIL"
    else
        log_message "INFO: Serviço reiniciado com sucesso"
    fi
else
    log_message "INFO: Serviço funcionando normalmente"
fi

# Verifica uso de disco
disk_usage=$(df /home/derivuser/projects/deriv-analyzer/data | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$disk_usage" -gt 80 ]; then
    log_message "AVISO: Uso de disco alto: ${disk_usage}%"
fi

# Verifica tamanho dos logs
log_size=$(du -sm /home/derivuser/logs/deriv-analyzer | cut -f1)
if [ "$log_size" -gt 100 ]; then
    log_message "AVISO: Logs ocupando muito espaço: ${log_size}MB"
fi
```

Torne o script executável:

```bash
chmod +x /home/derivuser/scripts/health_check.sh
```

### Passo 4: Configuração de Cron para Monitoramento

Configure execução automática do monitoramento:

```bash
# Edita crontab do usuário
crontab -e
```

Adicione as seguintes linhas:

```cron
# Monitoramento de saúde a cada 5 minutos
*/5 * * * * /home/derivuser/scripts/health_check.sh

# Backup do banco de dados diário às 3h
0 3 * * * /home/derivuser/backups/deriv-analyzer/backup_db.sh

# Limpeza de logs antigos semanalmente
0 4 * * 0 find /home/derivuser/logs/deriv-analyzer -name "*.log" -mtime +30 -delete
```

---

## Monitoramento e Logs

### Passo 1: Configuração de Rotação de Logs

Configure a rotação automática de logs para evitar que ocupem muito espaço:

```bash
# Cria configuração de logrotate
sudo nano /etc/logrotate.d/deriv-analyzer
```

Adicione o seguinte conteúdo:

```
/home/derivuser/logs/deriv-analyzer/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 derivuser derivuser
    postrotate
        systemctl reload deriv-analyzer
    endscript
}

/var/log/nginx/deriv-analyzer-*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx
    endscript
}
```

### Passo 2: Configuração de Monitoramento com htop

Instale e configure ferramentas de monitoramento:

```bash
# Instala htop se ainda não estiver instalado
sudo apt install -y htop

# Cria script de monitoramento de recursos
nano /home/derivuser/scripts/system_monitor.sh
```

Adicione o seguinte conteúdo:

```bash
#!/bin/bash

LOG_FILE="/home/derivuser/logs/deriv-analyzer/system_monitor.log"

# Função para log
log_metric() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# CPU Usage
cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
log_metric "CPU Usage: ${cpu_usage}%"

# Memory Usage
mem_usage=$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')
log_metric "Memory Usage: ${mem_usage}%"

# Disk Usage
disk_usage=$(df -h /home/derivuser/projects/deriv-analyzer | awk 'NR==2 {print $5}')
log_metric "Disk Usage: $disk_usage"

# Network connections
connections=$(netstat -an | grep :5000 | grep ESTABLISHED | wc -l)
log_metric "Active Connections: $connections"

# Process status
if pgrep -f "gunicorn.*deriv-analyzer" > /dev/null; then
    log_metric "Backend Status: Running"
else
    log_metric "Backend Status: Stopped"
fi
```

### Passo 3: Dashboard de Monitoramento Simples

Crie um script para gerar relatório de status:

```bash
# Cria script de relatório
nano /home/derivuser/scripts/status_report.sh
```

Adicione o seguinte conteúdo:

```bash
#!/bin/bash

echo "=== DERIV ANALYZER STATUS REPORT ==="
echo "Generated at: $(date)"
echo ""

echo "=== SYSTEM INFO ==="
echo "Uptime: $(uptime -p)"
echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')"
echo "Memory Usage: $(free -h | grep Mem | awk '{printf "Used: %s / Total: %s (%.2f%%)", $3, $2, $3/$2*100}')"
echo "Disk Usage: $(df -h /home/derivuser/projects/deriv-analyzer | awk 'NR==2 {printf "%s used of %s (%s)", $3, $2, $5}')"
echo ""

echo "=== SERVICE STATUS ==="
echo "Backend Service: $(systemctl is-active deriv-analyzer)"
echo "Nginx Service: $(systemctl is-active nginx)"
echo "SSL Certificate: $(sudo certbot certificates 2>/dev/null | grep -A1 "Certificate Name" | tail -1 | awk '{print $3}')"
echo ""

echo "=== APPLICATION STATUS ==="
api_status=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:5000/" --max-time 5)
if [ "$api_status" = "200" ]; then
    echo "API Status: ✅ Online"
else
    echo "API Status: ❌ Offline (HTTP $api_status)"
fi

echo "Active Connections: $(netstat -an | grep :5000 | grep ESTABLISHED | wc -l)"
echo "Backend Processes: $(pgrep -f "gunicorn.*deriv-analyzer" | wc -l)"
echo ""

echo "=== RECENT LOGS ==="
echo "Last 5 error entries:"
tail -5 /home/derivuser/logs/deriv-analyzer/error.log 2>/dev/null || echo "No error logs found"
echo ""

echo "=== DISK USAGE ==="
echo "Database size: $(du -h /home/derivuser/projects/deriv-analyzer/data/deriv_analyzer.db 2>/dev/null | cut -f1 || echo 'N/A')"
echo "Log directory size: $(du -sh /home/derivuser/logs/deriv-analyzer 2>/dev/null | cut -f1 || echo 'N/A')"
echo "Backup directory size: $(du -sh /home/derivuser/backups/deriv-analyzer 2>/dev/null | cut -f1 || echo 'N/A')"
```

Torne executável:

```bash
chmod +x /home/derivuser/scripts/status_report.sh
```

---

## Backup e Manutenção

### Passo 1: Script de Backup Completo

Crie um script para backup completo da aplicação:

```bash
# Cria script de backup completo
nano /home/derivuser/backups/deriv-analyzer/full_backup.sh
```

Adicione o seguinte conteúdo:

```bash
#!/bin/bash

# Configurações
BACKUP_DIR="/home/derivuser/backups/deriv-analyzer"
PROJECT_DIR="/home/derivuser/projects/deriv-analyzer"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="full_backup_$DATE"

# Cria diretório de backup
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

echo "Iniciando backup completo..."

# Backup do código fonte
echo "Fazendo backup do código fonte..."
tar -czf "$BACKUP_DIR/$BACKUP_NAME/source_code.tar.gz" \
    --exclude="$PROJECT_DIR/venv" \
    --exclude="$PROJECT_DIR/node_modules" \
    --exclude="$PROJECT_DIR/deriv-analyzer-frontend/node_modules" \
    --exclude="$PROJECT_DIR/deriv-analyzer-frontend/dist" \
    "$PROJECT_DIR"

# Backup do banco de dados
echo "Fazendo backup do banco de dados..."
cp "$PROJECT_DIR/data/deriv_analyzer.db" "$BACKUP_DIR/$BACKUP_NAME/"

# Backup das configurações do sistema
echo "Fazendo backup das configurações..."
mkdir -p "$BACKUP_DIR/$BACKUP_NAME/configs"
sudo cp /etc/nginx/sites-available/deriv-analyzer "$BACKUP_DIR/$BACKUP_NAME/configs/"
sudo cp /etc/systemd/system/deriv-analyzer.service "$BACKUP_DIR/$BACKUP_NAME/configs/"
cp /home/derivuser/.env "$BACKUP_DIR/$BACKUP_NAME/configs/" 2>/dev/null || true

# Backup dos logs recentes
echo "Fazendo backup dos logs..."
mkdir -p "$BACKUP_DIR/$BACKUP_NAME/logs"
cp /home/derivuser/logs/deriv-analyzer/*.log "$BACKUP_DIR/$BACKUP_NAME/logs/" 2>/dev/null || true

# Comprime tudo
echo "Comprimindo backup..."
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_NAME"

# Remove backups antigos (mantém últimos 14 dias)
find "$BACKUP_DIR" -name "full_backup_*.tar.gz" -mtime +14 -delete

echo "Backup completo finalizado: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
```

### Passo 2: Script de Restauração

Crie script para restaurar backups:

```bash
# Cria script de restauração
nano /home/derivuser/backups/deriv-analyzer/restore_backup.sh
```

Adicione o seguinte conteúdo:

```bash
#!/bin/bash

if [ $# -eq 0 ]; then
    echo "Uso: $0 <arquivo_backup.tar.gz>"
    echo "Backups disponíveis:"
    ls -la /home/derivuser/backups/deriv-analyzer/full_backup_*.tar.gz 2>/dev/null || echo "Nenhum backup encontrado"
    exit 1
fi

BACKUP_FILE="$1"
RESTORE_DIR="/tmp/restore_$(date +%s)"
PROJECT_DIR="/home/derivuser/projects/deriv-analyzer"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Erro: Arquivo de backup não encontrado: $BACKUP_FILE"
    exit 1
fi

echo "ATENÇÃO: Esta operação irá substituir os dados atuais!"
read -p "Deseja continuar? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Operação cancelada."
    exit 0
fi

# Para os serviços
echo "Parando serviços..."
sudo systemctl stop deriv-analyzer
sudo systemctl stop nginx

# Extrai backup
echo "Extraindo backup..."
mkdir -p "$RESTORE_DIR"
cd "$RESTORE_DIR"
tar -xzf "$BACKUP_FILE"

# Encontra diretório extraído
BACKUP_CONTENT=$(find . -maxdepth 1 -type d -name "full_backup_*" | head -1)

if [ -z "$BACKUP_CONTENT" ]; then
    echo "Erro: Estrutura de backup inválida"
    exit 1
fi

# Restaura código fonte
echo "Restaurando código fonte..."
cd "$BACKUP_CONTENT"
tar -xzf source_code.tar.gz -C /home/derivuser/projects/

# Restaura banco de dados
echo "Restaurando banco de dados..."
cp deriv_analyzer.db "$PROJECT_DIR/data/"

# Restaura configurações
echo "Restaurando configurações..."
sudo cp configs/deriv-analyzer /etc/nginx/sites-available/
sudo cp configs/deriv-analyzer.service /etc/systemd/system/
cp configs/.env /home/derivuser/ 2>/dev/null || true

# Recarrega configurações
sudo systemctl daemon-reload

# Reinicia serviços
echo "Reiniciando serviços..."
sudo systemctl start nginx
sudo systemctl start deriv-analyzer

# Limpa arquivos temporários
rm -rf "$RESTORE_DIR"

echo "Restauração concluída!"
echo "Verifique o status dos serviços:"
echo "sudo systemctl status deriv-analyzer"
echo "sudo systemctl status nginx"
```

Torne os scripts executáveis:

```bash
chmod +x /home/derivuser/backups/deriv-analyzer/full_backup.sh
chmod +x /home/derivuser/backups/deriv-analyzer/restore_backup.sh
```

---


## Troubleshooting

### Problemas Comuns e Soluções

#### 1. Serviço não inicia

**Sintomas**: O serviço `deriv-analyzer` falha ao iniciar

**Diagnóstico**:
```bash
# Verifica status detalhado
sudo systemctl status deriv-analyzer

# Verifica logs do serviço
sudo journalctl -u deriv-analyzer -n 50

# Verifica logs da aplicação
tail -50 /home/derivuser/logs/deriv-analyzer/error.log
```

**Soluções possíveis**:
- Verificar se o ambiente virtual está correto
- Verificar permissões dos arquivos
- Verificar se todas as dependências estão instaladas
- Verificar configurações do arquivo `.env`

#### 2. Erro 502 Bad Gateway

**Sintomas**: Nginx retorna erro 502 ao acessar a aplicação

**Diagnóstico**:
```bash
# Verifica se o backend está rodando
curl http://127.0.0.1:5000/

# Verifica logs do Nginx
sudo tail -50 /var/log/nginx/deriv-analyzer-error.log

# Verifica configuração do Nginx
sudo nginx -t
```

**Soluções possíveis**:
- Verificar se o backend está rodando na porta correta
- Verificar configuração de proxy no Nginx
- Verificar firewall e portas

#### 3. Certificado SSL não funciona

**Sintomas**: Erro de certificado SSL ou HTTPS não funciona

**Diagnóstico**:
```bash
# Verifica status dos certificados
sudo certbot certificates

# Testa configuração SSL
openssl s_client -connect seudominio.com:443

# Verifica configuração do Nginx
sudo nginx -t
```

**Soluções possíveis**:
- Renovar certificados: `sudo certbot renew`
- Verificar configuração DNS do domínio
- Verificar configuração SSL no Nginx

#### 4. Alto uso de recursos

**Sintomas**: Servidor lento ou com alto uso de CPU/memória

**Diagnóstico**:
```bash
# Monitora recursos em tempo real
htop

# Verifica processos da aplicação
ps aux | grep gunicorn

# Verifica uso de disco
df -h
du -sh /home/derivuser/logs/deriv-analyzer/*
```

**Soluções possíveis**:
- Ajustar número de workers do Gunicorn
- Implementar cache
- Limpar logs antigos
- Otimizar consultas ao banco de dados

#### 5. Banco de dados corrompido

**Sintomas**: Erros relacionados ao SQLite

**Diagnóstico**:
```bash
# Verifica integridade do banco
sqlite3 /home/derivuser/projects/deriv-analyzer/data/deriv_analyzer.db "PRAGMA integrity_check;"

# Verifica permissões
ls -la /home/derivuser/projects/deriv-analyzer/data/
```

**Soluções possíveis**:
- Restaurar backup do banco
- Recriar banco com script de inicialização
- Verificar permissões do diretório de dados

### Comandos Úteis para Diagnóstico

```bash
# Status geral dos serviços
sudo systemctl status deriv-analyzer nginx

# Logs em tempo real
sudo journalctl -u deriv-analyzer -f

# Teste de conectividade
curl -I http://127.0.0.1:5000/
curl -I https://seudominio.com/

# Monitoramento de recursos
htop
iotop
netstat -tulpn | grep :5000

# Verificação de configurações
sudo nginx -t
python -m py_compile /home/derivuser/projects/deriv-analyzer/app.py

# Limpeza de logs
sudo find /var/log/nginx/ -name "*.log" -mtime +7 -delete
find /home/derivuser/logs/deriv-analyzer/ -name "*.log" -mtime +7 -delete
```

### Scripts de Diagnóstico Automático

Crie um script para diagnóstico rápido:

```bash
# Cria script de diagnóstico
nano /home/derivuser/scripts/diagnose.sh
```

Adicione o seguinte conteúdo:

```bash
#!/bin/bash

echo "=== DIAGNÓSTICO DERIV ANALYZER ==="
echo "Executado em: $(date)"
echo ""

echo "=== STATUS DOS SERVIÇOS ==="
echo "Backend: $(systemctl is-active deriv-analyzer)"
echo "Nginx: $(systemctl is-active nginx)"
echo ""

echo "=== CONECTIVIDADE ==="
backend_status=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:5000/" --max-time 5)
echo "Backend local: HTTP $backend_status"

if [ -n "$1" ]; then
    frontend_status=$(curl -s -o /dev/null -w "%{http_code}" "https://$1/" --max-time 10)
    echo "Frontend público: HTTP $frontend_status"
fi
echo ""

echo "=== RECURSOS DO SISTEMA ==="
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')%"
echo "Memória: $(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')"
echo "Disco: $(df -h /home/derivuser/projects/deriv-analyzer | awk 'NR==2 {print $5}')"
echo ""

echo "=== PROCESSOS ==="
echo "Workers Gunicorn: $(pgrep -f "gunicorn.*deriv-analyzer" | wc -l)"
echo "Conexões ativas: $(netstat -an | grep :5000 | grep ESTABLISHED | wc -l)"
echo ""

echo "=== LOGS RECENTES ==="
echo "Últimos erros do backend:"
tail -3 /home/derivuser/logs/deriv-analyzer/error.log 2>/dev/null || echo "Nenhum erro encontrado"
echo ""

echo "Últimos erros do Nginx:"
sudo tail -3 /var/log/nginx/deriv-analyzer-error.log 2>/dev/null || echo "Nenhum erro encontrado"
```

Torne executável:

```bash
chmod +x /home/derivuser/scripts/diagnose.sh
```

---

## Conclusão

### Resumo do Deploy

Parabéns! Você concluiu com sucesso o deploy do Deriv Analyzer no seu VPS da Hostinger. Sua aplicação agora está:

- **Segura**: Configurada com HTTPS, firewall e práticas de segurança
- **Estável**: Gerenciada por systemd com reinicialização automática
- **Monitorada**: Com scripts de monitoramento e alertas
- **Mantida**: Com backups automáticos e rotação de logs
- **Escalável**: Configurada com Gunicorn para múltiplos workers

### Funcionalidades Implementadas

✅ **Frontend React**: Interface moderna e responsiva  
✅ **Backend Flask**: API REST robusta e escalável  
✅ **Banco SQLite**: Armazenamento eficiente de dados  
✅ **Notificações do Navegador**: Alertas em tempo real  
✅ **SSL/HTTPS**: Certificados automáticos Let's Encrypt  
✅ **Proxy Reverso**: Nginx configurado para performance  
✅ **Monitoramento**: Scripts de saúde e diagnóstico  
✅ **Backup**: Sistema automático de backup e restauração  

### Próximos Passos Recomendados

#### 1. Otimizações de Performance

- **Cache Redis**: Implemente cache para consultas frequentes
- **CDN**: Configure um CDN para arquivos estáticos
- **Compressão**: Ative compressão gzip no Nginx
- **Database Indexing**: Otimize índices do banco de dados

#### 2. Monitoramento Avançado

- **Grafana + Prometheus**: Dashboard de métricas avançado
- **Alertas por Email**: Notificações automáticas de problemas
- **Logs Centralizados**: ELK Stack para análise de logs
- **Uptime Monitoring**: Serviços externos de monitoramento

#### 3. Segurança Adicional

- **Fail2ban**: Proteção contra ataques de força bruta
- **WAF**: Web Application Firewall
- **Backup Offsite**: Backups em nuvem
- **Auditoria de Segurança**: Verificações regulares

#### 4. Escalabilidade

- **Load Balancer**: Para múltiplos servidores
- **Database Clustering**: Para alta disponibilidade
- **Auto-scaling**: Ajuste automático de recursos
- **Microserviços**: Divisão da aplicação em serviços menores

### Comandos de Manutenção Diária

```bash
# Verificação rápida de status
/home/derivuser/scripts/status_report.sh

# Diagnóstico completo
/home/derivuser/scripts/diagnose.sh seudominio.com

# Backup manual
/home/derivuser/backups/deriv-analyzer/full_backup.sh

# Verificação de logs
sudo journalctl -u deriv-analyzer --since "1 hour ago"

# Monitoramento de recursos
htop
```

### Contatos e Suporte

Para suporte técnico ou dúvidas sobre este tutorial:

- **Documentação**: Mantenha este tutorial como referência
- **Logs**: Sempre verifique os logs em caso de problemas
- **Comunidade**: Participe de fóruns e comunidades técnicas
- **Backup**: Mantenha sempre backups atualizados

### Considerações Finais

O deploy em VPS oferece controle total sobre sua aplicação, mas também requer responsabilidade na manutenção. Mantenha sempre:

- **Atualizações regulares** do sistema operacional
- **Monitoramento constante** da aplicação
- **Backups frequentes** dos dados importantes
- **Documentação atualizada** das configurações

Sua aplicação Deriv Analyzer está agora pronta para uso em produção, oferecendo análise de mercado em tempo real com notificações avançadas e interface moderna. Aproveite as funcionalidades implementadas e continue evoluindo sua aplicação conforme suas necessidades.

**Sucesso no seu projeto!** 🚀

---

**Autor:** Manus AI  
**Versão:** 1.0  
**Data:** 27 de Junho de 2025  
**Licença:** Este tutorial é fornecido como está, para fins educacionais e de implementação.

