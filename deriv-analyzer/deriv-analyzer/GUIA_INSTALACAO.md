# Guia de Instalação e Uso - Deriv Analyzer

## 📋 Visão Geral

O **Deriv Analyzer** é uma aplicação web completa para análise de tickets da Deriv em tempo real, composta por:

- **Backend (Python/Flask):** Coleta dados via WebSocket e expõe API REST
- **Frontend (React):** Interface interativa com gráficos e visualizações

## 🚀 Instalação

### Pré-requisitos
- Python 3.11+
- Node.js 20+
- pnpm (ou npm)

### 1. Backend (Flask)

```bash
# Navegar para o diretório do backend
cd deriv-analyzer-backend

# Ativar ambiente virtual
source venv/bin/activate

# Instalar dependências (já instaladas)
pip install -r requirements.txt

# Iniciar o servidor
python src/main.py
```

O backend estará disponível em: `http://localhost:5000`

### 2. Frontend (React)

```bash
# Em um novo terminal, navegar para o diretório do frontend
cd deriv-analyzer-frontend

# Instalar dependências (já instaladas)
pnpm install

# Iniciar o servidor de desenvolvimento
pnpm run dev --host
```

O frontend estará disponível em: `http://localhost:5173`

## 🎯 Como Usar

### Interface Principal

1. **Visão Geral dos Mercados:**
   - 5 cards representando os mercados (1HZ10V, 1HZ25V, 1HZ50V, 1HZ75V, 1HZ100V)
   - Cada card mostra: taxa de acerto, entradas, wins, losses
   - Indicador de conexão em tempo real

2. **Análise Detalhada:**
   - Clique em qualquer card de mercado para ver análise completa
   - 4 abas disponíveis:
     - **Visão Geral:** Gráficos de barras e pizza
     - **Por Grupos:** Análise por tamanho de grupo (3-11 dígitos)
     - **Por Tipos:** Separado por Geral, Pares, Ímpares
     - **Performance:** Sequências máximas e estatísticas gerais

### Funcionalidades

- ✅ **Atualização Automática:** Dados atualizados a cada 10 segundos
- ✅ **Botão Manual:** Atualização sob demanda
- ✅ **Gráficos Interativos:** Visualizações com Recharts
- ✅ **Interface Responsiva:** Funciona em desktop e mobile
- ✅ **Status em Tempo Real:** Indicadores de conexão WebSocket

## 📊 Dados Analisados

### Estratégia de Análise
- **Grupos:** Análise de sequências de 3 a 11 dígitos
- **Tipos:** Classificação em Geral, Pares, Ímpares
- **Métricas:** Taxa de acerto, wins, losses, sequências máximas

### Mercados Monitorados
- 1HZ10V (Volatility 10 Index)
- 1HZ25V (Volatility 25 Index)
- 1HZ50V (Volatility 50 Index)
- 1HZ75V (Volatility 75 Index)
- 1HZ100V (Volatility 100 Index)

## 🔧 Configuração Avançada

### Backend (src/deriv_analyzer.py)
```python
# Configurações principais
MARKETS = ["1HZ10V", "1HZ25V", "1HZ50V", "1HZ75V", "1HZ100V"]
TICK_LIMIT = 300  # Máximo de ticks armazenados
ANALYZE_DIGITS_RANGE = range(3, 12)  # Grupos de 3 a 11 dígitos
```

### Frontend (src/App.jsx)
```javascript
// URL da API (ajustar se necessário)
const API_BASE_URL = 'http://localhost:5000/api'

// Intervalo de atualização (10 segundos)
const interval = setInterval(fetchData, 10000)
```

## 📡 API Endpoints

### GET /api/data
Retorna todos os dados de análise de todos os mercados.

### GET /api/status  
Retorna status das conexões WebSocket.

### GET /api/market/{market_name}
Retorna dados específicos de um mercado.

## 🛠️ Solução de Problemas

### Backend não conecta aos WebSockets
- Verifique a conexão com internet
- Confirme se as URLs dos WebSockets estão acessíveis

### Frontend não carrega dados
- Verifique se o backend está rodando na porta 5000
- Confirme se não há bloqueio de CORS

### Dados não atualizam
- Verifique os logs do backend para erros de WebSocket
- Confirme se a API está respondendo em /api/status

## 📁 Estrutura do Projeto

```
deriv-analyzer/
├── deriv-analyzer-backend/
│   ├── src/
│   │   ├── deriv_analyzer.py    # Lógica principal
│   │   ├── main.py              # Servidor Flask
│   │   └── routes/
│   │       └── api.py           # Rotas da API
│   └── requirements.txt
└── deriv-analyzer-frontend/
    ├── src/
    │   ├── App.jsx              # Componente principal
    │   ├── App.css              # Estilos
    │   └── components/ui/       # Componentes UI
    └── package.json
```

## 🎨 Tecnologias Utilizadas

### Backend
- **Flask:** Framework web
- **WebSocket-client:** Conexão com Deriv API
- **Flask-CORS:** Suporte a CORS

### Frontend  
- **React:** Framework de interface
- **Tailwind CSS:** Estilização
- **Recharts:** Gráficos interativos
- **shadcn/ui:** Componentes UI
- **Lucide React:** Ícones

## 📈 Próximos Passos

Para melhorias futuras, considere:

1. **Persistência de dados:** Salvar histórico em banco de dados
2. **Alertas:** Notificações para padrões específicos
3. **Exportação:** Download de relatórios em PDF/Excel
4. **Configurações:** Interface para ajustar parâmetros
5. **Deploy:** Hospedagem em produção

---

**Desenvolvido com ❤️ para análise profissional de tickets da Deriv**

