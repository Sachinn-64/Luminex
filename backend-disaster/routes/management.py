"""
Disaster management endpoints: incident command, resource dispatch,
broadcasts, and the public hazard layer consumed by the AI-guided map.
"""

import random
import time
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request

from services import incident_store as store
from services.data_store import get_assembly_points, get_evacuation_routes, save_alert

SOS_SEVERITY = {'medical': 'high', 'fire': 'critical', 'flood': 'critical', 'stampede': 'critical',
                'structural': 'high', 'lost_person': 'moderate', 'crime': 'high'}
SEVERITY_RADIUS = {'low': 80, 'moderate': 150, 'high': 250, 'critical': 400}
MAX_TEXT = 500


def _is_admin(req):
    return req.headers.get('X-User-Role', 'user') == 'admin'


def _actor(req):
    return (req.headers.get('X-User-Name') or req.headers.get('X-User-Role') or 'user')[:80]


def _coord(value, low, high):
    try:
        value = float(value)
    except (TypeError, ValueError):
        return None
    return value if low <= value <= high else None


def create_management_blueprint(config, socketio, crowd_service, traffic_service, prediction_service):
    bp = Blueprint('management', __name__)

    def emit_update(kind, payload=None):
        socketio.emit('management_update', {'kind': kind, 'payload': payload or {},
                                            'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S')})

    @bp.route('/api/management/overview', methods=['GET'])
    def overview():
        try:
            return jsonify({'summary': store.management_summary(),
                            'incidents': store.list_incidents(active_only=True),
                            'timestamp': datetime.now().isoformat()})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @bp.route('/api/management/incidents', methods=['GET'])
    def list_incidents():
        active_only = request.args.get('status', 'active') != 'all'
        return jsonify({'incidents': store.list_incidents(active_only=active_only)})

    @bp.route('/api/management/incidents', methods=['POST'])
    def create_incident():
        """Report an incident. Any user may report; only admins may set severity directly."""
        body = request.get_json(silent=True) or {}
        incident_type = body.get('incident_type', 'other')
        if incident_type not in store.INCIDENT_TYPES:
            return jsonify({'error': f'incident_type must be one of {store.INCIDENT_TYPES}'}), 400
        lat = _coord(body.get('lat'), -90, 90)
        lon = _coord(body.get('lon'), -180, 180)
        if lat is None or lon is None:
            return jsonify({'error': 'Valid lat and lon are required'}), 400
        severity = body.get('severity') if _is_admin(request) else None
        if severity not in store.SEVERITIES:
            severity = SOS_SEVERITY.get(incident_type, 'moderate')
        title = (body.get('title') or f"{incident_type.replace('_', ' ').capitalize()} incident").strip()[:120]
        incident_id = store.create_incident(
            title=title, incident_type=incident_type, severity=severity, lat=lat, lon=lon,
            description=str(body.get('description', ''))[:MAX_TEXT],
            reported_by=_actor(request), source='admin' if _is_admin(request) else 'citizen',
            radius_m=SEVERITY_RADIUS[severity],
        )
        incident = store.get_incident(incident_id)
        emit_update('incident_created', incident)
        if severity == 'critical':
            socketio.emit('critical_alert', {'type': 'incident', 'message': title, 'incident_id': incident_id,
                                             'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S')})
        return jsonify({'success': True, 'incident': incident}), 201

    @bp.route('/api/management/incidents/<int:incident_id>', methods=['PUT'])
    def update_incident(incident_id):
        if not _is_admin(request):
            return jsonify({'error': 'Admin access required'}), 403
        body = request.get_json(silent=True) or {}
        status, severity = body.get('status'), body.get('severity')
        if status and status not in store.INCIDENT_STATUSES:
            return jsonify({'error': f'status must be one of {store.INCIDENT_STATUSES}'}), 400
        if severity and severity not in store.SEVERITIES:
            return jsonify({'error': f'severity must be one of {store.SEVERITIES}'}), 400
        note = str(body['note'])[:MAX_TEXT] if body.get('note') else None
        incident = store.update_incident(incident_id, _actor(request), status, severity, note)
        if not incident:
            return jsonify({'error': 'Incident not found'}), 404
        emit_update('incident_updated', incident)
        return jsonify({'success': True, 'incident': incident})

    @bp.route('/api/management/incidents/<int:incident_id>/recommendations', methods=['GET'])
    def recommendations(incident_id):
        recs = store.recommend_resources(incident_id)
        if recs is None:
            return jsonify({'error': 'Incident not found'}), 404
        return jsonify({'recommendations': recs})

    @bp.route('/api/management/incidents/<int:incident_id>/dispatch', methods=['POST'])
    def dispatch(incident_id):
        if not _is_admin(request):
            return jsonify({'error': 'Admin access required'}), 403
        body = request.get_json(silent=True) or {}
        resource_id = body.get('resource_id')
        if not isinstance(resource_id, int):
            return jsonify({'error': 'resource_id (int) is required'}), 400
        incident, err = store.dispatch_resource(incident_id, resource_id, _actor(request))
        if err:
            return jsonify({'error': err}), 409
        emit_update('resource_dispatched', incident)
        return jsonify({'success': True, 'incident': incident})

    @bp.route('/api/management/resources', methods=['GET'])
    def resources():
        return jsonify({'resources': store.list_resources()})

    @bp.route('/api/management/broadcast', methods=['POST'])
    def broadcast():
        """Push a public alert to every connected dashboard and the alerts feed."""
        if not _is_admin(request):
            return jsonify({'error': 'Admin access required'}), 403
        body = request.get_json(silent=True) or {}
        message = str(body.get('message', '')).strip()[:MAX_TEXT]
        priority = body.get('priority', 'high')
        if not message:
            return jsonify({'error': 'message is required'}), 400
        if priority not in ('low', 'medium', 'high', 'critical'):
            return jsonify({'error': 'priority must be low|medium|high|critical'}), 400
        try:
            duration_hours = max(1, min(48, int(body.get('duration_hours', 6))))
        except (TypeError, ValueError):
            return jsonify({'error': 'duration_hours must be an integer'}), 400
        now = datetime.now()
        alert = {
            'id': f"alert_broadcast_{now.strftime('%Y%m%d%H%M%S')}_{random.randint(100, 999)}",
            'type': 'broadcast', 'message': message, 'priority': priority,
            'data': {'issued_by': _actor(request)}, 'status': 'active',
            'timestamp': now.isoformat(),
            'expires_at': (now + timedelta(hours=duration_hours)).isoformat(),
        }
        save_alert(alert)
        socketio.emit('critical_alert' if priority == 'critical' else 'broadcast_alert', alert)
        return jsonify({'success': True, 'alert': alert}), 201

    @bp.route('/api/management/hazards', methods=['GET'])
    def hazards():
        """Public safety layer for maps: incidents, crowd zones, routes, assembly points, outlook."""
        try:
            city = request.args.get('city', config.DEFAULT_CITY).lower()
            city_cfg = config.CITIES.get(city, config.CITIES[config.DEFAULT_CITY])
            crowd = crowd_service.get_crowd_analytics(city=city)
            traffic = traffic_service.get_traffic_conditions()
            forecast = prediction_service.forecast(city_cfg, 24)
            incidents = [{k: i[k] for k in ('id', 'title', 'incident_type', 'severity', 'status',
                                             'lat', 'lon', 'radius_m', 'created_at')}
                         for i in store.list_incidents(active_only=True)]
            zones = [{'id': z['id'], 'name': z['name'], 'lat': z['coordinates'][0], 'lon': z['coordinates'][1],
                      'density': round(z.get('current_density', 0), 3), 'risk_level': z.get('risk_level'),
                      'capacity': z.get('capacity')} for z in crowd.get('zones', [])]
            return jsonify({
                'city': city_cfg,
                'incidents': incidents,
                'crowd_zones': zones,
                'evacuation_routes': get_evacuation_routes(),
                'assembly_points': get_assembly_points(),
                'traffic': traffic.get('overall_conditions', {}),
                'outlook': {
                    'next_24h_level': forecast['summary']['next_24h_level'],
                    'warnings': [{k: w[k] for k in ('hazard', 'onset', 'lead_time_hours', 'level')}
                                 for w in forecast['early_warnings']],
                },
                'timestamp': datetime.now().isoformat(),
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    return bp


def incident_from_sos(report_id, emergency_type, lat, lon, description, reporter):
    """Every SOS becomes a tracked incident so it shows up on the command board and maps."""
    incident_type = emergency_type if emergency_type in store.INCIDENT_TYPES else 'other'
    severity = SOS_SEVERITY.get(incident_type, 'moderate')
    return store.create_incident(
        title=f"SOS: {incident_type.replace('_', ' ')}", incident_type=incident_type, severity=severity,
        lat=lat, lon=lon, description=description[:MAX_TEXT], reported_by=reporter or 'pilgrim',
        source='sos', radius_m=SEVERITY_RADIUS[severity], sos_report_id=report_id,
    )
