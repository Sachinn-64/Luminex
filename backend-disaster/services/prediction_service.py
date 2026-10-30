"""
Prediction Service - forward-looking hazard forecasting.

Projects four hazards over the next 24-120 hours in 3-hour slots:
- flood:    rolling 24h rainfall accumulation vs IMD heavy-rain thresholds
- heat:     heat index (temperature + humidity) weighted by crowd exposure
- storm:    wind speed + thunderstorm signal
- stampede: projected crowd density (hourly Wari pattern x event calendar,
            calibrated against live zone density) amplified by weather shocks

Produces a timeline, per-hazard peaks, early warnings with lead time and an
operational advisory (Gemini when GEMINI_API_KEY is set, rule-based otherwise).
"""

import json
import math
import time
from datetime import datetime, date, timedelta

import requests

from config import Config

HAZARDS = ('flood', 'heat', 'storm', 'stampede')
WARNING_THRESHOLD = 0.5
SLOT_HOURS = 3

# IMD daily rainfall categories (mm / 24h)
IMD_HEAVY = 64.5
IMD_VERY_HEAVY = 115.6

HAZARD_ACTIONS = {
    'flood': [
        'Close Chandrabhaga ghat bathing areas and riverside camps',
        'Pre-position boats and NDRF team near the ghats',
        'Move riverside pilgrims to higher assembly points',
    ],
    'heat': [
        'Open additional drinking water and ORS stations along queues',
        'Shorten darshan queue holding times; add shade structures',
        'Station medical teams for heat exhaustion at the temple complex',
    ],
    'storm': [
        'Secure pandals, temporary structures and loudspeaker towers',
        'Broadcast lightning safety advice; move crowds under cover',
        'Keep fire tenders and electrical crews on standby',
    ],
    'stampede': [
        'Activate one-way flow at Namdev Gate and the temple complex',
        'Meter entry at chokepoints; open the emergency ring-road route',
        'Deploy additional police units to high-density zones',
    ],
}

GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent'


def _clamp(value, low=0.0, high=1.0):
    return max(low, min(high, value))


def _level(score):
    if score >= 0.75:
        return 'critical'
    if score >= 0.5:
        return 'high'
    if score >= 0.3:
        return 'moderate'
    return 'low'


def heat_index_c(temp_c, humidity):
    """Rothfusz heat index regression (NOAA), returned in Celsius."""
    t = temp_c * 9 / 5 + 32
    rh = humidity
    if t < 80:
        hi = 0.5 * (t + 61.0 + (t - 68.0) * 1.2 + rh * 0.094)
    else:
        hi = (-42.379 + 2.04901523 * t + 10.14333127 * rh - 0.22475541 * t * rh
              - 0.00683783 * t * t - 0.05481717 * rh * rh + 0.00122874 * t * t * rh
              + 0.00085282 * t * rh * rh - 0.00000199 * t * t * rh * rh)
    return (hi - 32) * 5 / 9


