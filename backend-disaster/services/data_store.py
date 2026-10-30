"""
SQLite-backed data store for persistent data:
- Alerts history
- Evacuation routes
- Emergency contacts
- SOS reports
- Pilgrim facilities
"""

import sqlite3
import json
import os
from datetime import datetime
from contextlib import contextmanager


DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'disaster_prediction.db')


@contextmanager
def get_db():
    """Context manager for database connections."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Initialize database tables and seed default data."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Alerts table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alerts (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                message TEXT NOT NULL,
                priority TEXT NOT NULL DEFAULT 'low',
                location TEXT DEFAULT 'Pandharpur, Maharashtra',
                data TEXT DEFAULT '{}',
                status TEXT DEFAULT 'active',
                acknowledged INTEGER DEFAULT 0,
                acknowledged_by TEXT,
                acknowledged_at TEXT,
                created_at TEXT NOT NULL,
                expires_at TEXT
            )
        ''')

        # Evacuation routes table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS evacuation_routes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                route_type TEXT DEFAULT 'primary',
                coordinates TEXT NOT NULL,
                capacity INTEGER DEFAULT 0,
                status TEXT DEFAULT 'open',
                description TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        ''')

        # Emergency contacts table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS emergency_contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service_name TEXT NOT NULL,
                phone_number TEXT NOT NULL,
                category TEXT DEFAULT 'general',
                description TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TEXT NOT NULL
            )
        ''')

        # Assembly points table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS assembly_points (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                coordinates TEXT NOT NULL,
                capacity INTEGER DEFAULT 0,
                status TEXT DEFAULT 'active',
                created_at TEXT NOT NULL
            )
        ''')

        # SOS reports table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sos_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reporter_name TEXT,
                reporter_phone TEXT,
                location_lat REAL,
                location_lon REAL,
                emergency_type TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'pending',
                assigned_to TEXT,
                resolved_at TEXT,
                created_at TEXT NOT NULL
            )
        ''')

        # Pilgrim facilities table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS pilgrim_facilities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                facility_type TEXT NOT NULL,
                lat REAL NOT NULL,
                lon REAL NOT NULL,
                address TEXT,
                phone TEXT,
                operating_hours TEXT,
                is_open INTEGER DEFAULT 1,
                created_at TEXT NOT NULL
            )
        ''')

        # Seed default data if tables are empty
        _seed_default_data(cursor)


def _seed_default_data(cursor):
    """Seed default emergency contacts, evacuation routes, assembly points, and facilities."""
    now = datetime.now().isoformat()

    # Seed emergency contacts
    cursor.execute('SELECT COUNT(*) FROM emergency_contacts')
    if cursor.fetchone()[0] == 0:
        contacts = [
            ('Police', '+91-100', 'law_enforcement', 'National Police Emergency', 1, now),
            ('Fire Brigade', '+91-101', 'fire', 'National Fire Emergency', 1, now),
            ('Ambulance', '+91-102', 'medical', 'National Ambulance Service', 1, now),
            ('Disaster Management', '+91-1070', 'disaster', 'National Disaster Response Force', 1, now),
            ('Women Helpline', '+91-1091', 'women_safety', 'Women in Distress Helpline', 1, now),
            ('Pandharpur Control Room', '+91-2186-224444', 'disaster', 'Pandharpur Operations Center', 1, now),
            ('Pandharpur Civil Hospital', '+91-2186-223333', 'medical', 'Primary civil hospital', 1, now),
            ('Railway Police', '+91-182', 'law_enforcement', 'Railway Protection Force', 1, now),
        ]
        cursor.executemany(
            'INSERT INTO emergency_contacts (service_name, phone_number, category, description, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            contacts
        )

    # Seed evacuation routes
    cursor.execute('SELECT COUNT(*) FROM evacuation_routes')
    if cursor.fetchone()[0] == 0:
        routes = [
              ('Route 1 - Temple to Bus Stand', 'primary',
               json.dumps([[17.6826, 75.3279], [17.6790, 75.3260], [17.6739, 75.3235]]),
               50000, 'open', 'Primary evacuation route via main road', now, now),
              ('Route 2 - Temple to Chandrabagha Ghat', 'primary',
               json.dumps([[17.6826, 75.3279], [17.6830, 75.3286], [17.6834, 75.3290]]),
               30000, 'open', 'Secondary route to ghat area', now, now),
              ('Route 3 - Emergency Ring Road', 'emergency',
               json.dumps([[17.6826, 75.3279], [17.6720, 75.3180], [17.6675, 75.3150]]),
               40000, 'open', 'Emergency bypass via ring road', now, now),
              ('Route 4 - Market to Pundalik Temple', 'secondary',
               json.dumps([[17.6760, 75.3200], [17.6790, 75.3250], [17.6819, 75.3298]]),
               20000, 'open', 'Northern evacuation via market', now, now),
        ]
        cursor.executemany(
            'INSERT INTO evacuation_routes (name, route_type, coordinates, capacity, status, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            routes
        )

    # Seed assembly points
    cursor.execute('SELECT COUNT(*) FROM assembly_points')
    if cursor.fetchone()[0] == 0:
        points = [
            ('Vitthal Rukmini Ground', json.dumps([17.6815, 75.3282]), 100000, 'active', now),
            ('Chandrabagha Riverside', json.dumps([17.6832, 75.3302]), 80000, 'active', now),
            ('Pandharpur Bus Stand', json.dumps([17.6739, 75.3235]), 60000, 'active', now),
            ('Pandharpur Railway Station Area', json.dumps([17.6708, 75.3208]), 40000, 'active', now),
        ]
        cursor.executemany(
            'INSERT INTO assembly_points (name, coordinates, capacity, status, created_at) VALUES (?, ?, ?, ?, ?)',
            points
        )

    # Seed pilgrim facilities
    cursor.execute('SELECT COUNT(*) FROM pilgrim_facilities')
    if cursor.fetchone()[0] == 0:
        facilities = [
            ('Pandharpur Civil Hospital', 'hospital', 17.6810, 75.3240, 'Pandharpur, Maharashtra', '+91-2186-223333', '24/7', 1, now),
            ('Sub-District Hospital', 'hospital', 17.6768, 75.3266, 'Pandharpur, Maharashtra', '+91-2186-222222', '24/7', 1, now),
            ('Wari Medical Camp 1', 'medical_camp', 17.6822, 75.3272, 'Vitthal Temple Road', '+91-2186-2240100', '6 AM - 10 PM', 1, now),
            ('Wari Medical Camp 2', 'medical_camp', 17.6842, 75.3305, 'Chandrabagha Ghat', '+91-2186-2240101', '6 AM - 10 PM', 1, now),
            ('Pandharpur Police Station', 'police_station', 17.6799, 75.3239, 'Pandharpur, Maharashtra', '+91-2186-223020', '24/7', 1, now),
            ('Vitthal Temple Police Post', 'police_station', 17.6829, 75.3287, 'Temple Complex', '+91-2186-223021', '24/7', 1, now),
            ('Drinking Water Station A', 'drinking_water', 17.6828, 75.3284, 'Near Temple Complex', None, '5 AM - 11 PM', 1, now),
            ('Drinking Water Station B', 'drinking_water', 17.6836, 75.3293, 'Near Chandrabagha Ghat', None, '5 AM - 11 PM', 1, now),
            ('Public Toilet Block 1', 'toilet', 17.6816, 75.3271, 'Temple Entry', None, '24/7', 1, now),
            ('Public Toilet Block 2', 'toilet', 17.6831, 75.3296, 'Ghat Entry', None, '24/7', 1, now),
            ('Lost & Found Center', 'lost_found', 17.6818, 75.3276, 'Main Temple Gate', '+91-2186-2240200', '8 AM - 8 PM', 1, now),
            ('Information Kiosk - Temple', 'information', 17.6824, 75.3281, 'Temple Complex', None, '6 AM - 9 PM', 1, now),
        ]
        cursor.executemany(
            'INSERT INTO pilgrim_facilities (name, facility_type, lat, lon, address, phone, operating_hours, is_open, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            facilities
        )


# ─── CRUD Operations ─────────────────────────────────────────────────────────


def get_emergency_contacts():
    """Get all active emergency contacts."""
    with get_db() as conn:
        rows = conn.execute(
            'SELECT * FROM emergency_contacts WHERE is_active = 1 ORDER BY category, service_name'
        ).fetchall()
        return [dict(r) for r in rows]


def add_emergency_contact(service_name, phone_number, category='general', description=''):
    """Add a new emergency contact."""
    now = datetime.now().isoformat()
    with get_db() as conn:
        conn.execute(
            'INSERT INTO emergency_contacts (service_name, phone_number, category, description, is_active, created_at) VALUES (?, ?, ?, ?, 1, ?)',
            (service_name, phone_number, category, description, now)
        )


def update_emergency_contact(contact_id, **kwargs):
    """Update an emergency contact."""
    allowed = {'service_name', 'phone_number', 'category', 'description', 'is_active'}
    updates = {k: v for k, v in kwargs.items() if k in allowed}
    if not updates:
        return
    set_clause = ', '.join(f'{k} = ?' for k in updates)
    values = list(updates.values()) + [contact_id]
    with get_db() as conn:
        conn.execute(f'UPDATE emergency_contacts SET {set_clause} WHERE id = ?', values)


def get_evacuation_routes():
    """Get all evacuation routes."""
    with get_db() as conn:
        rows = conn.execute(
            'SELECT * FROM evacuation_routes ORDER BY route_type, name'
        ).fetchall()
        routes = []
        for r in rows:
            route = dict(r)
            route['coordinates'] = json.loads(route['coordinates'])
            routes.append(route)
        return routes


def add_evacuation_route(name, route_type, coordinates, capacity, status='open', description=''):
    """Add a new evacuation route."""
    now = datetime.now().isoformat()
    with get_db() as conn:
        conn.execute(
            'INSERT INTO evacuation_routes (name, route_type, coordinates, capacity, status, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            (name, route_type, json.dumps(coordinates), capacity, status, description, now, now)
        )


def update_evacuation_route(route_id, **kwargs):
    """Update an evacuation route."""
    allowed = {'name', 'route_type', 'coordinates', 'capacity', 'status', 'description'}
    updates = {k: v for k, v in kwargs.items() if k in allowed}
    if 'coordinates' in updates:
        updates['coordinates'] = json.dumps(updates['coordinates'])
    updates['updated_at'] = datetime.now().isoformat()
    set_clause = ', '.join(f'{k} = ?' for k in updates)
    values = list(updates.values()) + [route_id]
    with get_db() as conn:
        conn.execute(f'UPDATE evacuation_routes SET {set_clause} WHERE id = ?', values)


def get_assembly_points():
    """Get all active assembly points."""
    with get_db() as conn:
        rows = conn.execute(
            'SELECT * FROM assembly_points WHERE status = "active" ORDER BY name'
        ).fetchall()
        points = []
        for r in rows:
            point = dict(r)
            point['coordinates'] = json.loads(point['coordinates'])
            points.append(point)
        return points


# ─── Alert Operations ─────────────────────────────────────────────────────────


def save_alert(alert):
    """Save an alert to the database."""
    with get_db() as conn:
        conn.execute(
            '''INSERT OR REPLACE INTO alerts (id, type, message, priority, location, data, status, acknowledged, created_at, expires_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)''',
            (alert['id'], alert['type'], alert['message'], alert['priority'],
             alert.get('location', 'Pandharpur, Maharashtra'),
             json.dumps(alert.get('data', {})),
             alert.get('status', 'active'),
             alert.get('timestamp', datetime.now().isoformat()),
             alert.get('expires_at'))
        )


def get_active_alerts(limit=50):
    """Get active alerts from the database."""
    with get_db() as conn:
        rows = conn.execute(
            'SELECT * FROM alerts WHERE status = "active" ORDER BY created_at DESC LIMIT ?',
            (limit,)
        ).fetchall()
        alerts = []
        for r in rows:
            alert = dict(r)
            alert['data'] = json.loads(alert['data'])
            alert['timestamp'] = alert['created_at']
            alerts.append(alert)
        return alerts


def acknowledge_alert(alert_id, acknowledged_by):
    """Acknowledge an alert."""
    now = datetime.now().isoformat()
    with get_db() as conn:
        conn.execute(
            'UPDATE alerts SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = ? WHERE id = ?',
            (acknowledged_by, now, alert_id)
        )


def deactivate_expired_alerts():
    """Deactivate alerts that have expired."""
    now = datetime.now().isoformat()
    with get_db() as conn:
        conn.execute(
            'UPDATE alerts SET status = "expired" WHERE expires_at IS NOT NULL AND expires_at < ? AND status = "active"',
            (now,)
        )


# ─── SOS Operations ──────────────────────────────────────────────────────────


def create_sos_report(reporter_name, reporter_phone, lat, lon, emergency_type, description=''):
    """Create a new SOS report."""
    now = datetime.now().isoformat()
    with get_db() as conn:
        cursor = conn.execute(
            '''INSERT INTO sos_reports (reporter_name, reporter_phone, location_lat, location_lon,
               emergency_type, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)''',
            (reporter_name, reporter_phone, lat, lon, emergency_type, description, now)
        )
        return cursor.lastrowid


def get_sos_reports(status=None, limit=50):
    """Get SOS reports, optionally filtered by status."""
    with get_db() as conn:
        if status:
            rows = conn.execute(
                'SELECT * FROM sos_reports WHERE status = ? ORDER BY created_at DESC LIMIT ?',
                (status, limit)
            ).fetchall()
        else:
            rows = conn.execute(
                'SELECT * FROM sos_reports ORDER BY created_at DESC LIMIT ?',
                (limit,)
            ).fetchall()
        return [dict(r) for r in rows]


def update_sos_status(report_id, status, assigned_to=None):
    """Update SOS report status."""
    now = datetime.now().isoformat()
    with get_db() as conn:
        if status == 'resolved':
            conn.execute(
                'UPDATE sos_reports SET status = ?, assigned_to = ?, resolved_at = ? WHERE id = ?',
                (status, assigned_to, now, report_id)
            )
        else:
            conn.execute(
                'UPDATE sos_reports SET status = ?, assigned_to = ? WHERE id = ?',
                (status, assigned_to, report_id)
            )


# ─── Pilgrim Facilities ──────────────────────────────────────────────────────


def get_pilgrim_facilities(facility_type=None):
    """Get pilgrim facilities, optionally filtered by type."""
    with get_db() as conn:
        if facility_type:
            rows = conn.execute(
                'SELECT * FROM pilgrim_facilities WHERE facility_type = ? AND is_open = 1 ORDER BY name',
                (facility_type,)
            ).fetchall()
        else:
            rows = conn.execute(
                'SELECT * FROM pilgrim_facilities WHERE is_open = 1 ORDER BY facility_type, name'
            ).fetchall()
        return [dict(r) for r in rows]


def get_nearby_facilities(lat, lon, facility_type=None, radius_km=2.0):
    """Get facilities near a location. Uses simple distance approximation."""
    # 1 degree latitude ≈ 111 km
    lat_range = radius_km / 111.0
    lon_range = radius_km / (111.0 * 0.9)  # approximate for ~25°N

    with get_db() as conn:
        if facility_type:
            rows = conn.execute(
                '''SELECT *, 
                   ((lat - ?) * (lat - ?) + (lon - ?) * (lon - ?)) * 111 * 111 as approx_dist_sq
                   FROM pilgrim_facilities 
                   WHERE is_open = 1 AND facility_type = ?
                   AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?
                   ORDER BY approx_dist_sq''',
                (lat, lat, lon, lon, facility_type,
                 lat - lat_range, lat + lat_range, lon - lon_range, lon + lon_range)
            ).fetchall()
        else:
            rows = conn.execute(
                '''SELECT *,
                   ((lat - ?) * (lat - ?) + (lon - ?) * (lon - ?)) * 111 * 111 as approx_dist_sq
                   FROM pilgrim_facilities 
                   WHERE is_open = 1
                   AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?
                   ORDER BY approx_dist_sq''',
                (lat, lat, lon, lon,
                 lat - lat_range, lat + lat_range, lon - lon_range, lon + lon_range)
            ).fetchall()

        facilities = []
        for r in rows:
            f = dict(r)
            # Calculate approximate distance in km
            f['distance_km'] = round(((f['lat'] - lat) ** 2 + (f['lon'] - lon) ** 2) ** 0.5 * 111, 2)
            del f['approx_dist_sq']
            facilities.append(f)
        return facilities
