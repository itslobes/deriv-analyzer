import websocket
import threading
import json
import time
from collections import deque, defaultdict

# === CONFIGURAÇÃO ===
MARKETS = ["1HZ10V", "1HZ25V", "1HZ50V", "1HZ75V", "1HZ100V"]
TICK_LIMIT = 10000
ANALYZE_DIGITS_RANGE = range(3, 16)  # de 3 a 15
WS_URL = "wss://ws.binaryws.com/websockets/v3?app_id=82681"
RECONNECT_DELAY = 5  # segundos para tentar reconectar
MAX_RECONNECT_ATTEMPTS = 100  # máximo de tentativas de reconexão

class WebSocketController:
    def __init__(self):
        # === Armazena histórico de ticks por mercado ===
        self.tick_queues = {market: deque(maxlen=TICK_LIMIT) for market in MARKETS}
        
        # === Estatísticas por mercado e tamanho de grupo ===
        self.results = defaultdict(lambda: defaultdict(lambda: {
            "geral": {"wins": 0, "losses": 0, "entradas": 0, "seq_win": 0, "seq_loss": 0, "max_win": 0, "max_loss": 0},
            "pares": {"wins": 0, "losses": 0, "entradas": 0, "seq_win": 0, "seq_loss": 0, "max_win": 0, "max_loss": 0},
            "impares": {"wins": 0, "losses": 0, "entradas": 0, "seq_win": 0, "seq_loss": 0, "max_win": 0, "max_loss": 0},
        }))
        
        # === Status da conexão e controle de reconexão ===
        self.connection_status = {market: False for market in MARKETS}
        self.reconnect_attempts = {market: 0 for market in MARKETS}
        self.last_tick_time = {market: time.time() for market in MARKETS}
        self.ws_instances = {market: None for market in MARKETS}
        
        # === Controle de estado ===
        self.is_running = False
        self.websockets = {}
        self.threads = {}
        self.monitor_thread = None
        
        # === Histórico de tickets recebidos ===
        self.recent_tickets = deque(maxlen=100)  # Últimos 100 tickets para exibição em tempo real
        
        # === Filtros de dados ===
        self.data_filter = 1000  # Padrão: últimos 1000 tickets
        
    def get_last_digit(self, price):
        try:
            return int(str(price).split(".")[1][1])
        except:
            return 0

    def is_all_even(self, seq):
        return all(d % 2 == 0 for d in seq)

    def is_all_odd(self, seq):
        return all(d % 2 == 1 for d in seq)

    def has_consecutive_repeats(self, seq):
        return any(seq[i] == seq[i+1] for i in range(len(seq)-1))

    def update_result(self, market, group_len, tipo, result):
        entry = self.results[market][group_len][tipo]
        entry["entradas"] += 1
        if result == "win":
            entry["wins"] += 1
            entry["seq_win"] += 1
            entry["seq_loss"] = 0
        else:
            entry["losses"] += 1
            entry["seq_loss"] += 1
            entry["seq_win"] = 0
        entry["max_win"] = max(entry["max_win"], entry["seq_win"])
        entry["max_loss"] = max(entry["max_loss"], entry["seq_loss"])

    def simulate_strategy(self, market):
        digits = [self.get_last_digit(p) for p in self.tick_queues[market]]
        for group_len in ANALYZE_DIGITS_RANGE:
            if len(digits) < group_len + 1:
                continue
            grupo = digits[-(group_len+1):-1]
            next_digit = digits[-1]

            if self.has_consecutive_repeats(grupo):
                continue

            if self.is_all_even(grupo):
                result = "loss" if next_digit % 2 == 0 else "win"
                self.update_result(market, group_len, "geral", result)
                self.update_result(market, group_len, "pares", result)
            elif self.is_all_odd(grupo):
                result = "loss" if next_digit % 2 == 1 else "win"
                self.update_result(market, group_len, "geral", result)
                self.update_result(market, group_len, "impares", result)

    def on_message(self, ws, message, market):
        data = json.loads(message)
        if "tick" in data:
            tick = float(data["tick"]["quote"])
            self.tick_queues[market].append(tick)
            self.last_tick_time[market] = time.time()  # Atualiza o tempo do último tick
            self.reconnect_attempts[market] = 0  # Reset tentativas de reconexão
            
            # Adiciona ao histórico de tickets recentes
            self.recent_tickets.append({
                "market": market,
                "tick": tick,
                "timestamp": time.time(),
                "digit": self.get_last_digit(tick)
            })
            
            self.simulate_strategy(market)

    def on_open(self, ws, market):
        self.connection_status[market] = True
        self.reconnect_attempts[market] = 0
        print(f"[Conectado] {market}")

    def on_close(self, ws, code, msg, market):
        self.connection_status[market] = False
        print(f"[Desconectado] {market} - Código: {code}, Mensagem: {msg}")
        # Agenda reconexão automática se ainda estiver rodando
        if self.is_running:
            self.schedule_reconnect(market)

    def on_error(self, ws, err, market):
        self.connection_status[market] = False
        print(f"[Erro] {market}: {err}")
        # Agenda reconexão automática se ainda estiver rodando
        if self.is_running:
            self.schedule_reconnect(market)

    def schedule_reconnect(self, market):
        """Agenda uma tentativa de reconexão para o mercado"""
        if self.reconnect_attempts[market] < MAX_RECONNECT_ATTEMPTS and self.is_running:
            self.reconnect_attempts[market] += 1
            print(f"[Reconexão] Tentativa {self.reconnect_attempts[market]}/{MAX_RECONNECT_ATTEMPTS} para {market} em {RECONNECT_DELAY}s")
            
            def reconnect():
                time.sleep(RECONNECT_DELAY)
                if not self.connection_status[market] and self.is_running:  # Só reconecta se ainda estiver desconectado e rodando
                    print(f"[Reconectando] {market}")
                    self.start_market_connection(market)
            
            # Executa reconexão em thread separada
            threading.Thread(target=reconnect, daemon=True).start()
        else:
            if self.reconnect_attempts[market] >= MAX_RECONNECT_ATTEMPTS:
                print(f"[Reconexão] Máximo de tentativas atingido para {market}")

    def start_market_connection(self, market):
        """Inicia conexão WebSocket para um mercado específico"""
        try:
            # Fecha conexão anterior se existir
            if self.ws_instances[market]:
                self.ws_instances[market].close()
            
            def _on_message(ws, msg): return self.on_message(ws, msg, market)
            def _on_open(ws): return self.on_open(ws, market)
            def _on_close(ws, code, msg): return self.on_close(ws, code, msg, market)
            def _on_error(ws, err): return self.on_error(ws, err, market)

            ws = websocket.WebSocketApp(
                WS_URL,
                on_message=_on_message,
                on_open=_on_open,
                on_error=_on_error,
                on_close=_on_close,
            )
            
            def on_open_send(ws):
                ws.send(json.dumps({"ticks": market, "subscribe": 1}))
                self.connection_status[market] = True
            
            ws.on_open = on_open_send
            self.ws_instances[market] = ws
            self.websockets[market] = ws
            
            # Executa em thread separada
            thread = threading.Thread(target=ws.run_forever, daemon=True)
            thread.start()
            self.threads[market] = thread
            
        except Exception as e:
            print(f"[Erro ao conectar] {market}: {e}")
            self.connection_status[market] = False
            if self.is_running:
                self.schedule_reconnect(market)

    def monitor_connections(self):
        """Monitora conexões e detecta problemas de conectividade"""
        while self.is_running:
            current_time = time.time()
            for market in MARKETS:
                # Verifica se não recebeu ticks há mais de 30 segundos
                if self.connection_status[market] and (current_time - self.last_tick_time[market]) > 30:
                    print(f"[Monitor] {market} sem ticks há {current_time - self.last_tick_time[market]:.0f}s - Reconectando")
                    self.connection_status[market] = False
                    self.schedule_reconnect(market)
            
            time.sleep(10)  # Verifica a cada 10 segundos

    def run_ws_client(self, market):
        """Função legada - agora usa start_market_connection"""
        self.start_market_connection(market)

    def start_collection(self):
        """Inicia a coleta de dados"""
        if self.is_running:
            return {"success": False, "message": "Coleta já está em execução"}
        
        self.is_running = True
        
        # Reset tentativas de reconexão
        self.reconnect_attempts = {market: 0 for market in MARKETS}
        self.last_tick_time = {market: time.time() for market in MARKETS}
        
        # Inicia as conexões dos WebSockets
        for market in MARKETS:
            self.start_market_connection(market)
        
        # Inicia o monitor de conexões
        if not self.monitor_thread or not self.monitor_thread.is_alive():
            self.monitor_thread = threading.Thread(target=self.monitor_connections, daemon=True)
            self.monitor_thread.start()
        
        print("Coleta de dados iniciada com reconexão automática")
        return {"success": True, "message": "Coleta de dados iniciada"}

    def stop_collection(self):
        """Para a coleta de dados"""
        if not self.is_running:
            return {"success": False, "message": "Coleta não está em execução"}
        
        self.is_running = False
        
        # Fecha as conexões WebSocket
        for market in MARKETS:
            if self.ws_instances[market]:
                self.ws_instances[market].close()
                self.ws_instances[market] = None
        
        # Limpa os websockets e threads
        self.websockets.clear()
        self.threads.clear()
        
        # Atualiza status de conexão
        for market in MARKETS:
            self.connection_status[market] = False
        
        print("Coleta de dados parada")
        return {"success": True, "message": "Coleta de dados parada"}

    def reset_data(self):
        """Reseta todos os dados coletados"""
        self.tick_queues = {market: deque(maxlen=TICK_LIMIT) for market in MARKETS}
        self.results = defaultdict(lambda: defaultdict(lambda: {
            "geral": {"wins": 0, "losses": 0, "entradas": 0, "seq_win": 0, "seq_loss": 0, "max_win": 0, "max_loss": 0},
            "pares": {"wins": 0, "losses": 0, "entradas": 0, "seq_win": 0, "seq_loss": 0, "max_win": 0, "max_loss": 0},
            "impares": {"wins": 0, "losses": 0, "entradas": 0, "seq_win": 0, "seq_loss": 0, "max_win": 0, "max_loss": 0},
        }))
        self.recent_tickets.clear()
        return {"success": True, "message": "Dados resetados"}

    def set_data_filter(self, filter_value):
        """Define o filtro de dados (quantidade de tickets a considerar)"""
        if filter_value in [25, 50, 100, 500, 1000, 3000, "sem_filtro"]:
            self.data_filter = filter_value
            return {"success": True, "message": f"Filtro definido para {filter_value} tickets"}
        return {"success": False, "message": "Valor de filtro inválido"}

    def get_filtered_results(self):
        """Retorna os resultados filtrados baseado no filtro atual"""
        if self.data_filter == "sem_filtro":
            return self.get_formatted_results()
        
        # Aplica filtro baseado na quantidade de tickets
        filtered_data = {}
        
        for market in MARKETS:
            filtered_data[market] = {
                "connected": self.connection_status[market],
                "total_ticks": len(self.tick_queues[market]),
                "groups": {}
            }
            
            # Pega apenas os últimos N tickets para análise
            if len(self.tick_queues[market]) > 0:
                filter_limit = min(self.data_filter, len(self.tick_queues[market]))
                filtered_ticks = list(self.tick_queues[market])[-filter_limit:]
                
                # Recalcula estatísticas apenas para os tickets filtrados
                filtered_results = self._calculate_filtered_stats(market, filtered_ticks)
                filtered_data[market]["groups"] = filtered_results
            else:
                # Se não há dados, retorna estrutura vazia
                for group_len in ANALYZE_DIGITS_RANGE:
                    filtered_data[market]["groups"][str(group_len)] = {}
                    for tipo in ["geral", "pares", "impares"]:
                        filtered_data[market]["groups"][str(group_len)][tipo] = {
                            "wins": 0,
                            "losses": 0,
                            "entradas": 0,
                            "taxa_acerto": 0,
                            "seq_win_atual": 0,
                            "seq_loss_atual": 0,
                            "max_win": 0,
                            "max_loss": 0
                        }
        
        return filtered_data

    def _calculate_filtered_stats(self, market, filtered_ticks):
        """Calcula estatísticas para tickets filtrados"""
        # Inicializa resultados temporários
        temp_results = defaultdict(lambda: {
            "geral": {"wins": 0, "losses": 0, "entradas": 0, "seq_win": 0, "seq_loss": 0, "max_win": 0, "max_loss": 0},
            "pares": {"wins": 0, "losses": 0, "entradas": 0, "seq_win": 0, "seq_loss": 0, "max_win": 0, "max_loss": 0},
            "impares": {"wins": 0, "losses": 0, "entradas": 0, "seq_win": 0, "seq_loss": 0, "max_win": 0, "max_loss": 0},
        })
        
        # Converte ticks para dígitos
        digits = [self.get_last_digit(p) for p in filtered_ticks]
        
        # Simula estratégia para os dados filtrados
        for group_len in ANALYZE_DIGITS_RANGE:
            for i in range(group_len, len(digits)):
                grupo = digits[i-group_len:i]
                next_digit = digits[i]

                if self.has_consecutive_repeats(grupo):
                    continue

                if self.is_all_even(grupo):
                    result = "loss" if next_digit % 2 == 0 else "win"
                    self._update_temp_result(temp_results, group_len, "geral", result)
                    self._update_temp_result(temp_results, group_len, "pares", result)
                elif self.is_all_odd(grupo):
                    result = "loss" if next_digit % 2 == 1 else "win"
                    self._update_temp_result(temp_results, group_len, "geral", result)
                    self._update_temp_result(temp_results, group_len, "impares", result)
        
        # Formata resultados
        formatted_groups = {}
        for group_len in ANALYZE_DIGITS_RANGE:
            formatted_groups[str(group_len)] = {}
            for tipo in ["geral", "pares", "impares"]:
                entry = temp_results[group_len][tipo]
                if entry["entradas"] > 0:
                    taxa = (entry["wins"] / entry["entradas"]) * 100
                    formatted_groups[str(group_len)][tipo] = {
                        "wins": entry["wins"],
                        "losses": entry["losses"],
                        "entradas": entry["entradas"],
                        "taxa_acerto": round(taxa, 2),
                        "seq_win_atual": entry["seq_win"],
                        "seq_loss_atual": entry["seq_loss"],
                        "max_win": entry["max_win"],
                        "max_loss": entry["max_loss"]
                    }
                else:
                    formatted_groups[str(group_len)][tipo] = {
                        "wins": 0,
                        "losses": 0,
                        "entradas": 0,
                        "taxa_acerto": 0,
                        "seq_win_atual": 0,
                        "seq_loss_atual": 0,
                        "max_win": 0,
                        "max_loss": 0
                    }
        
        return formatted_groups

    def _update_temp_result(self, temp_results, group_len, tipo, result):
        """Atualiza resultados temporários para cálculo filtrado"""
        entry = temp_results[group_len][tipo]
        entry["entradas"] += 1
        if result == "win":
            entry["wins"] += 1
            entry["seq_win"] += 1
            entry["seq_loss"] = 0
        else:
            entry["losses"] += 1
            entry["seq_loss"] += 1
            entry["seq_win"] = 0
        entry["max_win"] = max(entry["max_win"], entry["seq_win"])
        entry["max_loss"] = max(entry["max_loss"], entry["seq_loss"])

    def get_formatted_results(self):
        """Retorna os resultados formatados para a API"""
        formatted_data = {}
        
        for market in MARKETS:
            formatted_data[market] = {
                "connected": self.connection_status[market],
                "total_ticks": len(self.tick_queues[market]),
                "groups": {}
            }
            
            for group_len in ANALYZE_DIGITS_RANGE:
                formatted_data[market]["groups"][str(group_len)] = {}
                
                for tipo in ["geral", "pares", "impares"]:
                    entry = self.results[market][group_len][tipo]
                    if entry["entradas"] > 0:
                        taxa = (entry["wins"] / entry["entradas"]) * 100
                        formatted_data[market]["groups"][str(group_len)][tipo] = {
                            "wins": entry["wins"],
                            "losses": entry["losses"],
                            "entradas": entry["entradas"],
                            "taxa_acerto": round(taxa, 2),
                            "seq_win_atual": entry["seq_win"],
                            "seq_loss_atual": entry["seq_loss"],
                            "max_win": entry["max_win"],
                            "max_loss": entry["max_loss"]
                        }
                    else:
                        formatted_data[market]["groups"][str(group_len)][tipo] = {
                            "wins": 0,
                            "losses": 0,
                            "entradas": 0,
                            "taxa_acerto": 0,
                            "seq_win_atual": 0,
                            "seq_loss_atual": 0,
                            "max_win": 0,
                            "max_loss": 0
                        }
        
        return formatted_data

    def get_recent_tickets(self):
        """Retorna os tickets recentes para exibição em tempo real"""
        return list(self.recent_tickets)

    def get_status(self):
        """Retorna o status atual do sistema"""
        return {
            "is_running": self.is_running,
            "connections": self.connection_status,
            "total_tickets": sum(len(queue) for queue in self.tick_queues.values()),
            "recent_tickets_count": len(self.recent_tickets),
            "data_filter": self.data_filter
        }

# Instância global do controlador
websocket_controller = WebSocketController()

