"""
SQLite persistence for disaster management:
- Incidents (manual reports, SOS-derived, prediction-derived)
- Response resources (ambulances, NDRF teams, boats, ...)
- Incident activity log
"""

import math
from datetime import datetime

from services.data_store import get_db

INCIDENT_TYPES = ('medical', 'fire', 'flood', 'stampede', 'structural', 'lost_person', 'crime', 'other')
SEVERITIES = ('low', 'moderate', 'high', 'critical')
INCIDENT_STATUSES = ('reported', 'acknowledged', 'responding', 'contained', 'resolved')
ACTIVE_STATUSES = ('reported', 'acknowledged', 'responding', 'contained')
RESOURCE_STATUSES = ('available', 'deployed', 'maintenance')

# Which resource types are useful for each incident type (in priority order)
RESOURCE_MATCH = {
    'medical': ['ambulance', 'medical_camp'],
    'fire': ['fire_tender', 'ambulance'],
    'flood': ['boat', 'ndrf_team', 'ambulance'],
    'stampede': ['police_unit', 'ambulance', 'ndrf_team'],
    'structural': ['ndrf_team', 'fire_tender', 'ambulance'],
    'lost_person': ['police_unit'],
    'crime': ['police_unit'],
    'other': ['police_unit', 'ambulance'],
}

DEFAULT_RESOURCES = [
    ('Ambulance A1', 'ambulance', 17.6790, 75.3250, 2),
    ('Ambulance A2', 'ambulance', 17.6745, 75.3215, 2),
    ('Ambulance A3', 'ambulance', 17.6840, 75.3310, 2),
    ('108 Cardiac Unit', 'ambulance', 17.6770, 75.3290, 2),
    ('NDRF Team Alpha', 'ndrf_team', 17.6735, 75.3230, 30),
    ('NDRF Team Bravo', 'ndrf_team', 17.6850, 75.3330, 30),
    ('Rescue Boat R1', 'boat', 17.6838, 75.3295, 12),
    ('Rescue Boat R2', 'boat', 17.6845, 75.3275, 12),
    ('Fire Tender F1', 'fire_tender', 17.6760, 75.3240, 6),
    ('Police QRT 1', 'police_unit', 17.6800, 75.3265, 15),
    ('Police QRT 2', 'police_unit', 17.6815, 75.3300, 15),
    ('Medical Camp - Bus Stand', 'medical_camp', 17.6739, 75.3235, 40),
]


def init_incident_tables():
    with get_db() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS incidents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                incident_type TEXT NOT NULL,
                severity TEXT NOT NULL DEFAULT 'moderate',
                status TEXT NOT NULL DEFAULT 'reported',
                lat REAL NOT NULL,
                lon REAL NOT NULL,
                radius_m INTEGER DEFAULT 150,
                description TEXT,
                reported_by TEXT,
                source TEXT DEFAULT 'manual',
                sos_report_id INTEGER,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                resolved_at TEXT
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS resources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                resource_type TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'available',
                base_lat REAL NOT NULL,
                base_lon REAL NOT NULL,
                capacity INTEGER DEFAULT 0,
                incident_id INTEGER,
                updated_at TEXT NOT NULL
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS incident_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                incident_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                actor TEXT DEFAULT 'system',
                created_at TEXT NOT NULL
            )
        ''')
        if conn.execute('SELECT COUNT(*) FROM resources').fetchone()[0] == 0:
            now = datetime.now().isoformat()
            conn.executemany(
                'INSERT INTO resources (name, resource_type, base_lat, base_lon, capacity, updated_at) '
                'VALUES (?, ?, ?, ?, ?, ?)',
                [(n, t, la, lo, c, now) for n, t, la, lo, c in DEFAULT_RESOURCES],
            )


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


# ─── Incidents ───────────────────────────────────────────────────────────────

def _add_log(conn, incident_id, message, actor='system'):
    conn.execute('INSERT INTO incident_log (incident_id, message, actor, created_at) VALUES (?, ?, ?, ?)',
                 (incident_id, message, actor, datetime.now().isoformat()))


def create_incident(title, incident_type, severity, lat, lon, description='', reported_by='',
                    source='manual', radius_m=150, sos_report_id=None):
    now = datetime.now().isoformat()
    with get_db() as conn:
        cur = conn.execute(
            '''INSERT INTO incidents (title, incident_type, severity, status, lat, lon, radius_m, description,
               reported_by, source, sos_report_id, created_at, updated_at)
               VALUES (?, ?, ?, 'reported', ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (title, incident_type, severity, lat, lon, radius_m, description, reported_by, source,
             sos_report_id, now, now),
        )
        incident_id = cur.lastrowid
        _add_log(conn, incident_id, f'Incident reported via {source}', reported_by or 'system')
        return incident_id


def _hydrate(conn, row):
    incident = dict(row)
    incident['resources'] = [dict(r) for r in conn.execute(
        'SELECT id, name, resource_type, status FROM resources WHERE incident_id = ?', (incident['id'],))]
    incident['log'] = [dict(r) for r in conn.execute(
        'SELECT message, actor, created_at FROM incident_log WHERE incident_id = ? ORDER BY id DESC LIMIT 20',
        (incident['id'],))]
    return incident


def get_incident(incident_id):
    with get_db() as conn:
        row = conn.execute('SELECT * FROM incidents WHERE id = ?', (incident_id,)).fetchone()
        return _hydrate(conn, row) if row else None


