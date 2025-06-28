import websocket
import threading
import json
import time
from collections import deque, defaultdict
from flask import Flask, jsonify
from flask_cors import CORS

# === CONFIGURAÇÃO ===
MARKETS = ["1HZ10V", "1HZ25V", "1HZ50V", "1HZ75V", "1HZ100V"]
TICK_LIMIT = 300
ANALYZE_DIGITS_RANGE = range(3, 16)  # de 3 a 15
WS_URL = "wss://ws.binaryws.com/websockets/v3?app_id=82681"
RECONNECT_DELAY = 5  # segundos para tentar reconectar
MAX_RECONNECT_ATTEMPTS = 100  # máximo de tentativas de reconexão

# === Armazena histórico de ticks por mercado ===
tick_queues = {market: deque(maxlen=TICK_LIMIT) for market in MARKETS}

# === Estatísticas por mercado e tamanho de grupo ===
results = defaultdict(lambda: defaultdict(lambda: {
    "geral": {"wins": 0, "losses": 0, "entradas": 0, "seq_win": 0, "seq_loss": 0, "max_win": 0, "max_loss": 0},
    "pares": {"wins": 0, "losses": 0, "entradas": 0, "seq_win": 0, "seq_loss": 0, "max_win": 0, "max_loss": 0},
    "impares": {"wins": 0, "losses": 0, "entradas": 0, "seq_win": 0, "seq_loss": 0, "max_win": 0, "max_loss": 0},
}))

# === Status da conexão e controle de reconexão ===
connection_status = {market: False for market in MARKETS}
reconnect_attempts = {market: 0 for market in MARKETS}
last_tick_time = {market: time.time() for market in MARKETS}
ws_instances = {market: None for market in MARKETS}

def get_last_digit(price):
    try:
        return int(str(price).split(".")[1][1])
    except:
        return 0

def is_all_even(seq):
    return all(d % 2 == 0 for d in seq)

def is_all_odd(seq):
    return all(d % 2 == 1 for d in seq)

def has_consecutive_repeats(seq):
    return any(seq[i] == seq[i+1] for i in range(len(seq)-1))

def update_result(market, group_len, tipo, result):
    entry = results[market][group_len][tipo]
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

def simulate_strategy(market):
    digits = [get_last_digit(p) for p in tick_queues[market]]
    for group_len in ANALYZE_DIGITS_RANGE:
        if len(digits) < group_len + 1:
            continue
        grupo = digits[-(group_len+1):-1]
        next_digit = digits[-1]

        if has_consecutive_repeats(grupo):
            continue

        if is_all_even(grupo):
            result = "loss" if next_digit % 2 == 0 else "win"
            update_result(market, group_len, "geral", result)
            update_result(market, group_len, "pares", result)
        elif is_all_odd(grupo):
            result = "loss" if next_digit % 2 == 1 else "win"
            update_result(market, group_len, "geral", result)
            update_result(market, group_len, "impares", result)

def on_message(ws, message, market):
    data = json.loads(message)
    if "tick" in data:
        tick = float(data["tick"]["quote"])
        tick_queues[market].append(tick)
        last_tick_time[market] = time.time()  # Atualiza o tempo do último tick
        reconnect_attempts[market] = 0  # Reset tentativas de reconexão
        simulate_strategy(market)

def on_open(ws, market):
    connection_status[market] = True
    reconnect_attempts[market] = 0
    print(f"[Conectado] {market}")

def on_close(ws, code, msg, market):
    connection_status[market] = False
    print(f"[Desconectado] {market} - Código: {code}, Mensagem: {msg}")
    # Agenda reconexão automática
    schedule_reconnect(market)

def on_error(ws, err, market):
    connection_status[market] = False
    print(f"[Erro] {market}: {err}")
    # Agenda reconexão automática
    schedule_reconnect(market)

def schedule_reconnect(market):
    """Agenda uma tentativa de reconexão para o mercado"""
    if reconnect_attempts[market] < MAX_RECONNECT_ATTEMPTS:
        reconnect_attempts[market] += 1
        print(f"[Reconexão] Tentativa {reconnect_attempts[market]}/{MAX_RECONNECT_ATTEMPTS} para {market} em {RECONNECT_DELAY}s")
        
        def reconnect():
            time.sleep(RECONNECT_DELAY)
            if not connection_status[market]:  # Só reconecta se ainda estiver desconectado
                print(f"[Reconectando] {market}")
                start_market_connection(market)
        
        # Executa reconexão em thread separada
        threading.Thread(target=reconnect, daemon=True).start()
    else:
        print(f"[Reconexão] Máximo de tentativas atingido para {market}")

def start_market_connection(market):
    """Inicia conexão WebSocket para um mercado específico"""
    try:
        # Fecha conexão anterior se existir
        if ws_instances[market]:
            ws_instances[market].close()
        
        def _on_message(ws, msg): return on_message(ws, msg, market)
        def _on_open(ws): return on_open(ws, market)
        def _on_close(ws, code, msg): return on_close(ws, code, msg, market)
        def _on_error(ws, err): return on_error(ws, err, market)

        ws = websocket.WebSocketApp(
            WS_URL,
            on_message=_on_message,
            on_open=_on_open,
            on_error=_on_error,
            on_close=_on_close,
        )
        
        def on_open_send(ws):
            ws.send(json.dumps({"ticks": market, "subscribe": 1}))
            connection_status[market] = True
        
        ws.on_open = on_open_send
        ws_instances[market] = ws
        
        # Executa em thread separada
        threading.Thread(target=ws.run_forever, daemon=True).start()
        
    except Exception as e:
        print(f"[Erro ao conectar] {market}: {e}")
        connection_status[market] = False
        schedule_reconnect(market)

def monitor_connections():
    """Monitora conexões e detecta problemas de conectividade"""
    while True:
        current_time = time.time()
        for market in MARKETS:
            # Verifica se não recebeu ticks há mais de 30 segundos
            if connection_status[market] and (current_time - last_tick_time[market]) > 30:
                print(f"[Monitor] {market} sem ticks há {current_time - last_tick_time[market]:.0f}s - Reconectando")
                connection_status[market] = False
                schedule_reconnect(market)
        
        time.sleep(10)  # Verifica a cada 10 segundos

def run_ws_client(market):
    """Função legada - agora usa start_market_connection"""
    start_market_connection(market)

def get_formatted_results():
    """Retorna os resultados formatados para a API"""
    formatted_data = {}
    
    for market in MARKETS:
        formatted_data[market] = {
            "connected": connection_status[market],
            "total_ticks": len(tick_queues[market]),
            "groups": {}
        }
        
        for group_len in ANALYZE_DIGITS_RANGE:
            formatted_data[market]["groups"][str(group_len)] = {}
            
            for tipo in ["geral", "pares", "impares"]:
                entry = results[market][group_len][tipo]
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

def start_websocket_threads():
    """Inicia as threads dos WebSockets"""
    threads = [threading.Thread(target=run_ws_client, args=(market,), daemon=True) for market in MARKETS]
    for t in threads:
        t.start()
    return threads