class PredictionService:
    def __init__(self, weather_service, crowd_service):
        self.config = Config()
        self.weather_service = weather_service
        self.crowd_service = crowd_service
        self._cache = {}

    # ─── Public API ──────────────────────────────────────────────────────

    def forecast(self, city_cfg, hours=72):
        hours = int(_clamp(hours, 24, 120))
        cache_key = (city_cfg['id'], hours, datetime.now().strftime('%Y%m%d%H'))
        cached = self._cache.get(cache_key)
        if cached and time.time() - cached['at'] < 600:
            return cached['data']

        weather = self.weather_service.get_forecast(lat=city_cfg['lat'], lon=city_cfg['lon'])
        slots = weather.get('forecasts', [])[: hours // SLOT_HOURS]
        calibration = self._crowd_calibration(city_cfg['id'])
        mock = weather.get('data_source') == 'mock'

        timeline = []
        for idx, slot in enumerate(slots):
            window = slots[max(0, idx - 7): idx + 1]  # trailing 24h
            timeline.append(self._score_slot(slot, window, idx, calibration, mock))

        peaks = {h: self._peak(timeline, h) for h in HAZARDS}
        warnings = self._early_warnings(timeline)
        summary = {
            'overall_peak': max((s['composite'] for s in timeline), default=0),
            'overall_level': _level(max((s['composite'] for s in timeline), default=0)),
            'next_24h_level': _level(max((s['composite'] for s in timeline[:8]), default=0)),
            'rain_total_mm': round(sum(self._rain_mm(s) for s in slots), 1),
            'max_heat_index_c': round(max((s['heat_index_c'] for s in timeline), default=0), 1),
        }

        data = {
            'city': city_cfg,
            'horizon_hours': hours,
            'generated_at': datetime.now().isoformat(),
            'data_sources': {
                'weather': weather.get('data_source', 'unknown'),
                'crowd': 'live_zone_calibrated',
            },
            'summary': summary,
            'peaks': peaks,
            'early_warnings': warnings,
            'timeline': timeline,
            'advisory': self._advisory(city_cfg, summary, peaks, warnings),
            'model': {
                'name': 'trinetra-hazard-v1',
                'slot_hours': SLOT_HOURS,
                'warning_threshold': WARNING_THRESHOLD,
                'notes': 'Physics/threshold model: IMD rainfall bands, NOAA heat index, '
                         'crowd-density logistic for stampede risk.',
            },
        }
        self._cache = {cache_key: {'at': time.time(), 'data': data}}
        return data

    # ─── Scoring ─────────────────────────────────────────────────────────

    def _score_slot(self, slot, window, idx, calibration, mock):
        when = datetime.fromisoformat(slot['datetime'])
        temp = slot.get('temperature', 28)
        humidity = slot.get('humidity', 50)
        wind = slot.get('wind_speed', 3)
        desc = (slot.get('description') or '').lower()

        rain_24h = sum(self._rain_mm(s) for s in window)
        flood = _clamp(rain_24h / IMD_VERY_HEAVY) * 1.15  # riverside ghats amplify impact
        if rain_24h >= IMD_HEAVY:
            flood = max(flood, 0.6)

        hi = heat_index_c(temp, humidity)
        heat_raw = _clamp((hi - 32) / 22)
        crowd = self._projected_density(when, calibration)
        daytime = 9 <= when.hour <= 17
        heat = heat_raw * (0.6 + 0.4 * crowd) * (1.0 if daytime else 0.6)

        storm = _clamp((wind - 8) / 12)
        if 'thunder' in desc:
            storm = max(storm, 0.55)

        # Logistic stampede curve centred at 85% occupancy; sudden rain/storm triggers rushes
        stampede = 1 / (1 + math.exp(-(crowd - 0.85) * 12))
        stampede = _clamp(stampede + 0.15 * storm + 0.1 * _clamp(self._rain_mm(slot) / 15))

        hazards = {
            'flood': round(_clamp(flood), 3),
            'heat': round(_clamp(heat), 3),
            'storm': round(storm, 3),
            'stampede': round(stampede, 3),
        }
        values = list(hazards.values())
        composite = _clamp(0.7 * max(values) + 0.3 * (sum(values) / len(values)))
        confidence = _clamp(0.92 - 0.006 * idx * SLOT_HOURS, 0.4, 0.95) * (0.6 if mock else 1.0)

        return {
            'time': slot['datetime'],
            'hazards': hazards,
            'composite': round(composite, 3),
            'level': _level(composite),
            'confidence': round(confidence, 2),
            'drivers': {
                'temperature_c': temp,
                'humidity': humidity,
                'heat_index_c': round(hi, 1),
                'wind_ms': wind,
                'rain_3h_mm': self._rain_mm(slot),
                'rain_24h_mm': round(rain_24h, 1),
                'projected_crowd_density': round(crowd, 3),
                'description': slot.get('description', ''),
            },
            'heat_index_c': round(hi, 1),
        }

    @staticmethod
    def _rain_mm(slot):
        if 'rain_mm' in slot:
            return slot['rain_mm'] or 0.0
        # Older payloads only carry probability (%); estimate a 3h amount from it
        pop = slot.get('precipitation', 0) / 100
        desc = (slot.get('description') or '').lower()
        intensity = 12 if 'heavy' in desc or 'thunder' in desc else 5 if 'moderate' in desc else 1.5 if 'rain' in desc else 0
        return round(pop * intensity, 1)

    def _crowd_calibration(self, city):
        """Ratio of live mean zone density to the model's baseline for this hour."""
        try:
            analytics = self.crowd_service.get_crowd_analytics(city=city)
            zones = analytics.get('zones', [])
            live = sum(z.get('current_density', 0) for z in zones) / len(zones) if zones else 0
            base = self.crowd_service._get_base_density_for_hour(datetime.now().hour)
            # Off-peak hours have tiny baselines, so the raw ratio explodes; only trust it
            # when the baseline is meaningful, and apply it half-strength within ±20%
            if live and base >= 0.4:
                return _clamp(1 + 0.5 * (live / base - 1), 0.8, 1.2)
        except Exception as e:
            print(f"Crowd calibration failed: {e}")
        return 1.0

    def _projected_density(self, when, calibration):
        base = self.crowd_service._get_base_density_for_hour(when.hour)
        return _clamp(base * calibration * self._event_multiplier(when.date()), 0, 1.3)

    def _event_multiplier(self, day):
        peak_days = self._peak_dates()
        # The hourly pattern is the Wari-season curve; ordinary days run well below it
        if day in peak_days:
            return 1.2
        if day + timedelta(days=1) in peak_days:
            return 1.05
        return 0.9 if day.weekday() >= 5 else 0.8

    def _peak_dates(self):
        dates = set()
        for raw in self.config.EVENT_PEAK_DATES:
            try:
                dates.add(date.fromisoformat(raw.strip()))
            except ValueError:
                continue
        return dates

    # ─── Aggregation ─────────────────────────────────────────────────────

    @staticmethod
    def _peak(timeline, hazard):
        if not timeline:
            return {'risk': 0, 'level': 'low', 'time': None}
        best = max(timeline, key=lambda s: s['hazards'][hazard])
        return {'risk': best['hazards'][hazard], 'level': _level(best['hazards'][hazard]), 'time': best['time']}

    @staticmethod
    def _early_warnings(timeline):
        warnings = []
        now = datetime.now()
        for hazard in HAZARDS:
            first = next((s for s in timeline if s['hazards'][hazard] >= WARNING_THRESHOLD), None)
            if not first:
                continue
            onset = datetime.fromisoformat(first['time'])
            peak = max(timeline, key=lambda s: s['hazards'][hazard])
            warnings.append({
                'hazard': hazard,
                'onset': first['time'],
                'lead_time_hours': max(0, round((onset - now).total_seconds() / 3600, 1)),
                'peak_risk': peak['hazards'][hazard],
                'peak_time': peak['time'],
                'level': _level(peak['hazards'][hazard]),
                'confidence': first['confidence'],
                'actions': HAZARD_ACTIONS[hazard],
            })
        warnings.sort(key=lambda w: w['lead_time_hours'])
        return warnings

    # ─── Advisory ────────────────────────────────────────────────────────

    def _advisory(self, city_cfg, summary, peaks, warnings):
        if self.config.GEMINI_API_KEY:
            text = self._gemini_advisory(city_cfg, summary, peaks, warnings)
            if text:
                return {'source': 'gemini', 'text': text}
        return {'source': 'rules', 'text': self._rule_advisory(city_cfg, summary, warnings)}

    def _gemini_advisory(self, city_cfg, summary, peaks, warnings):
        prompt = (
            f"You are the disaster-prediction officer for {city_cfg['display_name']} during the "
            f"{city_cfg.get('event', 'pilgrimage')}. Using this hazard forecast JSON, write a short "
            "operational advisory in markdown for the command centre: one headline sentence, then "
            "at most 5 bullets with concrete actions and timings. No preamble.\n\n"
            + json.dumps({'summary': summary, 'peaks': peaks,
                          'warnings': [{k: w[k] for k in ('hazard', 'onset', 'lead_time_hours', 'peak_risk')}
                                       for w in warnings]})
        )
        try:
            res = requests.post(
                f"{GEMINI_URL}?key={self.config.GEMINI_API_KEY}",
                json={'contents': [{'parts': [{'text': prompt}]}]},
                timeout=15,
            )
            if res.ok:
                return res.json()['candidates'][0]['content']['parts'][0]['text']
            print(f"Gemini advisory failed: {res.status_code}")
        except Exception as e:
            print(f"Gemini advisory error: {e}")
        return None

    @staticmethod
    def _rule_advisory(city_cfg, summary, warnings):
        if not warnings:
            return (f"**No hazard crosses the warning threshold for {city_cfg['name']} in this horizon.**\n\n"
                    "- Continue routine monitoring and keep standard crowd-control posture.")
        lines = [f"**{len(warnings)} hazard warning(s) for {city_cfg['name']}; "
                 f"overall outlook {summary['overall_level'].upper()}.**", '']
        for w in warnings:
            onset = datetime.fromisoformat(w['onset']).strftime('%a %H:%M')
            lines.append(f"- **{w['hazard'].title()}** from {onset} (in ~{w['lead_time_hours']:.0f}h, "
                         f"peak {round(w['peak_risk'] * 100)}%): {w['actions'][0]}.")
        return '\n'.join(lines)