def list_incidents(active_only=True, limit=100):
    with get_db() as conn:
        if active_only:
            placeholders = ','.join('?' * len(ACTIVE_STATUSES))
            rows = conn.execute(
                f'SELECT * FROM incidents WHERE status IN ({placeholders}) ORDER BY created_at DESC LIMIT ?',
                (*ACTIVE_STATUSES, limit)).fetchall()
        else:
            rows = conn.execute('SELECT * FROM incidents ORDER BY created_at DESC LIMIT ?', (limit,)).fetchall()
        incidents = [_hydrate(conn, r) for r in rows]
    order = {s: i for i, s in enumerate(reversed(SEVERITIES))}
    incidents.sort(key=lambda i: (i['status'] == 'resolved', order.get(i['severity'], 9)))
    return incidents


def update_incident(incident_id, actor='admin', status=None, severity=None, note=None):
    now = datetime.now().isoformat()
    with get_db() as conn:
        row = conn.execute('SELECT * FROM incidents WHERE id = ?', (incident_id,)).fetchone()
        if not row:
            return None
        if severity and severity != row['severity']:
            conn.execute('UPDATE incidents SET severity = ?, updated_at = ? WHERE id = ?', (severity, now, incident_id))
            _add_log(conn, incident_id, f'Severity changed {row["severity"]} → {severity}', actor)
        if status and status != row['status']:
            resolved_at = now if status == 'resolved' else None
            conn.execute('UPDATE incidents SET status = ?, updated_at = ?, resolved_at = ? WHERE id = ?',
                         (status, now, resolved_at, incident_id))
            _add_log(conn, incident_id, f'Status changed {row["status"]} → {status}', actor)
            if status == 'resolved':
                released = conn.execute(
                    "UPDATE resources SET status = 'available', incident_id = NULL, updated_at = ? "
                    "WHERE incident_id = ?", (now, incident_id)).rowcount
                if released:
                    _add_log(conn, incident_id, f'{released} resource(s) released', actor)
            if row['sos_report_id']:
                sos_status = 'resolved' if status == 'resolved' else 'in_progress'
                conn.execute('UPDATE sos_reports SET status = ? WHERE id = ?', (sos_status, row['sos_report_id']))
        if note:
            _add_log(conn, incident_id, note, actor)
    return get_incident(incident_id)


# ─── Resources ───────────────────────────────────────────────────────────────

def list_resources():
    with get_db() as conn:
        return [dict(r) for r in conn.execute('SELECT * FROM resources ORDER BY resource_type, name')]


def recommend_resources(incident_id, limit=5):
    incident = get_incident(incident_id)
    if not incident:
        return None
    wanted = RESOURCE_MATCH.get(incident['incident_type'], RESOURCE_MATCH['other'])
    candidates = []
    for r in list_resources():
        if r['status'] != 'available' or r['resource_type'] not in wanted:
            continue
        distance = haversine_km(incident['lat'], incident['lon'], r['base_lat'], r['base_lon'])
        r['distance_km'] = round(distance, 2)
        # ~15 km/h effective speed through crowded lanes
        r['eta_minutes'] = max(2, round(distance / 15 * 60))
        r['match_rank'] = wanted.index(r['resource_type'])
        candidates.append(r)
    candidates.sort(key=lambda r: (r['match_rank'], r['distance_km']))
    return candidates[:limit]


def dispatch_resource(incident_id, resource_id, actor='admin'):
    now = datetime.now().isoformat()
    with get_db() as conn:
        incident = conn.execute('SELECT * FROM incidents WHERE id = ?', (incident_id,)).fetchone()
        resource = conn.execute('SELECT * FROM resources WHERE id = ?', (resource_id,)).fetchone()
        if not incident or not resource:
            return None, 'Incident or resource not found'
        if resource['status'] != 'available':
            return None, f'{resource["name"]} is not available'
        if incident['status'] == 'resolved':
            return None, 'Incident is already resolved'
        conn.execute("UPDATE resources SET status = 'deployed', incident_id = ?, updated_at = ? WHERE id = ?",
                     (incident_id, now, resource_id))
        if incident['status'] in ('reported', 'acknowledged'):
            conn.execute("UPDATE incidents SET status = 'responding', updated_at = ? WHERE id = ?", (now, incident_id))
        _add_log(conn, incident_id, f'Dispatched {resource["name"]}', actor)
    return get_incident(incident_id), None


def management_summary():
    incidents = list_incidents(active_only=False, limit=500)
    resources = list_resources()
    active = [i for i in incidents if i['status'] in ACTIVE_STATUSES]
    return {
        'active_incidents': len(active),
        'critical_incidents': sum(1 for i in active if i['severity'] == 'critical'),
        'unassigned_incidents': sum(1 for i in active if not i['resources']),
        'resolved_today': sum(1 for i in incidents if i['resolved_at'] and
                              i['resolved_at'][:10] == datetime.now().date().isoformat()),
        'resources_total': len(resources),
        'resources_available': sum(1 for r in resources if r['status'] == 'available'),
        'resources_deployed': sum(1 for r in resources if r['status'] == 'deployed'),
        'by_type': {t: sum(1 for i in active if i['incident_type'] == t) for t in INCIDENT_TYPES
                    if any(i['incident_type'] == t for i in active)},
    }

