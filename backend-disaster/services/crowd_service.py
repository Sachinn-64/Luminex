"""
Crowd Service - Stateful simulation with persistent state, gradual changes,
and external data ingestion support. Supports multiple cities.
"""

import copy
import numpy as np
import random
from datetime import datetime, timedelta
from config import Config


# City-specific crowd zone definitions
CITY_ZONES = {
    'prayagraj': [
        {
            'id': 'zone_1',
            'name': 'Main Ghat Area',
            'coordinates': [25.4209, 81.8848],
            'capacity': 100000,
            'current_density': 0.3,
            'flow_direction': 'north',
            'flow_rate': 500,
            'risk_level': 'low',
            'anomalies': [],
            'data_source': 'simulation'
        },
        {
            'id': 'zone_2',
            'name': 'Prayagraj Fort',
            'coordinates': [25.4301, 81.8762],
            'capacity': 50000,
            'current_density': 0.2,
            'flow_direction': 'south',
            'flow_rate': 300,
            'risk_level': 'low',
            'anomalies': [],
            'data_source': 'simulation'
        },
        {
            'id': 'zone_3',
            'name': 'Triveni Sangam',
            'coordinates': [25.4200, 81.8845],
            'capacity': 150000,
            'current_density': 0.4,
            'flow_direction': 'east',
            'flow_rate': 700,
            'risk_level': 'low',
            'anomalies': [],
            'data_source': 'simulation'
        },
        {
            'id': 'zone_4',
            'name': 'Anand Bhavan',
            'coordinates': [25.4486, 81.8368],
            'capacity': 30000,
            'current_density': 0.15,
            'flow_direction': 'west',
            'flow_rate': 200,
            'risk_level': 'low',
            'anomalies': [],
            'data_source': 'simulation'
        },
        {
            'id': 'zone_5',
            'name': 'Sector 1 Camp Area',
            'coordinates': [25.4380, 81.8490],
            'capacity': 60000,
            'current_density': 0.25,
            'flow_direction': 'north',
            'flow_rate': 350,
            'risk_level': 'low',
            'anomalies': [],
            'data_source': 'simulation'
        },
        {
            'id': 'zone_6',
            'name': 'Parking & Entry Zone',
            'coordinates': [25.4450, 81.8350],
            'capacity': 40000,
            'current_density': 0.2,
            'flow_direction': 'south',
            'flow_rate': 400,
            'risk_level': 'low',
            'anomalies': [],
            'data_source': 'simulation'
        }
    ],
    'pandharpur': [
        {
            'id': 'zone_1',
            'name': 'Vitthal Temple Complex',
            'coordinates': [17.6826, 75.3279],
            'capacity': 150000,
            'current_density': 0.55,
            'flow_direction': 'east',
            'flow_rate': 800,
            'risk_level': 'moderate',
            'anomalies': [],
            'data_source': 'simulation'
        },
        {
            'id': 'zone_2',
            'name': 'Chandrabagha Ghat',
            'coordinates': [17.6834, 75.3290],
            'capacity': 80000,
            'current_density': 0.40,
            'flow_direction': 'south',
            'flow_rate': 600,
            'risk_level': 'low',
            'anomalies': [],
            'data_source': 'simulation'
        },
        {
            'id': 'zone_3',
            'name': 'Namdev Gate Entrance',
            'coordinates': [17.6797, 75.3267],
            'capacity': 100000,
            'current_density': 0.35,
            'flow_direction': 'north',
            'flow_rate': 700,
            'risk_level': 'low',
            'anomalies': [],
            'data_source': 'simulation'
        },
        {
            'id': 'zone_4',
            'name': 'Pundalik Temple Area',
            'coordinates': [17.6819, 75.3298],
            'capacity': 50000,
            'current_density': 0.30,
            'flow_direction': 'west',
            'flow_rate': 300,
            'risk_level': 'low',
            'anomalies': [],
            'data_source': 'simulation'
        },
        {
            'id': 'zone_5',
            'name': 'Pandharpur Market Bazaar',
            'coordinates': [17.6760, 75.3200],
            'capacity': 60000,
            'current_density': 0.45,
            'flow_direction': 'north',
            'flow_rate': 300,
            'risk_level': 'moderate',
            'anomalies': [],
            'data_source': 'simulation'
        }
    ]
}

