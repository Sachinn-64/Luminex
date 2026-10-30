"""
MahaKumbh Disaster Prediction & Management System - Main Flask Application

Provides real-time monitoring, alert management, pilgrim assistance, and admin
dashboard APIs. Uses SQLite for persistent data, WebSocket for real-time updates.
Supports city monitoring: Pandharpur (primary).
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO
from config import Config
import threading
import time

# Import services
from services.weather_service import WeatherService
from services.earthquake_service import EarthquakeService
from services.crowd_service import CrowdService
from services.traffic_service import TrafficService
from services.alert_service import AlertService
from services.satellite_service import SatelliteService
from services.pilgrim_service import PilgrimService
from services.data_store import (
    init_db,
    get_emergency_contacts,
    add_emergency_contact,
    update_emergency_contact,
    get_evacuation_routes,
    add_evacuation_route,
    update_evacuation_route,
    get_assembly_points,
)

app = Flask(__name__)
config = Config()
app.config['SECRET_KEY'] = config.SECRET_KEY

# Configure CORS
CORS(app, resources={
    r"/api/*": {"origins": "*"},
    r"/socket.io/*": {"origins": "*"}
})

# Configure SocketIO
socketio = SocketIO(app, cors_allowed_origins="*")

# Initialize database
init_db()

# Initialize services
weather_service = WeatherService()
earthquake_service = EarthquakeService()
crowd_service = CrowdService()
traffic_service = TrafficService()
alert_service = AlertService()
satellite_service = SatelliteService()
pilgrim_service = PilgrimService()


# ─── Simple Role Middleware ───────────────────────────────────────────────────

def is_admin(req):
    """Check if request comes from an admin. Simple header-based check."""
    return req.headers.get('X-User-Role', 'user') == 'admin'


# ═════════════════════════════════════════════════════════════════════════════
# CITY / META ENDPOINTS
# ═════════════════════════════════════════════════════════════════════════════

@app.route('/api/cities', methods=['GET'])
def get_cities():
    """Get list of supported monitoring cities."""
    return jsonify({
        'cities': list(config.CITIES.values()),
        'default': config.DEFAULT_CITY
    })


# ═════════════════════════════════════════════════════════════════════════════
# PUBLIC API ENDPOINTS (accessible to all users)
# ═════════════════════════════════════════════════════════════════════════════

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    """Get all dashboard data in a single call. Accepts ?city= param."""
    try:
        city = request.args.get('city', config.DEFAULT_CITY).lower()
        city_cfg = config.CITIES.get(city, config.CITIES[config.DEFAULT_CITY])
        lat, lon = city_cfg['lat'], city_cfg['lon']

        weather = weather_service.get_current_weather(lat=lat, lon=lon)
        earthquakes = earthquake_service.get_recent_earthquakes()
        crowd = crowd_service.get_crowd_analytics(city=city)
        traffic = traffic_service.get_traffic_conditions()
        alerts = alert_service.get_all_alerts()
        risk_score = alert_service.calculate_risk_score({
            'weather': weather,
            'earthquakes': earthquakes,
            'crowd': crowd,
            'traffic': traffic
        })

        return jsonify({
            'city': city_cfg,
            'weather': weather,
            'earthquakes': earthquakes,
            'crowd': crowd,
            'traffic': traffic,
            'alerts': alerts,
            'risk_score': risk_score,
            'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S')
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/weather', methods=['GET'])
def get_weather():
    """Get current weather data. Accepts ?city= param."""
    try:
        city = request.args.get('city', config.DEFAULT_CITY).lower()
        city_cfg = config.CITIES.get(city, config.CITIES[config.DEFAULT_CITY])
        data = weather_service.get_current_weather(lat=city_cfg['lat'], lon=city_cfg['lon'])
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/weather/forecast', methods=['GET'])
def get_weather_forecast():
    """Get weather forecast. Accepts ?city= param."""
    try:
        city = request.args.get('city', config.DEFAULT_CITY).lower()
        city_cfg = config.CITIES.get(city, config.CITIES[config.DEFAULT_CITY])
        data = weather_service.get_forecast(lat=city_cfg['lat'], lon=city_cfg['lon'])
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/earthquakes', methods=['GET'])
def get_earthquakes():
    """Get recent earthquake data from USGS."""
    try:
        data = earthquake_service.get_recent_earthquakes()
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/earthquakes/nearby', methods=['GET'])
def get_nearby_earthquakes():
    """Get earthquakes near selected city."""
    try:
        city = request.args.get('city', config.DEFAULT_CITY).lower()
        city_cfg = config.CITIES.get(city, config.CITIES[config.DEFAULT_CITY])
        data = earthquake_service.get_earthquakes_near_location(city_cfg['lat'], city_cfg['lon'])
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/crowd', methods=['GET'])
def get_crowd():
    """Get crowd analytics data. Accepts ?city= param."""
    try:
        city = request.args.get('city', config.DEFAULT_CITY).lower()
        data = crowd_service.get_crowd_analytics(city=city)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/crowd/stampede-risk', methods=['GET'])
def get_stampede_risk():
    """Get stampede risk assessment. Accepts ?city= param."""
    try:
        city = request.args.get('city', 'prayagraj').lower()
        data = crowd_service.get_stampede_risk_assessment(city=city)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/traffic', methods=['GET'])
def get_traffic():
    """Get traffic conditions."""
    try:
        data = traffic_service.get_traffic_conditions()
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/traffic/predictions', methods=['GET'])
def get_traffic_predictions():
    """Get traffic predictions."""
    try:
        hours = request.args.get('hours', 6, type=int)
        data = traffic_service.get_traffic_predictions(hours)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    """Get all active alerts."""
    try:
        data = alert_service.get_all_alerts()
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/risk-score', methods=['GET'])
def get_risk_score():
    """Get current risk assessment score. Accepts ?city= param."""
    try:
        city = request.args.get('city', config.DEFAULT_CITY).lower()
        city_cfg = config.CITIES.get(city, config.CITIES[config.DEFAULT_CITY])
        weather = weather_service.get_current_weather(lat=city_cfg['lat'], lon=city_cfg['lon'])
        earthquakes = earthquake_service.get_recent_earthquakes()
        crowd = crowd_service.get_crowd_analytics(city=city)
        traffic = traffic_service.get_traffic_conditions()
        data = alert_service.calculate_risk_score({
            'weather': weather,
            'earthquakes': earthquakes,
            'crowd': crowd,
            'traffic': traffic
        })
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/emergency/contacts', methods=['GET'])
def get_contacts():
    """Get emergency contacts (from database)."""
    try:
        contacts = get_emergency_contacts()
        return jsonify(contacts)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/evacuation-routes', methods=['GET'])
def get_routes():
    """Get evacuation routes (from database)."""
    try:
        routes = get_evacuation_routes()
        primary = [r for r in routes if r['route_type'] == 'primary']
        secondary = [r for r in routes if r['route_type'] == 'secondary']
        emergency = [r for r in routes if r['route_type'] == 'emergency']
        return jsonify({
            'primary_routes': primary,
            'secondary_routes': secondary,
            'emergency_routes': emergency,
            'all_routes': routes,
            'total': len(routes)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/assembly-points', methods=['GET'])
def get_points():
    """Get assembly points (from database)."""
    try:
        points = get_assembly_points()
        return jsonify({'assembly_points': points, 'total': len(points)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/satellite/imagery', methods=['GET'])
def get_satellite_imagery():
    """Get satellite imagery data for the selected city."""
    try:
        city = request.args.get('city', 'prayagraj').lower()
        city_cfg = config.CITIES.get(city, config.CITIES['prayagraj'])
        lat, lon = city_cfg['lat'], city_cfg['lon']
        # Build a 0.2° bounding box around the city centre
        bbox = [lon - 0.1, lat - 0.1, lon + 0.1, lat + 0.1]
        data = satellite_service.get_area_imagery(bbox=bbox)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/satellite/flood-analysis', methods=['GET'])
def get_flood_analysis():
    """Get flood analysis from satellite data."""
    try:
        city = request.args.get('city', 'prayagraj').lower()
        city_cfg = config.CITIES.get(city, config.CITIES['prayagraj'])
        lat, lon = city_cfg['lat'], city_cfg['lon']
        bbox = [lon - 0.1, lat - 0.1, lon + 0.1, lat + 0.1]
        data = satellite_service.get_flood_analysis(bbox=bbox, city_lat=lat, city_lon=lon)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/satellite/terrain-analysis', methods=['GET'])
def get_terrain_analysis():
    """Get terrain analysis from satellite data."""
    try:
        city = request.args.get('city', 'prayagraj').lower()
        city_cfg = config.CITIES.get(city, config.CITIES['prayagraj'])
        lat, lon = city_cfg['lat'], city_cfg['lon']
        bbox = [lon - 0.1, lat - 0.1, lon + 0.1, lat + 0.1]
        data = satellite_service.get_terrain_analysis(bbox=bbox, city_lat=lat, city_lon=lon)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/seismic-risk', methods=['GET'])
def get_seismic_risk():
    """Get seismic risk assessment."""
    try:
        data = earthquake_service.get_seismic_risk_assessment()
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ═════════════════════════════════════════════════════════════════════════════
# PILGRIM ASSISTANCE ENDPOINTS (user-facing features)
# ═════════════════════════════════════════════════════════════════════════════

@app.route('/api/pilgrim/nearby', methods=['GET'])
def get_nearby_facilities():
    """Get facilities near a location."""
    try:
        city = request.args.get('city', 'prayagraj').lower()
        city_cfg = config.CITIES.get(city, config.CITIES['prayagraj'])
        lat = request.args.get('lat', city_cfg['lat'], type=float)
        lon = request.args.get('lon', city_cfg['lon'], type=float)
        facility_type = request.args.get('type', None)
        radius = request.args.get('radius', 2.0, type=float)
        data = pilgrim_service.get_nearby(lat, lon, facility_type, radius)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/pilgrim/facilities', methods=['GET'])
def get_facilities():
    """Get all pilgrim facilities."""
    try:
        facility_type = request.args.get('type', None)
        data = pilgrim_service.get_all_facilities(facility_type)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/pilgrim/sos', methods=['POST'])
def submit_sos():
    """Submit an SOS distress report."""
    try:
        body = request.get_json()
        if not body:
            return jsonify({'error': 'Request body required'}), 400

        city = body.get('city', 'prayagraj').lower()
        city_cfg = config.CITIES.get(city, config.CITIES['prayagraj'])

        data = pilgrim_service.submit_sos(
            reporter_name=body.get('name', ''),
            reporter_phone=body.get('phone', ''),
            lat=body.get('lat', city_cfg['lat']),
            lon=body.get('lon', city_cfg['lon']),
            emergency_type=body.get('emergency_type', 'other'),
            description=body.get('description', '')
        )

        if data.get('success'):
            socketio.emit('critical_alert', {
                'type': 'sos',
                'message': f"SOS Report: {body.get('emergency_type', 'Emergency')} - {body.get('description', 'No details')}",
                'city': city,
                'report_id': data.get('report_id'),
                'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S')
            })

        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/pilgrim/safe-routes', methods=['GET'])
def get_safe_routes():
    """Get safe evacuation/navigation routes from current location."""
    try:
        city = request.args.get('city', 'prayagraj').lower()
        city_cfg = config.CITIES.get(city, config.CITIES['prayagraj'])
        lat = request.args.get('lat', city_cfg['lat'], type=float)
        lon = request.args.get('lon', city_cfg['lon'], type=float)
        data = pilgrim_service.get_safe_routes(lat, lon)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ═════════════════════════════════════════════════════════════════════════════
# ADMIN-ONLY ENDPOINTS
# ═════════════════════════════════════════════════════════════════════════════

@app.route('/api/admin/contacts', methods=['POST'])
def admin_add_contact():
    """Add a new emergency contact (admin only)."""
    if not is_admin(request):
        return jsonify({'error': 'Admin access required'}), 403
    try:
        body = request.get_json()
        add_emergency_contact(
            body['service_name'], body['phone_number'],
            body.get('category', 'general'), body.get('description', '')
        )
        return jsonify({'success': True, 'message': 'Contact added'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/contacts/<int:contact_id>', methods=['PUT'])
def admin_update_contact(contact_id):
    """Update an emergency contact (admin only)."""
    if not is_admin(request):
        return jsonify({'error': 'Admin access required'}), 403
    try:
        body = request.get_json()
        update_emergency_contact(contact_id, **body)
        return jsonify({'success': True, 'message': 'Contact updated'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/evacuation-routes', methods=['POST'])
def admin_add_route():
    """Add a new evacuation route (admin only)."""
    if not is_admin(request):
        return jsonify({'error': 'Admin access required'}), 403
    try:
        body = request.get_json()
        add_evacuation_route(
            body['name'], body.get('route_type', 'secondary'),
            body['coordinates'], body.get('capacity', 0),
            body.get('status', 'open'), body.get('description', '')
        )
        return jsonify({'success': True, 'message': 'Route added'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/evacuation-routes/<int:route_id>', methods=['PUT'])
def admin_update_route(route_id):
    """Update an evacuation route (admin only)."""
    if not is_admin(request):
        return jsonify({'error': 'Admin access required'}), 403
    try:
        body = request.get_json()
        update_evacuation_route(route_id, **body)
        return jsonify({'success': True, 'message': 'Route updated'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/crowd/update', methods=['POST'])
def admin_update_crowd():
    """Update crowd zone density from external source (admin only)."""
    if not is_admin(request):
        return jsonify({'error': 'Admin access required'}), 403
    try:
        body = request.get_json()
        zone_id = body.get('zone_id')
        density = body.get('density')
        source = body.get('source', 'admin_manual')
        city = body.get('city', 'prayagraj')
        if not zone_id or density is None:
            return jsonify({'error': 'zone_id and density required'}), 400
        success = crowd_service.update_zone_from_external(zone_id, density, source, city)
        if success:
            return jsonify({'success': True, 'message': f'Zone {zone_id} updated'})
        else:
            return jsonify({'error': f'Zone {zone_id} not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/alerts/<alert_id>/acknowledge', methods=['POST'])
def admin_acknowledge_alert(alert_id):
    """Acknowledge an alert (admin only)."""
    if not is_admin(request):
        return jsonify({'error': 'Admin access required'}), 403
    try:
        body = request.get_json() or {}
        data = alert_service.acknowledge_alert(alert_id, body.get('acknowledged_by', 'admin'))
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/sos', methods=['GET'])
def admin_get_sos():
    """Get SOS reports dashboard (admin only)."""
    if not is_admin(request):
        return jsonify({'error': 'Admin access required'}), 403
    try:
        status = request.args.get('status', None)
        data = pilgrim_service.get_sos_dashboard(status)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/sos/<int:report_id>', methods=['PUT'])
def admin_update_sos(report_id):
    """Update SOS report status (admin only)."""
    if not is_admin(request):
        return jsonify({'error': 'Admin access required'}), 403
    try:
        body = request.get_json()
        data = pilgrim_service.update_sos(
            report_id, body.get('status'), body.get('assigned_to')
        )
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ═════════════════════════════════════════════════════════════════════════════
# WEBSOCKET EVENTS
# ═════════════════════════════════════════════════════════════════════════════

@socketio.on('connect')
def handle_connect():
    print('Client connected')


@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')


# ═════════════════════════════════════════════════════════════════════════════
# BACKGROUND TASK
# ═════════════════════════════════════════════════════════════════════════════

def background_task():
    """Background task to periodically update data and check for alerts."""
    while True:
        try:
            time.sleep(120)  # Refresh every 2 minutes (was 30s — too aggressive for frontend)

            weather = weather_service.get_current_weather()
            earthquakes = earthquake_service.get_recent_earthquakes()
            crowd = crowd_service.get_crowd_analytics(city='prayagraj')
            traffic = traffic_service.get_traffic_conditions()

            dashboard_data = {
                'weather': weather,
                'earthquakes': earthquakes,
                'crowd': crowd,
                'traffic': traffic
            }

            new_alerts = alert_service.check_and_generate_alerts(dashboard_data)
            risk_score = alert_service.calculate_risk_score(dashboard_data)

            socketio.emit('dashboard_update', {
                'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S'),
                'risk_score': risk_score,
                'new_alerts_count': len(new_alerts)
            })

            for new_alert in new_alerts:
                if new_alert['priority'] == 'critical':
                    socketio.emit('critical_alert', new_alert)

        except Exception as e:
            print(f"Background task error: {e}")
            time.sleep(5)


# ═════════════════════════════════════════════════════════════════════════════
# APPLICATION STARTUP
# ═════════════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    bg_thread = threading.Thread(target=background_task, daemon=True)
    bg_thread.start()

    print("Trinetra - MahaKumbh Disaster Prediction System Starting...")
    print(f"Monitoring: Prayagraj ({config.MAHAKUMBH_LAT}, {config.MAHAKUMBH_LON})")
    print(f"Weather API: {'Configured' if config.OPENWEATHER_API_KEY and config.OPENWEATHER_API_KEY != 'your_openweather_api_key_here' else 'Not configured (using mock)'}")
    print(f"Google Maps API: {'Configured' if config.GOOGLE_MAPS_API_KEY and config.GOOGLE_MAPS_API_KEY != 'your_google_maps_api_key_here' else 'Not configured (using simulation)'}")
    print(f"Sentinel Hub: {'Configured' if config.SENTINEL_HUB_CLIENT_ID and config.SENTINEL_HUB_CLIENT_ID != 'your_sentinel_hub_client_id_here' else 'Not configured (using mock)'}")

    socketio.run(app, host='0.0.0.0', port=5001, debug=True, allow_unsafe_werkzeug=True)
