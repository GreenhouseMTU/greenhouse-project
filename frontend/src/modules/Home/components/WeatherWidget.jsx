import React, { useState, useEffect } from 'react';

export default function WeatherWidget({
  cityId = '2964020', // Cork, Ireland
  apiKey = '9566ed907dba44c0a9d55913103019e4',
  units = 'metric', // 'metric' for °C/kmh, 'imperial' for °F/mph
}) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?id=${cityId}&units=${units}&appid=${apiKey}`
        );
        if (!response.ok) throw new Error('Failed to fetch weather data');
        const data = await response.json();
        setWeather({
          temp: Math.round(data.main.temp),
          wind: Math.round(data.wind.speed),
          humidity: data.main.humidity,
          rain: data.rain?.['1h'] ?? 0, // mm last hour, default to 0 if undefined
          description: data.weather[0].description,
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [cityId, apiKey, units]);

  if (loading) {
    return (
      <div className="weather-card">
        <p className="text-sm">Chargement…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="weather-card">
        <p className="text-sm">Erreur : {error}</p>
      </div>
    );
  }
  if (!weather) {
    return (
      <div className="weather-card">
        <p className="text-sm">Données non disponibles</p>
      </div>
    );
  }

  return (
    <div className="weather-card">
      <div className="weather-header">
        <h2 className="text-xl font-semibold text-black">Weather</h2>
        <span className="weather-icon">🌤️</span>
      </div>
      <div className="weather-temp text-3xl font-bold text-black">{weather.temp}°C</div>
      <div className="weather-details">
        <div className="detail leading-relaxed"><span>💨</span> <span className="text-sm">{weather.wind} km/h</span></div>
        <div className="detail leading-relaxed"><span>💧</span> <span className="text-sm">{weather.humidity}%</span></div>
        <div className="detail leading-relaxed"><span>☔</span> <span className="text-sm">{weather.rain} mm</span></div>
      </div>
    </div>
  );
}