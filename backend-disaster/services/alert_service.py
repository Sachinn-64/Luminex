"""
Alert Service - Data-driven alerts based on actual weather, earthquake, crowd, and traffic data.
Replaces random alert generation with threshold-based detection.
"""

import random
from datetime import datetime, timedelta
from config import Config
from services.data_store import save_alert, get_active_alerts, acknowledge_alert as db_acknowledge_alert, deactivate_expired_alerts


class AlertService:
    def __init__(self):
        self.config = Config()
        self._last_alert_check = {}  # Track when each alert type was last generated to avoid duplicates

    def get_all_alerts(self):
        """Get all active alerts from the database."""
        try:
            deactivate_expired_alerts()
            alerts = get_active_alerts(limit=50)

            return {
                'alerts': alerts,
                'total_alerts': len(alerts),
                'critical_alerts': len([a for a in alerts if a['priority'] == 'critical']),
                'high_priority_alerts': len([a for a in alerts if a['priority'] == 'high']),
                'last_updated': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error getting alerts: {e}")
            return {'alerts': [], 'total_alerts': 0, 'critical_alerts': 0, 'high_priority_alerts': 0}

    def get_critical_alerts(self):
        """Get only critical alerts."""
        try:
            all_alerts = self.get_all_alerts()
            return [a for a in all_alerts['alerts'] if a['priority'] == 'critical']
        except Exception as e:
            print(f"Error getting critical alerts: {e}")
            return []

    def check_and_generate_alerts(self, dashboard_data):
        """
        Check real data and generate alerts based on thresholds.
        This is the core method that replaces random alert generation.
        Called by the background task whenever data updates.
        """
        try:
            new_alerts = []

            # Weather-based alerts
            weather = dashboard_data.get('weather', {})
            if weather:
                new_alerts.extend(self._check_weather_alerts(weather))

            # Earthquake-based alerts
            earthquakes = dashboard_data.get('earthquakes', {})
            if earthquakes:
                new_alerts.extend(self._check_earthquake_alerts(earthquakes))

            # Crowd-based alerts
            crowd = dashboard_data.get('crowd', {})
            if crowd:
                new_alerts.extend(self._check_crowd_alerts(crowd))

            # Traffic-based alerts
            traffic = dashboard_data.get('traffic', {})
            if traffic:
                new_alerts.extend(self._check_traffic_alerts(traffic))

            # Save new alerts to database
            for alert in new_alerts:
                save_alert(alert)

            return new_alerts
        except Exception as e:
            print(f"Error checking alerts: {e}")
            return []

    def calculate_risk_score(self, dashboard_data):
        """Calculate overall risk score based on all data."""
        try:
            risk_factors = {
                'weather_risk': self._calculate_weather_risk(dashboard_data.get('weather', {})),
                'earthquake_risk': self._calculate_earthquake_risk(dashboard_data.get('earthquakes', {})),
                'crowd_risk': self._calculate_crowd_risk(dashboard_data.get('crowd', {})),
                'traffic_risk': self._calculate_traffic_risk(dashboard_data.get('traffic', {}))
            }

            weights = {
                'weather_risk': 0.25,
                'earthquake_risk': 0.20,
                'crowd_risk': 0.35,
                'traffic_risk': 0.20
            }

            total_risk_score = sum(risk_factors[factor] * weights[factor] for factor in risk_factors)
            normalized_score = min(100, max(0, total_risk_score * 100))

            return {
                'overall_score': round(normalized_score, 2),
                'risk_level': self._get_risk_level(normalized_score),
                'risk_factors': risk_factors,
                'weights': weights,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error calculating risk score: {e}")
            return {'overall_score': 0, 'risk_level': 'low', 'risk_factors': {}, 'weights': {}}

    def acknowledge_alert(self, alert_id, acknowledged_by):
        """Acknowledge an alert."""
        try:
            db_acknowledge_alert(alert_id, acknowledged_by)
            return {'success': True, 'message': f'Alert {alert_id} acknowledged'}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    # ─── Threshold-Based Alert Checks ─────────────────────────────────────

    def _should_generate(self, alert_key, cooldown_minutes=15):
        """Check if enough time has passed since the last alert of this type."""
        last = self._last_alert_check.get(alert_key)
        if last and (datetime.now() - last).total_seconds() < cooldown_minutes * 60:
            return False
        self._last_alert_check[alert_key] = datetime.now()
        return True

    def _create_alert(self, alert_type, message, priority, data=None, location=None, duration_hours=2):
        """Create an alert dict."""
        now = datetime.now()
        return {
            'id': f"alert_{alert_type}_{now.strftime('%Y%m%d%H%M%S')}_{random.randint(100,999)}",
            'type': alert_type,
            'message': message,
            'priority': priority,
            'location': location or 'Pandharpur, Maharashtra',
            'data': data or {},
            'status': 'active',
            'timestamp': now.isoformat(),
            'expires_at': (now + timedelta(hours=duration_hours)).isoformat()
        }

    def _check_weather_alerts(self, weather_data):
        """Generate weather alerts based on actual weather data."""
        alerts = []

        temp = weather_data.get('temperature', 25)
        humidity = weather_data.get('humidity', 50)
        wind_speed = weather_data.get('wind_speed', 5)
        visibility = weather_data.get('visibility', 10000)
        description = weather_data.get('description', '').lower()

        # Heat wave alert
        if temp > 42 and self._should_generate('heat_critical'):
            alerts.append(self._create_alert(
                'weather', f'EXTREME HEAT WARNING: Temperature {temp:.1f}°C with {humidity}% humidity. Heat stroke risk is very high.',
                'critical', {'temperature': temp, 'humidity': humidity}
            ))
        elif temp > 38 and self._should_generate('heat_high'):
            alerts.append(self._create_alert(
                'weather', f'Heat advisory: Temperature {temp:.1f}°C. Stay hydrated and seek shade.',
                'high', {'temperature': temp, 'humidity': humidity}
            ))

        # Storm/rain alerts
        if 'thunderstorm' in description and self._should_generate('storm'):
            alerts.append(self._create_alert(
                'weather', f'Thunderstorm warning: {description}. Seek shelter immediately.',
                'high', {'description': description, 'wind_speed': wind_speed}
            ))
        elif 'heavy rain' in description or 'rain' in description and self._should_generate('rain'):
            alerts.append(self._create_alert(
                'weather', f'Rain alert: {description}. Slippery conditions expected.',
                'moderate', {'description': description}
            ))

        # High wind alert
        if wind_speed > 40 and self._should_generate('wind_critical'):
            alerts.append(self._create_alert(
                'weather', f'SEVERE WIND WARNING: Wind speed {wind_speed} km/h. Temporary structures at risk.',
                'critical', {'wind_speed': wind_speed}
            ))
        elif wind_speed > 25 and self._should_generate('wind_high'):
            alerts.append(self._create_alert(
                'weather', f'High wind advisory: Wind speed {wind_speed} km/h.',
                'moderate', {'wind_speed': wind_speed}
            ))

        # Low visibility
        if visibility < 2000 and self._should_generate('visibility'):
            alerts.append(self._create_alert(
                'weather', f'Low visibility warning: {visibility}m. Navigation and crowd management affected.',
                'high', {'visibility': visibility}
            ))

        return alerts

    def _check_earthquake_alerts(self, earthquake_data):
        """Generate earthquake alerts based on actual USGS data."""
        alerts = []
        quakes = earthquake_data.get('earthquakes', []) if isinstance(earthquake_data, dict) else earthquake_data if isinstance(earthquake_data, list) else []

        for quake in quakes[:5]:  # Check last 5 earthquakes
            mag = quake.get('magnitude', 0)
            place = quake.get('place', 'Unknown')
            quake_time = quake.get('time', '')

            # Only alert on recent earthquakes (last 2 hours)
            try:
                qt = datetime.fromisoformat(quake_time.replace('Z', '+00:00')) if quake_time else None
                if qt and (datetime.now() - qt.replace(tzinfo=None)).total_seconds() > 7200:
                    continue
            except (ValueError, TypeError):
                pass

            alert_key = f"eq_{quake.get('id', mag)}"

            if mag >= 5.0 and self._should_generate(alert_key, cooldown_minutes=60):
                alerts.append(self._create_alert(
                    'earthquake',
                    f'MAJOR EARTHQUAKE: Magnitude {mag:.1f} at {place}. Evacuate immediately.',
                    'critical', {'magnitude': mag, 'place': place, 'time': quake_time},
                    duration_hours=6
                ))
            elif mag >= 4.0 and self._should_generate(alert_key, cooldown_minutes=30):
                alerts.append(self._create_alert(
                    'earthquake',
                    f'Earthquake alert: Magnitude {mag:.1f} at {place}. Monitor for aftershocks.',
                    'high', {'magnitude': mag, 'place': place, 'time': quake_time}
                ))
            elif mag >= 3.0 and self._should_generate(alert_key, cooldown_minutes=30):
                alerts.append(self._create_alert(
                    'earthquake',
                    f'Minor tremor: Magnitude {mag:.1f} detected at {place}.',
                    'moderate', {'magnitude': mag, 'place': place, 'time': quake_time}
                ))

        return alerts

    def _check_crowd_alerts(self, crowd_data):
        """Generate crowd alerts based on actual crowd density data."""
        alerts = []
        zones = crowd_data.get('zones', [])
        threshold = self.config.CROWD_DENSITY_THRESHOLD

        for zone in zones:
            density = zone.get('current_density', 0)
            zone_name = zone.get('name', 'Unknown Zone')
            alert_key = f"crowd_{zone.get('id', zone_name)}"

            if density >= 0.95 and self._should_generate(f'{alert_key}_critical', cooldown_minutes=10):
                alerts.append(self._create_alert(
                    'crowd',
                    f'CRITICAL: {zone_name} at {density*100:.0f}% capacity. Stampede risk! Implement crowd control immediately.',
                    'critical', {'density': density, 'zone': zone_name, 'risk': 'stampede'},
                    location=zone_name
                ))
            elif density >= threshold and self._should_generate(f'{alert_key}_high', cooldown_minutes=15):
                alerts.append(self._create_alert(
                    'crowd',
                    f'High crowd density at {zone_name}: {density*100:.0f}% capacity. Deploy additional personnel.',
                    'high', {'density': density, 'zone': zone_name},
                    location=zone_name
                ))

        # Check for anomalies
        for zone in zones:
            anomalies = zone.get('anomalies', [])
            for anomaly in anomalies:
                if anomaly.get('severity') in ['high', 'critical']:
                    akey = f"anomaly_{zone.get('id', '')}_{anomaly.get('type', '')}"
                    if self._should_generate(akey, cooldown_minutes=20):
                        alerts.append(self._create_alert(
                            'crowd',
                            f"Anomaly in {zone.get('name', 'Unknown')}: {anomaly.get('description', anomaly.get('type', 'Unknown anomaly'))}",
                            'high', anomaly,
                            location=zone.get('name')
                        ))

        return alerts

    def _check_traffic_alerts(self, traffic_data):
        """Generate traffic alerts based on actual traffic conditions."""
        alerts = []
        routes = traffic_data.get('routes', [])

        for route in routes:
            congestion = route.get('congestion_level', 'low')
            route_name = route.get('name', 'Unknown Route')
            alert_key = f"traffic_{route.get('id', route_name)}"

            if route.get('status') == 'closed' and self._should_generate(f'{alert_key}_closed', cooldown_minutes=30):
                alerts.append(self._create_alert(
                    'traffic',
                    f'Route CLOSED: {route_name}. Use alternate routes.',
                    'critical', {'route': route_name, 'status': 'closed'},
                    duration_hours=4
                ))
            elif congestion == 'severe' and self._should_generate(f'{alert_key}_severe', cooldown_minutes=20):
                delay = route.get('current_travel_time', 0) - route.get('normal_travel_time', 0)
                alerts.append(self._create_alert(
                    'traffic',
                    f'Severe congestion on {route_name}. Estimated delay: {delay} minutes.',
                    'high', {'route': route_name, 'congestion': congestion, 'delay_minutes': delay}
                ))

        # Emergency vehicle access
        emergency_routes = [r for r in routes if r.get('status') == 'open' and r.get('congestion_level') == 'low']
        if len(routes) > 0 and len(emergency_routes) == 0 and self._should_generate('no_emergency_routes', cooldown_minutes=15):
            alerts.append(self._create_alert(
                'traffic',
                'WARNING: No clear emergency vehicle routes available. All routes congested.',
                'critical', {'total_routes': len(routes), 'clear_routes': 0}
            ))

        return alerts

    # ─── Risk Calculations ────────────────────────────────────────────────

    def _calculate_weather_risk(self, weather_data):
        if not weather_data:
            return 0.1
        risk_score = 0.0
        temp = weather_data.get('temperature', 25)
        if temp > 42:
            risk_score += 0.5
        elif temp > 38:
            risk_score += 0.3
        elif temp > 35:
            risk_score += 0.15
        humidity = weather_data.get('humidity', 50)
        if humidity > 85:
            risk_score += 0.2
        elif humidity > 75:
            risk_score += 0.1
        wind_speed = weather_data.get('wind_speed', 5)
        if wind_speed > 40:
            risk_score += 0.4
        elif wind_speed > 25:
            risk_score += 0.2
        visibility = weather_data.get('visibility', 10000)
        if visibility < 2000:
            risk_score += 0.3
        elif visibility < 5000:
            risk_score += 0.15
        return min(1.0, risk_score)

    def _calculate_earthquake_risk(self, earthquakes):
        if not earthquakes:
            return 0.05
        risk_score = 0.0
        quake_list = earthquakes.get('earthquakes', []) if isinstance(earthquakes, dict) else earthquakes if isinstance(earthquakes, list) else []
        for earthquake in quake_list[:5]:
            magnitude = earthquake.get('magnitude', 0)
            if magnitude >= 5.0:
                risk_score += 0.5
            elif magnitude >= 4.0:
                risk_score += 0.25
            elif magnitude >= 3.0:
                risk_score += 0.1
        return min(1.0, risk_score)

    def _calculate_crowd_risk(self, crowd_data):
        if not crowd_data:
            return 0.1
        risk_score = 0.0
        overall_metrics = crowd_data.get('overall_metrics', {})
        occupancy = overall_metrics.get('occupancy_percentage', 0)
        if occupancy > 90:
            risk_score += 0.6
        elif occupancy > 75:
            risk_score += 0.35
        elif occupancy > 60:
            risk_score += 0.15
        zones = crowd_data.get('zones', [])
        critical_zones = len([z for z in zones if z.get('risk_level') in ['high', 'critical']])
        if critical_zones >= 3:
            risk_score += 0.4
        elif critical_zones >= 1:
            risk_score += 0.2
        return min(1.0, risk_score)

    def _calculate_traffic_risk(self, traffic_data):
        if not traffic_data:
            return 0.1
        risk_score = 0.0
        overall = traffic_data.get('overall_conditions', {})
        level = overall.get('overall_level', 'good')
        if level == 'severe':
            risk_score += 0.5
        elif level == 'poor':
            risk_score += 0.3
        elif level == 'moderate':
            risk_score += 0.15
        bottlenecks = traffic_data.get('bottlenecks', [])
        if len(bottlenecks) >= 3:
            risk_score += 0.3
        elif len(bottlenecks) >= 1:
            risk_score += 0.15
        return min(1.0, risk_score)

    def _get_priority_score(self, priority):
        return {'critical': 4, 'high': 3, 'moderate': 2, 'low': 1}.get(priority, 0)

    def _get_risk_level(self, score):
        if score >= 80:
            return 'critical'
        elif score >= 60:
            return 'high'
        elif score >= 40:
            return 'moderate'
        elif score >= 20:
            return 'low'
        else:
            return 'minimal'
