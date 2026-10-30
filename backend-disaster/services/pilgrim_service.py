"""
Pilgrim Assistance Service
- Nearby facilities lookup (hospitals, police, water, toilets, etc.)
- SOS reporting
- Crowd-aware safe route suggestions
"""

from datetime import datetime
from config import Config
from services.data_store import (
    get_nearby_facilities,
    get_pilgrim_facilities,
    create_sos_report,
    get_sos_reports,
    update_sos_status,
    get_evacuation_routes,
    get_assembly_points,
    get_emergency_contacts,
)


class PilgrimService:
    def __init__(self):
        self.config = Config()

    def get_nearby(self, lat, lon, facility_type=None, radius_km=2.0):
        """Get nearby facilities for a pilgrim at the given location."""
        try:
            facilities = get_nearby_facilities(lat, lon, facility_type, radius_km)

            # Group by type
            grouped = {}
            for f in facilities:
                ft = f['facility_type']
                if ft not in grouped:
                    grouped[ft] = []
                grouped[ft].append(f)

            return {
                'facilities': facilities,
                'grouped': grouped,
                'total': len(facilities),
                'search_radius_km': radius_km,
                'location': {'lat': lat, 'lon': lon},
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error getting nearby facilities: {e}")
            return {'facilities': [], 'grouped': {}, 'total': 0, 'timestamp': datetime.now().isoformat()}

    def get_all_facilities(self, facility_type=None):
        """Get all pilgrim facilities, optionally filtered."""
        try:
            facilities = get_pilgrim_facilities(facility_type)
            return {
                'facilities': facilities,
                'total': len(facilities),
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error getting facilities: {e}")
            return {'facilities': [], 'total': 0, 'timestamp': datetime.now().isoformat()}

    def submit_sos(self, reporter_name, reporter_phone, lat, lon, emergency_type, description=''):
        """Submit an SOS distress report."""
        try:
            report_id = create_sos_report(
                reporter_name, reporter_phone, lat, lon, emergency_type, description
            )
            return {
                'success': True,
                'report_id': report_id,
                'message': 'SOS report submitted successfully. Emergency services have been notified.',
                'emergency_contacts': self._get_relevant_contacts(emergency_type),
                'nearest_assembly_point': self._get_nearest_assembly_point(lat, lon),
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error submitting SOS: {e}")
            return {
                'success': False,
                'message': f'Failed to submit SOS report: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }

    def get_sos_dashboard(self, status=None):
        """Get SOS reports for admin dashboard."""
        try:
            reports = get_sos_reports(status)
            return {
                'reports': reports,
                'total': len(reports),
                'pending': len([r for r in reports if r['status'] == 'pending']),
                'in_progress': len([r for r in reports if r['status'] == 'in_progress']),
                'resolved': len([r for r in reports if r['status'] == 'resolved']),
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error getting SOS dashboard: {e}")
            return {'reports': [], 'total': 0, 'timestamp': datetime.now().isoformat()}

    def update_sos(self, report_id, status, assigned_to=None):
        """Update SOS report status (admin action)."""
        try:
            update_sos_status(report_id, status, assigned_to)
            return {'success': True, 'message': f'SOS report {report_id} updated to {status}'}
        except Exception as e:
            print(f"Error updating SOS: {e}")
            return {'success': False, 'message': str(e)}

    def get_safe_routes(self, lat, lon):
        """Get safe evacuation/navigation routes from current location."""
        try:
            routes = get_evacuation_routes()
            assembly = get_assembly_points()

            # Sort routes by proximity to user
            for route in routes:
                if route['coordinates'] and len(route['coordinates']) > 0:
                    start = route['coordinates'][0]
                    route['distance_from_user_km'] = round(
                        ((start[0] - lat) ** 2 + (start[1] - lon) ** 2) ** 0.5 * 111, 2
                    )
                else:
                    route['distance_from_user_km'] = 999

            routes.sort(key=lambda r: r.get('distance_from_user_km', 999))

            # Sort assembly points by proximity
            for point in assembly:
                coords = point['coordinates']
                point['distance_from_user_km'] = round(
                    ((coords[0] - lat) ** 2 + (coords[1] - lon) ** 2) ** 0.5 * 111, 2
                )
            assembly.sort(key=lambda p: p['distance_from_user_km'])

            return {
                'evacuation_routes': routes,
                'assembly_points': assembly,
                'nearest_route': routes[0] if routes else None,
                'nearest_assembly': assembly[0] if assembly else None,
                'user_location': {'lat': lat, 'lon': lon},
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error getting safe routes: {e}")
            return {'evacuation_routes': [], 'assembly_points': [], 'timestamp': datetime.now().isoformat()}

    def _get_relevant_contacts(self, emergency_type):
        """Get emergency contacts relevant to the emergency type."""
        contacts = get_emergency_contacts()
        category_map = {
            'medical': ['medical', 'disaster'],
            'fire': ['fire', 'disaster'],
            'security': ['law_enforcement', 'disaster'],
            'stampede': ['law_enforcement', 'disaster'],
            'flood': ['disaster'],
            'lost_person': ['law_enforcement', 'disaster'],
            'other': ['law_enforcement', 'disaster'],
        }
        relevant_categories = category_map.get(emergency_type, ['law_enforcement', 'disaster'])
        return [c for c in contacts if c['category'] in relevant_categories]

    def _get_nearest_assembly_point(self, lat, lon):
        """Get the nearest assembly point."""
        points = get_assembly_points()
        if not points:
            return None

        nearest = None
        min_dist = float('inf')
        for point in points:
            coords = point['coordinates']
            dist = ((coords[0] - lat) ** 2 + (coords[1] - lon) ** 2) ** 0.5 * 111
            if dist < min_dist:
                min_dist = dist
                nearest = point
                nearest['distance_km'] = round(dist, 2)
        return nearest
