"""Disaster prediction endpoints (forward-looking hazard forecast)."""

from flask import Blueprint, jsonify, request


def create_prediction_blueprint(config, prediction_service):
    bp = Blueprint('prediction', __name__)

    @bp.route('/api/prediction/forecast', methods=['GET'])
    def get_forecast():
        """Hazard forecast timeline. Query: city, hours (24-120)."""
        try:
            city = request.args.get('city', config.DEFAULT_CITY).lower()
            city_cfg = config.CITIES.get(city, config.CITIES[config.DEFAULT_CITY])
            hours = request.args.get('hours', 72, type=int)
            return jsonify(prediction_service.forecast(city_cfg, hours))
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    return bp
