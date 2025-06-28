from flask import Blueprint, jsonify, request
import time
from src.websocket_controller import websocket_controller

api_bp = Blueprint('api', __name__)

@api_bp.route('/data', methods=['GET'])
def get_data():
    """Endpoint para obter todos os dados de análise"""
    try:
        data = websocket_controller.get_filtered_results()
        return jsonify({
            "success": True,
            "data": data,
            "timestamp": int(time.time())
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@api_bp.route('/status', methods=['GET'])
def get_status():
    """Endpoint para verificar o status das conexões"""
    try:
        status = websocket_controller.get_status()
        return jsonify({
            "success": True,
            **status
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@api_bp.route('/start', methods=['POST'])
def start_collection():
    """Endpoint para iniciar a coleta de dados"""
    try:
        result = websocket_controller.start_collection()
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@api_bp.route('/stop', methods=['POST'])
def stop_collection():
    """Endpoint para parar a coleta de dados"""
    try:
        result = websocket_controller.stop_collection()
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@api_bp.route('/reset', methods=['POST'])
def reset_data():
    """Endpoint para resetar todos os dados"""
    try:
        result = websocket_controller.reset_data()
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@api_bp.route('/filter', methods=['POST'])
def set_filter():
    """Endpoint para definir o filtro de dados"""
    try:
        data = request.get_json()
        filter_value = data.get('filter', 1000)
        result = websocket_controller.set_data_filter(filter_value)
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@api_bp.route('/recent-tickets', methods=['GET'])
def get_recent_tickets():
    """Endpoint para obter tickets recentes"""
    try:
        tickets = websocket_controller.get_recent_tickets()
        return jsonify({
            "success": True,
            "tickets": tickets,
            "count": len(tickets)
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@api_bp.route('/market/<market_name>', methods=['GET'])
def get_market_data(market_name):
    """Endpoint para obter dados de um mercado específico"""
    try:
        from src.websocket_controller import MARKETS
        if market_name not in MARKETS:
            return jsonify({
                "success": False,
                "error": f"Mercado {market_name} não encontrado"
            }), 404
        
        all_data = websocket_controller.get_filtered_results()
        return jsonify({
            "success": True,
            "market": market_name,
            "data": all_data.get(market_name, {}),
            "timestamp": int(time.time())
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

