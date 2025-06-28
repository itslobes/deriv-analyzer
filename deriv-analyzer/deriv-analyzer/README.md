# Análise de Tickets Deriv - Interface Interativa

## Objetivo
Criar uma interface web interativa e visualmente atraente para a análise dos tickets da Deriv, utilizando os dados processados pelo script Python fornecido.

## Visão Geral do Projeto
O projeto será dividido em duas partes principais:
1.  **Backend (Python/Flask):** Responsável por processar os ticks em tempo real (mantendo a lógica existente) e expor os dados analisados através de uma API REST.
2.  **Frontend (React):** Responsável por consumir os dados da API, renderizar gráficos interativos e exibir as estatísticas de forma clara e intuitiva.

## Planejamento da Interface (Frontend)

### Elementos Principais
- **Header:** Título da aplicação e talvez um indicador de status da conexão.
- **Cards de Mercado:** Um card para cada mercado (`1HZ10V`, `1HZ25V`, etc.), exibindo um resumo das estatísticas gerais (taxa de acerto, total de entradas, etc.) e um mini-gráfico de barras ou pizza.
- **Detalhes do Mercado:** Ao clicar em um card de mercado, uma seção expandida ou uma nova página será exibida, mostrando estatísticas detalhadas para cada `group_len` e tipo (`geral`, `pares`, `impares`), com gráficos mais elaborados.
- **Atualização em Tempo Real:** Os dados nos cards e gráficos serão atualizados automaticamente a cada 60 segundos (ou conforme configurado no backend).

### Gráficos Sugeridos
- **Gráfico de Barras:** Para comparar `wins` e `losses` ou `taxa de acerto` entre diferentes `group_len` e tipos.
- **Gráfico de Pizza/Donut:** Para visualizar a proporção de `wins` vs `losses` para uma estratégia específica.
- **Tabelas:** Para exibir os dados brutos e as sequências máximas de `win` e `loss` de forma tabular.

### Layout Sugerido
- **Página Principal:** Uma grade de cards, onde cada card representa um mercado.
- **Página de Detalhes (por Mercado):** Dividida em seções para cada `group_len`, com subseções para `geral`, `pares` e `impares`.

## Modificações no Script Python (Backend)

### Objetivo
Transformar o script atual em um servidor Flask que:
1.  Mantenha a lógica de conexão WebSocket e processamento de ticks.
2.  Armazene os `results` em uma estrutura de dados acessível globalmente (ou por um singleton).
3.  Exponha um endpoint `/api/data` que retorne os `results` em formato JSON.

### Passos
1.  **Instalar Flask:** Adicionar `Flask` às dependências.
2.  **Inicializar Flask App:** Criar uma instância do Flask app.
3.  **Endpoint da API:** Criar uma rota `/api/data` que retorne o dicionário `results` como JSON.
4.  **Execução do Flask:** Rodar o Flask app em uma thread separada ou em conjunto com o loop principal do WebSocket.
5.  **Sincronização:** Garantir que o acesso ao dicionário `results` seja thread-safe, se necessário (embora `defaultdict` e `deque` sejam geralmente seguros para append/read, modificações complexas podem exigir locks).

## Próximos Passos
1.  Implementar as modificações no script Python para criar a API REST.
2.  Configurar o ambiente para o desenvolvimento do frontend React.
3.  Desenvolver o frontend para consumir a API e exibir os dados.


