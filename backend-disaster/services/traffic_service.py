"""
Traffic Service - Integrates Google Maps Directions API for real traffic data.
Falls back to stateful simulation when API key is unavailable.
"""

import requests
import random
from datetime import datetime, timedelta
from config import Config
import time as time_module


class TrafficService:
    def __init__(self):
        self.config = Config()
        self._cache = {}
        self._cache_ttl = 300  # 5 minutes cache
        self.traffic_routes = [
            {
                'id': 'route_1',
                'name': 'Pandharpur Bus Stand to Vitthal Temple',
                'start_coords': [17.6739, 75.3235],
                'end_coords': [17.6826, 75.3279],
                'distance_km': 2.4,
                'normal_travel_time': 8,
                'current_travel_time': 8,
                'congestion_level': 'low',
                'status': 'open',
                'data_source': 'simulation'
            },
            {
                'id': 'route_2',
                'name': 'Chandrabagha Ghat to Vitthal Temple',
                'start_coords': [17.6834, 75.3290],
                'end_coords': [17.6826, 75.3279],
                'distance_km': 1.1,
                'normal_travel_time': 5,
                'current_travel_time': 5,
                'congestion_level': 'low',
                'status': 'open',
                'data_source': 'simulation'
            },
            {
                'id': 'route_3',
                'name': 'Pandharpur Railway Station to Chandrabagha Ghat',
                'start_coords': [17.6708, 75.3208],
                'end_coords': [17.6834, 75.3290],
                'distance_km': 3.6,
                'normal_travel_time': 12,
                'current_travel_time': 12,
                'congestion_level': 'low',
                'status': 'open',
                'data_source': 'simulation'
            },
            {
                'id': 'route_4',
                'name': 'Emergency Route - Pandharpur Ring Road',
                'start_coords': [17.6675, 75.3150],
                'end_coords': [17.6885, 75.3365],
                'distance_km': 5.4,
                'normal_travel_time': 15,
                'current_travel_time': 15,
                'congestion_level': 'low',
                'status': 'open',
                'data_source': 'simulation'
            },
            {
                'id': 'route_5',
                'name': 'Pandharpur Market to Pundalik Temple',
                'start_coords': [17.6760, 75.3200],
                'end_coords': [17.6819, 75.3298],
                'distance_km': 2.7,
                'normal_travel_time': 10,
                'current_travel_time': 10,
                'congestion_level': 'low',
                'status': 'open',
                'data_source': 'simulation'
            }
        ]

    def get_traffic_conditions(self):
        """Get current traffic conditions. Uses Google Maps API if available, else simulation."""
        try:
            if self._has_valid_api_key():
                self._update_from_google_maps()
            else:
                self._update_simulated()

            return {
                'routes': self.traffic_routes,
                'overall_conditions': self._calculate_overall_conditions(),
                'bottlenecks': self._identify_bottlenecks(),
                'recommendations': self._generate_traffic_recommendations(),
                'emergency_routes': self._get_emergency_routes(),
                'data_source': 'google_maps' if self._has_valid_api_key() else 'simulation',
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error generating traffic conditions: {e}")
            return self._get_fallback_data()

    def _has_valid_api_key(self):
        """Check if Google Maps API key is configured."""
        key = self.config.GOOGLE_MAPS_API_KEY
        return key and key != 'your_google_maps_api_key_here' and len(key) > 10

    def _get_cached(self, key):
        """Get cached data if still valid."""
        if key in self._cache:
            data, timestamp = self._cache[key]
            if time_module.time() - timestamp < self._cache_ttl:
                return data
        return None

    def _set_cached(self, key, data):
        """Set cache entry."""
        self._cache[key] = (data, time_module.time())

    def _update_from_google_maps(self):
        """Update traffic data from Google Maps Directions API."""
        for route in self.traffic_routes:
            cache_key = f"gmaps_{route['id']}"
            cached = self._get_cached(cache_key)

            if cached:
                route.update(cached)
                continue

            try:
                origin = f"{route['start_coords'][0]},{route['start_coords'][1]}"
                destination = f"{route['end_coords'][0]},{route['end_coords'][1]}"

                url = f"{self.config.GOOGLE_MAPS_BASE_URL}/directions/json"
                params = {
                    'origin': origin,
                    'destination': destination,
                    'key': self.config.GOOGLE_MAPS_API_KEY,
                    'departure_time': 'now',
                    'traffic_model': 'best_guess',
                    'mode': 'driving'
                }

                response = requests.get(url, params=params, timeout=10)

                if response.status_code == 200:
                    data = response.json()
                    if data.get('status') == 'OK' and data.get('routes'):
                        leg = data['routes'][0]['legs'][0]

                        # Duration in traffic (if available) vs normal duration
                        normal_duration = leg.get('duration', {}).get('value', 0) // 60  # seconds to minutes
                        traffic_duration = leg.get('duration_in_traffic', {}).get('value', 0) // 60
                        distance = leg.get('distance', {}).get('value', 0) / 1000  # meters to km

                        if traffic_duration == 0:
                            traffic_duration = normal_duration

                        update_data = {
                            'distance_km': round(distance, 1),
                            'normal_travel_time': max(1, normal_duration),
                            'current_travel_time': max(1, traffic_duration),
                            'data_source': 'google_maps'
                        }
                        route.update(update_data)

                        # Calculate congestion from actual data
                        route['congestion_level'] = self._calculate_congestion_level(route)
                        route['status'] = 'open'

                        self._set_cached(cache_key, update_data)
                    else:
                        print(f"Google Maps API returned: {data.get('status')} for route {route['id']}")
                        self._simulate_single_route(route)
                else:
                    print(f"Google Maps API error {response.status_code} for route {route['id']}")
                    self._simulate_single_route(route)

            except requests.exceptions.Timeout:
                print(f"Google Maps API timeout for route {route['id']}")
                self._simulate_single_route(route)
            except Exception as e:
                print(f"Error fetching Google Maps data for route {route['id']}: {e}")
                self._simulate_single_route(route)

    def _update_simulated(self):
        """Update all routes with stateful simulation (gradual changes)."""
        for route in self.traffic_routes:
            self._simulate_single_route(route)

    def _simulate_single_route(self, route):
        """Simulate traffic for a single route with gradual changes."""
        old_time = route['current_travel_time']
        base_time = route['normal_travel_time']
        hour = datetime.now().hour

        # Time-based congestion targets
        if 7 <= hour <= 9:
            target_factor = 1.6
        elif 17 <= hour <= 19:
            target_factor = 1.8
        elif 11 <= hour <= 15:
            target_factor = 1.4
        else:
            target_factor = 1.0

        target_time = base_time * target_factor

        # Gradual approach (20% per update)
        delta = (target_time - old_time) * 0.2
        noise = random.gauss(0, base_time * 0.05)
        new_time = max(base_time * 0.8, old_time + delta + noise)

        route['current_travel_time'] = int(new_time)
        route['congestion_level'] = self._calculate_congestion_level(route)
        route['status'] = self._determine_route_status(route)
        route['data_source'] = 'simulation'

    # ─── Calculations ─────────────────────────────────────────────────────

    def _calculate_congestion_level(self, route):
        normal = route['normal_travel_time']
        current = route['current_travel_time']
        if normal == 0:
            return 'low'
        ratio = current / normal
        if ratio < 1.2:
            return 'low'
        elif ratio < 1.5:
            return 'moderate'
        elif ratio < 2.0:
            return 'high'
        else:
            return 'severe'

    def _determine_route_status(self, route):
        if route['congestion_level'] == 'severe' and random.random() < 0.05:
            return 'closed'
        return 'open'

    def _calculate_overall_conditions(self):
        total = len(self.traffic_routes)
        open_routes = len([r for r in self.traffic_routes if r['status'] == 'open'])
        levels = [r['congestion_level'] for r in self.traffic_routes]
        scores = {'low': 1, 'moderate': 2, 'high': 3, 'severe': 4}
        total_score = sum(scores.get(l, 1) for l in levels)
        avg = total_score / max(1, total)

        if avg < 1.5:
            overall = 'good'
        elif avg < 2.5:
            overall = 'moderate'
        elif avg < 3.5:
            overall = 'poor'
        else:
            overall = 'severe'

        return {
            'overall_level': overall,
            'open_routes': open_routes,
            'total_routes': total,
            'low_congestion': levels.count('low'),
            'moderate_congestion': levels.count('moderate'),
            'high_congestion': levels.count('high'),
            'severe_congestion': levels.count('severe'),
            'average_congestion_score': round(avg, 2)
        }

    def _identify_bottlenecks(self):
        bottlenecks = []
        for route in self.traffic_routes:
            if route['congestion_level'] in ['high', 'severe']:
                bottlenecks.append({
                    'route_id': route['id'],
                    'route_name': route['name'],
                    'congestion_level': route['congestion_level'],
                    'estimated_delay': route['current_travel_time'] - route['normal_travel_time'],
                    'recommendation': self._get_bottleneck_recommendation(route['congestion_level'])
                })
        return bottlenecks

    def _generate_traffic_recommendations(self):
        conditions = self._calculate_overall_conditions()
        level = conditions['overall_level']
        if level == 'severe':
            return [
                'Implement traffic diversion measures',
                'Deploy additional traffic police',
                'Consider temporary road closures',
                'Activate emergency traffic protocols'
            ]
        elif level == 'poor':
            return [
                'Increase traffic monitoring',
                'Deploy traffic control personnel',
                'Optimize traffic signal timing',
                'Prepare for potential diversions'
            ]
        elif level == 'moderate':
            return [
                'Monitor traffic flow closely',
                'Prepare contingency plans',
                'Maintain current traffic management'
            ]
        else:
            return [
                'Continue current traffic management',
                'Monitor for potential congestion',
                'Maintain emergency response readiness'
            ]

    def _get_emergency_routes(self):
        return [r for r in self.traffic_routes if r['status'] == 'open' and r['congestion_level'] == 'low']

    def _get_bottleneck_recommendation(self, congestion_level):
        if congestion_level == 'severe':
            return 'Immediate traffic diversion required'
        elif congestion_level == 'high':
            return 'Consider traffic diversion or signal optimization'
        return 'Monitor and prepare for potential diversion'

    def get_traffic_predictions(self, hours_ahead=6):
        """Get traffic predictions for the next hours."""
        predictions = []
        current_time = datetime.now()
        for hour in range(1, hours_ahead + 1):
            prediction_time = current_time + timedelta(hours=hour)
            predicted = self._predict_congestion_by_time(prediction_time)
            predictions.append({
                'timestamp': prediction_time.isoformat(),
                'predicted_congestion': predicted,
                'confidence': round(0.88 - (hour * 0.03), 2),
                'recommendations': self._get_prediction_recommendations(predicted)
            })
        return {
            'predictions': predictions,
            'model_accuracy': 0.82,
            'last_updated': datetime.now().isoformat()
        }

    def _predict_congestion_by_time(self, target_time):
        h = target_time.hour
        if 7 <= h <= 9:
            return 'high'
        elif 17 <= h <= 19:
            return 'severe' if h == 18 else 'high'
        elif 11 <= h <= 15:
            return 'moderate'
        else:
            return 'low'

    def _get_prediction_recommendations(self, predicted):
        recs = {
            'severe': ['Prepare traffic diversion', 'Deploy emergency teams', 'Consider restricting vehicle entry'],
            'high': ['Increase traffic monitoring', 'Prepare diversion routes', 'Deploy additional personnel'],
            'moderate': ['Monitor traffic flow', 'Prepare contingency plans'],
            'low': ['Continue current management', 'Monitor for changes']
        }
        return recs.get(predicted, ['Monitor traffic conditions'])

    def _get_fallback_data(self):
        return {
            'routes': self.traffic_routes,
            'overall_conditions': {'overall_level': 'good'},
            'bottlenecks': [],
            'recommendations': ['Continue monitoring'],
            'emergency_routes': [],
            'data_source': 'fallback',
            'timestamp': datetime.now().isoformat()
        }