# Zone-specific crowd multipliers per city
ZONE_FACTORS = {
    'prayagraj': {
        'zone_1': 1.0,   # Main Ghat
        'zone_2': 0.7,   # Fort
        'zone_3': 1.2,   # Sangam - most crowded
        'zone_4': 0.5,   # Anand Bhavan
        'zone_5': 0.8,   # Camp area
        'zone_6': 0.6,   # Parking
    },
    'pandharpur': {
        'zone_1': 1.4,   # Vitthal Temple - highest concentration during Wari
        'zone_2': 1.1,   # Chandrabagha Ghat - bathing site
        'zone_3': 1.2,   # Namdev Gate - main entry point
        'zone_4': 0.7,   # Pundalik Temple - secondary site
        'zone_5': 0.9,   # Market bazaar
    }
}


class CrowdService:
    def __init__(self):
        self.config = Config()
        # Per-city state: crowd zones and density history
        self._city_zones = {}
        self._density_history = {}
        self._last_history_save = {}

        for city_id in CITY_ZONES:
            self._city_zones[city_id] = copy.deepcopy(CITY_ZONES[city_id])
            for zone in self._city_zones[city_id]:
                zone['last_updated'] = datetime.now().isoformat()
            self._density_history[city_id] = {z['id']: [] for z in self._city_zones[city_id]}
            self._last_history_save[city_id] = datetime.now() - timedelta(minutes=30)

    @property
    def crowd_zones(self):
        """Default property for backwards compat — returns Pandharpur zones."""
        return self._city_zones.get('pandharpur', [])

    def update_zone_from_external(self, zone_id, density, source='external', city='pandharpur'):
        """Update a zone's density from an external data source (e.g., CCTV crowd detection)."""
        for zone in self._city_zones.get(city, []):
            if zone['id'] == zone_id:
                old_density = zone['current_density']
                zone['current_density'] = max(0.0, min(1.0, density))
                zone['risk_level'] = self._calculate_risk_level(zone['current_density'])
                zone['data_source'] = source
                zone['last_updated'] = datetime.now().isoformat()

                if abs(density - old_density) > 0.3:
                    zone['anomalies'] = [{
                        'type': 'sudden_density_change',
                        'severity': 'high' if abs(density - old_density) > 0.5 else 'moderate',
                        'timestamp': datetime.now().isoformat(),
                        'description': f'Density changed from {old_density:.0%} to {density:.0%} in {zone["name"]}',
                        'old_value': old_density,
                        'new_value': density
                    }]
                else:
                    zone['anomalies'] = []
                return True
        return False

    def get_crowd_analytics(self, city='pandharpur'):
        """Get comprehensive crowd analytics data for a city."""
        try:
            zones = self._city_zones.get(city, self._city_zones.get('pandharpur', []))
            self._update_simulated_zones(city)
            self._save_history_if_needed(city)

            return {
                'city': city,
                'zones': zones,
                'overall_metrics': self._calculate_overall_metrics(zones),
                'risk_assessment': self._assess_overall_risk(zones),
                'predictions': self._generate_predictions(zones),
                'heatmap_data': self._generate_heatmap_data(zones),
                'flow_analysis': self._analyze_flow_patterns(zones),
                'density_history': self._get_recent_history(city),
                'data_source': 'simulation',
                'data_note': 'Crowd densities are time-of-day predictive estimates. No real-time sensor or API data is available for this location.',
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error generating crowd analytics: {e}")
            return self._get_fallback_data(city)

    def get_stampede_risk_assessment(self, city='pandharpur'):
        """Get stampede risk assessment based on current state."""
        try:
            zones = self._city_zones.get(city, [])
            risk_factors = {
                'crowd_density': self._calculate_average_density(zones),
                'max_zone_density': max((z['current_density'] for z in zones), default=0),
                'weather_conditions': self._get_weather_impact(),
                'time_of_day': self._get_time_impact(),
                'infrastructure': self._assess_infrastructure(zones),
                'emergency_access': self._assess_emergency_access(zones)
            }

            overall_risk = self._calculate_stampede_risk(risk_factors)

            return {
                'city': city,
                'risk_level': overall_risk['level'],
                'risk_score': overall_risk['score'],
                'risk_factors': risk_factors,
                'recommendations': self._get_stampede_recommendations(overall_risk['score']),
                'critical_zones': self._identify_critical_zones(zones),
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error calculating stampede risk: {e}")
            return {'city': city, 'risk_level': 'low', 'risk_score': 0.2, 'timestamp': datetime.now().isoformat()}

    # ─── Stateful Simulation ──────────────────────────────────────────────

    def _update_simulated_zones(self, city='pandharpur'):
        """Gradually update densities for simulated zones."""
        hour = datetime.now().hour
        base_target = self._get_base_density_for_hour(hour)
        factors = ZONE_FACTORS.get(city, {})

        for zone in self._city_zones.get(city, []):
            if zone['data_source'] == 'external':
                try:
                    last = datetime.fromisoformat(zone['last_updated'])
                    if (datetime.now() - last).total_seconds() < 300:
                        continue
                    else:
                        zone['data_source'] = 'simulation'
                except (ValueError, TypeError):
                    pass

            old_density = zone['current_density']
            zone_factor = factors.get(zone['id'], 1.0)
            target_density = min(1.0, base_target * zone_factor)

            delta = (target_density - old_density) * 0.1
            noise = random.gauss(0, 0.02)
            new_density = max(0.0, min(1.0, old_density + delta + noise))

            zone['current_density'] = round(new_density, 4)
            zone['risk_level'] = self._calculate_risk_level(new_density)
            zone['flow_rate'] = max(50, int(new_density * zone['capacity'] * 0.002 + random.gauss(0, 20)))
            zone['last_updated'] = datetime.now().isoformat()

            if abs(new_density - old_density) > 0.15:
                zone['anomalies'] = [{
                    'type': 'rapid_change',
                    'severity': 'moderate',
                    'timestamp': datetime.now().isoformat(),
                    'description': f'Rapid density change in {zone["name"]}'
                }]
            else:
                zone['anomalies'] = []

    def _get_base_density_for_hour(self, hour):
        """Get base crowd density target for the time of day (Wari pattern)."""
        patterns = {
            0: 0.15, 1: 0.10, 2: 0.08, 3: 0.07, 4: 0.10,
            5: 0.25, 6: 0.45, 7: 0.60, 8: 0.70, 9: 0.75,
            10: 0.80, 11: 0.85, 12: 0.82, 13: 0.78, 14: 0.75,
            15: 0.73, 16: 0.70, 17: 0.75, 18: 0.72, 19: 0.65,
            20: 0.50, 21: 0.35, 22: 0.25, 23: 0.18
        }
        return patterns.get(hour, 0.5)

    def _save_history_if_needed(self, city='pandharpur'):
        """Save density snapshots for trend tracking."""
        now = datetime.now()
        last_save = self._last_history_save.get(city, now - timedelta(minutes=31))
        if (now - last_save) >= timedelta(minutes=30):
            for zone in self._city_zones.get(city, []):
                history = self._density_history.get(city, {}).get(zone['id'], [])
                history.append({
                    'timestamp': now.isoformat(),
                    'density': zone['current_density'],
                    'risk_level': zone['risk_level']
                })
                if len(history) > 48:
                    history = history[-48:]
                if city in self._density_history:
                    self._density_history[city][zone['id']] = history
            self._last_history_save[city] = now

    def _get_recent_history(self, city='pandharpur'):
        """Get recent density history for trend charts."""
        return {
            zone_id: entries[-24:]
            for zone_id, entries in self._density_history.get(city, {}).items()
        }

    # ─── Calculations ─────────────────────────────────────────────────────

    def _calculate_risk_level(self, density):
        if density < 0.3:
            return 'low'
        elif density < 0.6:
            return 'moderate'
        elif density < 0.85:
            return 'high'
        else:
            return 'critical'

    def _calculate_overall_metrics(self, zones):
        total_capacity = sum(z['capacity'] for z in zones)
        total_current = sum(z['capacity'] * z['current_density'] for z in zones)
        densities = [z['current_density'] for z in zones]
        return {
            'total_capacity': total_capacity,
            'current_occupancy': int(total_current),
            'occupancy_percentage': round((total_current / total_capacity) * 100, 1) if total_capacity > 0 else 0,
            'average_density': round(float(np.mean(densities)), 4) if densities else 0,
            'max_density': round(float(max(densities)), 4) if densities else 0,
            'min_density': round(float(min(densities)), 4) if densities else 0,
            'zones_at_capacity': len([z for z in zones if z['current_density'] > 0.9]),
            'total_zones': len(zones)
        }

    def _assess_overall_risk(self, zones):
        high_risk_zones = len([z for z in zones if z['risk_level'] in ['high', 'critical']])
        total_zones = len(zones)
        if high_risk_zones == 0:
            overall = 'low'
        elif high_risk_zones <= total_zones * 0.25:
            overall = 'moderate'
        elif high_risk_zones <= total_zones * 0.5:
            overall = 'high'
        else:
            overall = 'critical'
        return {
            'level': overall,
            'high_risk_zones': high_risk_zones,
            'total_zones': total_zones,
            'risk_percentage': round((high_risk_zones / total_zones) * 100, 1) if total_zones > 0 else 0
        }

    def _generate_predictions(self, zones):
        """Generate predictions based on current trends and time patterns."""
        current_avg = self._calculate_average_density(zones)
        hour = datetime.now().hour
        predictions = {}
        for offset, label in [(1, 'next_hour'), (3, 'next_3_hours'), (6, 'next_6_hours')]:
            future_hour = (hour + offset) % 24
            target = self._get_base_density_for_hour(future_hour)
            predicted = current_avg * 0.4 + target * 0.6
            predictions[label] = {
                'predicted_density': round(predicted, 3),
                'confidence': round(0.92 - (offset * 0.04), 2),
                'risk_level': self._calculate_risk_level(predicted)
            }
        return predictions

    def _generate_heatmap_data(self, zones):
        heatmap_data = []
        for zone in zones:
            for _ in range(5):
                lat_offset = random.gauss(0, 0.003)
                lon_offset = random.gauss(0, 0.003)
                heatmap_data.append({
                    'lat': zone['coordinates'][0] + lat_offset,
                    'lng': zone['coordinates'][1] + lon_offset,
                    'intensity': zone['current_density'],
                    'zone_id': zone['id']
                })
        return heatmap_data

    def _analyze_flow_patterns(self, zones):
        directions = [z['flow_direction'] for z in zones]
        bottlenecks = []
        for zone in zones:
            if zone['current_density'] > 0.8:
                bottlenecks.append({
                    'location': zone['name'],
                    'severity': 'severe' if zone['current_density'] > 0.9 else 'moderate',
                    'estimated_delay': f"{int(zone['current_density'] * 25)} minutes",
                    'density': zone['current_density']
                })
        total_flow = sum(z['flow_rate'] for z in zones)
        return {
            'primary_directions': list(set(directions)),
            'bottlenecks': bottlenecks,
            'total_flow_rate': total_flow,
            'flow_efficiency': round(1.0 - (len(bottlenecks) / max(1, len(zones))), 2),
            'recommendations': self._get_flow_recommendations(bottlenecks)
        }

    def _get_flow_recommendations(self, bottlenecks):
        if not bottlenecks:
            return ['Flow is normal. Continue monitoring.']
        recs = ['Deploy crowd control at bottleneck locations']
        if any(b['severity'] == 'severe' for b in bottlenecks):
            recs.extend([
                'Open additional exit routes immediately',
                'Implement one-way flow system',
                'Consider restricting new entries'
            ])
        else:
            recs.append('Prepare additional exit routes as precaution')
        return recs

    def _calculate_average_density(self, zones):
        if not zones:
            return 0.0
        return float(np.mean([z['current_density'] for z in zones]))

    def _get_weather_impact(self):
        return {'temperature_impact': 0.15, 'rainfall_impact': 0.1, 'visibility_impact': 0.05}

    def _get_time_impact(self):
        return self._get_base_density_for_hour(datetime.now().hour)

    def _assess_infrastructure(self, zones):
        avg_density = self._calculate_average_density(zones)
        return {
            'exit_capacity': round(max(0.3, 1.0 - avg_density * 0.3), 2),
            'medical_facilities': 0.85,
            'communication_systems': 0.92,
            'emergency_vehicles': round(max(0.4, 1.0 - avg_density * 0.2), 2)
        }

    def _assess_emergency_access(self, zones):
        avg_density = self._calculate_average_density(zones)
        return round(max(0.3, 1.0 - avg_density * 0.4), 2)

    def _calculate_stampede_risk(self, risk_factors):
        weights = {
            'crowd_density': 0.25,
            'max_zone_density': 0.2,
            'weather_conditions': 0.1,
            'time_of_day': 0.1,
            'infrastructure': 0.2,
            'emergency_access': 0.15
        }
        total_score = 0
        for factor, weight in weights.items():
            val = risk_factors.get(factor, 0)
            if isinstance(val, dict):
                val = sum(v for v in val.values() if isinstance(v, (int, float))) / max(1, len(val))
            if factor == 'infrastructure':
                infra = risk_factors[factor]
                if isinstance(infra, dict):
                    val = 1.0 - (sum(v for v in infra.values()) / max(1, len(infra)))
                else:
                    val = 1.0 - val
            elif factor == 'emergency_access':
                val = 1.0 - val
            total_score += val * weight

        if total_score < 0.3:
            level = 'low'
        elif total_score < 0.5:
            level = 'moderate'
        elif total_score < 0.7:
            level = 'high'
        else:
            level = 'critical'
        return {'score': round(total_score, 3), 'level': level}

    def _get_stampede_recommendations(self, risk_score):
        if risk_score < 0.3:
            return ['Continue routine monitoring', 'Maintain current crowd control measures']
        elif risk_score < 0.5:
            return ['Increase monitoring frequency', 'Deploy additional personnel', 'Prepare emergency response teams']
        elif risk_score < 0.7:
            return ['Implement active crowd control', 'Open additional exits', 'Deploy emergency teams', 'Restrict new entries']
        else:
            return ['Immediate evacuation preparation', 'Deploy all emergency resources', 'Halt new entries', 'Activate emergency protocols']

    def _identify_critical_zones(self, zones):
        return [z for z in zones if z['risk_level'] in ['high', 'critical']]

    def _get_fallback_data(self, city='prayagraj'):
        zones = self._city_zones.get(city, [])
        return {
            'city': city,
            'zones': zones,
            'overall_metrics': self._calculate_overall_metrics(zones),
            'risk_assessment': {'level': 'low'},
            'predictions': {},
            'heatmap_data': [],
            'flow_analysis': {},
            'density_history': {},
            'data_source': 'simulation',
            'data_note': 'Crowd densities are time-of-day predictive estimates. No real-time sensor or API data is available for this location.',
            'timestamp': datetime.now().isoformat()
        }
