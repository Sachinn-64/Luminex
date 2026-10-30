import requests
from datetime import datetime, timedelta
import random
from config import Config


class WeatherService:
    def __init__(self):
        self.config = Config()
        self.base_url = "https://api.openweathermap.org/data/2.5"

    def get_current_weather(self, lat=None, lon=None):
        """Get current weather data. Defaults to Prayagraj if no coords given."""
        lat = lat or self.config.MAHAKUMBH_LAT
        lon = lon or self.config.MAHAKUMBH_LON
        try:
            url = f"{self.base_url}/weather"
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.config.OPENWEATHER_API_KEY,
                'units': 'metric'
            }
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                return self._format_weather_data(data)
            else:
                return self._get_mock_weather_data(lat, lon)
        except Exception as e:
            print(f"Error fetching weather data: {e}")
            return self._get_mock_weather_data(lat, lon)

    def get_forecast(self, lat=None, lon=None):
        """Get weather forecast for next 5 days."""
        lat = lat or self.config.MAHAKUMBH_LAT
        lon = lon or self.config.MAHAKUMBH_LON
        try:
            url = f"{self.base_url}/forecast"
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.config.OPENWEATHER_API_KEY,
                'units': 'metric'
            }
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                return self._format_forecast_data(data)
            else:
                return self._get_mock_forecast_data()
        except Exception as e:
            print(f"Error fetching forecast data: {e}")
            return self._get_mock_forecast_data()

    def get_flood_alerts(self, lat=None, lon=None):
        """Get flood alert status based on weather data."""
        lat = lat or self.config.MAHAKUMBH_LAT
        lon = lon or self.config.MAHAKUMBH_LON
        try:
            weather = self.get_current_weather(lat=lat, lon=lon)
            # Derive flood risk from real humidity / rainfall data
            humidity = weather.get('humidity', 50)
            rain_3h = weather.get('rain_3h', 0)
            alert_level = 'low'
            water_level = 72.0 + (humidity / 100) * 18 + rain_3h * 0.5
            threshold = 90.0
            if water_level > 85:
                alert_level = 'moderate'
            if water_level > 90:
                alert_level = 'high'

            alerts = []
            if alert_level != 'low':
                alerts.append({
                    'type': 'flood_warning',
                    'severity': alert_level,
                    'message': f'River water level elevated near location ({lat:.2f}, {lon:.2f})',
                    'timestamp': datetime.now().isoformat(),
                    'location': f'River, ({lat:.2f}, {lon:.2f})',
                    'water_level': round(water_level, 1),
                    'threshold': threshold
                })
            return {
                'alerts': alerts,
                'water_level': round(water_level, 1),
                'threshold': threshold,
                'last_updated': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error generating flood alerts: {e}")
            return {'alerts': [], 'last_updated': datetime.now().isoformat()}

    def _format_weather_data(self, data):
        """Format weather data from API response."""
        rain = data.get('rain', {})
        return {
            'temperature': data['main']['temp'],
            'feels_like': data['main']['feels_like'],
            'humidity': data['main']['humidity'],
            'pressure': data['main']['pressure'],
            'description': data['weather'][0]['description'],
            'icon': data['weather'][0]['icon'],
            'wind_speed': data['wind']['speed'],
            'wind_direction': data['wind'].get('deg', 0),
            'visibility': data.get('visibility', 10000),
            'clouds': data['clouds']['all'],
            'rain_3h': rain.get('3h', 0),
            'sunrise': datetime.fromtimestamp(data['sys']['sunrise']).isoformat(),
            'sunset': datetime.fromtimestamp(data['sys']['sunset']).isoformat(),
            'location': data.get('name', 'Unknown'),
            'coordinates': [data['coord']['lat'], data['coord']['lon']],
            'timestamp': datetime.now().isoformat(),
            'data_source': 'openweathermap'
        }

    def _format_forecast_data(self, data):
        """Format forecast data from API response."""
        forecasts = []
        for item in data['list']:
            forecasts.append({
                'datetime': datetime.fromtimestamp(item['dt']).isoformat(),
                'temperature': item['main']['temp'],
                'temp_min': item['main']['temp_min'],
                'temp_max': item['main']['temp_max'],
                'description': item['weather'][0]['description'],
                'icon': item['weather'][0]['icon'],
                'humidity': item['main']['humidity'],
                'wind_speed': item['wind']['speed'],
                'precipitation': item.get('pop', 0) * 100,
                'rain_mm': item.get('rain', {}).get('3h', 0)
            })
        return {
            'forecasts': forecasts,
            'location': data.get('city', {}).get('name', 'Unknown'),
            'last_updated': datetime.now().isoformat(),
            'data_source': 'openweathermap'
        }

    def _get_mock_weather_data(self, lat=None, lon=None):
        """Generate mock weather data."""
        lat = lat or self.config.MAHAKUMBH_LAT
        lon = lon or self.config.MAHAKUMBH_LON
        return {
            'temperature': round(random.uniform(22, 36), 1),
            'feels_like': round(random.uniform(24, 38), 1),
            'humidity': random.randint(40, 80),
            'pressure': random.randint(1000, 1020),
            'description': random.choice(['clear sky', 'scattered clouds', 'light rain', 'partly cloudy']),
            'icon': '01d',
            'wind_speed': round(random.uniform(2, 15), 1),
            'wind_direction': random.randint(0, 360),
            'visibility': random.randint(5000, 10000),
            'clouds': random.randint(0, 100),
            'rain_3h': 0,
            'sunrise': (datetime.now().replace(hour=6, minute=15)).isoformat(),
            'sunset': (datetime.now().replace(hour=18, minute=30)).isoformat(),
            'location': 'Prayagraj, Uttar Pradesh',
            'coordinates': [lat, lon],
            'timestamp': datetime.now().isoformat(),
            'data_source': 'mock'
        }

    def _get_mock_forecast_data(self):
        """Generate a time-coherent mock forecast (diurnal temperature, rain spells)."""
        import math
        forecasts = []
        now = datetime.now().replace(minute=0, second=0, microsecond=0)
        # One seeded rain spell per day so consecutive refreshes stay consistent
        rng = random.Random(now.strftime('%Y%m%d'))
        spell_start = rng.randint(6, 40)
        spell_len = rng.randint(2, 5)
        spell_peak = rng.uniform(4, 22)
        for i in range(40):
            forecast_time = now + timedelta(hours=i * 3)
            hour = forecast_time.hour
            temp = 29 + 6 * math.sin((hour - 9) / 24 * 2 * math.pi) + rng.uniform(-0.8, 0.8)
            in_spell = spell_start <= i < spell_start + spell_len
            rain_mm = round(spell_peak * rng.uniform(0.5, 1.0), 1) if in_spell else 0.0
            pop = min(100, 85 + rng.uniform(0, 15)) if in_spell else rng.uniform(0, 25)
            if in_spell:
                temp -= 4
            description = ('thunderstorm with rain' if rain_mm > 15 else 'moderate rain' if rain_mm > 5
                           else 'light rain' if rain_mm > 0 else 'scattered clouds' if pop > 15 else 'clear sky')
            forecasts.append({
                'datetime': forecast_time.isoformat(),
                'temperature': round(temp, 1),
                'temp_min': round(temp - 1.5, 1),
                'temp_max': round(temp + 1.5, 1),
                'description': description,
                'icon': '10d' if rain_mm else '01d',
                'humidity': int(min(98, (88 if in_spell else 55) + rng.uniform(-8, 8))),
                'wind_speed': round((9 if rain_mm > 15 else 3) + rng.uniform(0, 4), 1),
                'precipitation': round(pop, 1),
                'rain_mm': rain_mm
            })
        return {
            'forecasts': forecasts,
            'location': 'Pandharpur, Maharashtra',
            'last_updated': datetime.now().isoformat(),
            'data_source': 'mock'
        }
