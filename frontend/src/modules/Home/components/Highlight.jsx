import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Highlight.css';
import { formatDistanceToNow } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup, Rectangle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import SensorStatus from './SensorStatus';
import WeatherWidget from './WeatherWidget';
import SMGauges from './SMGauges';
import InteractiveCalendar from './TaskCalendar';

const endpointMap = {
  light: { 'full-day': { ext: '/api/sensors/sensor_light_ext/day', int: '/api/sensors/sensor_light_int/day' } },
  env: { 'full-day': { ext: '/api/sensors/sensor_co2temphum_ext/day', int: '/api/sensors/sensor_co2temphum_int/day' } },
  soil: {
    'full-day': {
      '1': '/api/sensors/sensor_smtempec_1/day',
      '2': '/api/sensors/sensor_smtempec_2/day',
      '3': '/api/sensors/sensor_smtempec_3/day',
      '4': '/api/sensors/sensor_smtempec_4/day',
    },
  },
};

const center = [51.885611, -8.535999];
const delta = 0.00010;
const greenhouseBounds = [
  [center[0] + delta, center[1] - delta],
  [center[0] - delta, center[1] + delta],
];

function Highlight() {
  const navigate = useNavigate();
  const [sensors, setSensors] = useState({ light: [], env: [], soil: [] });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [exportFormat, setExportFormat] = useState('csv');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState('all');
  const [insights, setInsights] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setErrorMessage('');
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login', { state: { mode: 'login' } });
        return;
      }

      try {
        const headers = { Authorization: `Bearer ${token}` };
        const results = {};
        const types = ['light', 'env', 'soil'];

        for (const type of types) {
          const modesToFetch = type === 'soil' ? ['1', '2', '3', '4'] : ['ext', 'int'];
          results[type] = await Promise.all(
            modesToFetch.map(async (m) => {
              const path = endpointMap[type]['full-day'][m];
              const url = `http://localhost:8080${path}`;
              const res = await fetch(url, { headers });
              const json = await res.json();
              const data = Array.isArray(json) ? json : [json];
              return { mode: m, data };
            })
          );
        }

        setSensors(results);
      } catch (err) {
        console.error(err);
        setSensors({ light: [], env: [], soil: [] });
        setErrorMessage('Failed to fetch data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [navigate]);

  useEffect(() => {
    const fetchInsights = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login', { state: { mode: 'login' } });
        return;
      }

      try {
        const headers = { Authorization: `Bearer ${token}` };
        const response = await fetch('http://localhost:8080/api/sensors/sensor_co2temphum_int/insights', { headers });
        const data = await response.json();
        console.log('Insights:', data.summary); // Debug log
        setInsights(data.summary);
      } catch (err) {
        console.error('Error fetching insights:', err);
        setInsights('Failed to fetch insights.');
      }
    };

    fetchInsights();
  }, [navigate]);

  const generateInsights = (type, data) => {
    const insights = [];
    const thresholds = {
      light: { min: 100, max: 100000, unit: 'Lux' },
      env: { CO2: { min: 400, max: 2000, unit: 'ppm' }, Temp: { min: 10, max: 35, unit: '°C' }, Hum: { min: 20, max: 80, unit: '%RH' } },
      soil: { SM: { min: 10, max: 60, unit: '%' }, Temp: { min: 10, max: 30, unit: '°C' }, EC: { min: 0.1, max: 2.0, unit: 'dS/m' } },
    };

    const calculateTrend = (values) =>
      values.length < 2
        ? 'stable'
        : values.slice(0, Math.floor(values.length / 2)).reduce((sum, v) => sum + v, 0) / (values.length / 2) <
          values.slice(Math.floor(values.length / 2)).reduce((sum, v) => sum + v, 0) / (values.length / 2)
        ? 'increasing'
        : 'decreasing';

    data.forEach(({ mode: m, data: sensorData }) => {
      if (!sensorData || sensorData.length === 0) return;
      if (type === 'light') {
        const values = sensorData.map((d) => d.value || d.average_value).filter((v) => v !== null);
        if (values.length === 0) return;
        const max = Math.max(...values), min = Math.min(...values), trend = calculateTrend(values);
        const label = m === 'ext' ? 'External Light' : 'Internal Light';
        if (max > thresholds.light.max) insights.push(`${label}: High luminosity (${max} ${thresholds.light.unit}), exceeding range.`);
        if (min < thresholds.light.min) insights.push(`${label}: Low luminosity (${min} ${thresholds.light.unit}), below range.`);
        insights.push(`${label}: Trend ${trend}.`);
      }
      if (type === 'env') {
        ['valueCO2', 'valueTemp', 'valueHum'].forEach((key) => {
          const values = sensorData.map((d) => d[key] || d[`average_${key}`]).filter((v) => v !== null && !isNaN(v));
          if (values.length === 0) return;
          const max = Math.max(...values), min = Math.min(...values), trend = calculateTrend(values);
          const label = `${m === 'ext' ? 'External' : 'Internal'} ${{ valueCO2: 'CO2', valueTemp: 'Temperature', valueHum: 'Humidity' }[key]}`;
          if (max > thresholds.env[{ valueCO2: 'CO2', valueTemp: 'Temp', valueHum: 'Hum' }[key]].max)
            insights.push(`${label}: High (${max} ${thresholds.env[{ valueCO2: 'CO2', valueTemp: 'Temp', valueHum: 'Hum' }[key]].unit}), exceeding range.`);
          if (min < thresholds.env[{ valueCO2: 'CO2', valueTemp: 'Temp', valueHum: 'Hum' }[key]].min)
            insights.push(`${label}: Low (${min} ${thresholds.env[{ valueCO2: 'CO2', valueTemp: 'Temp', valueHum: 'Hum' }[key]].unit}), below range.`);
          insights.push(`${label}: Trend ${trend}.`);
        });
      }
      if (type === 'soil') {
        ['valueSM', 'valueTemp', 'valueEC'].forEach((key) => {
          const values = sensorData.map((d) => d[key] || d[`average_${key}`]).filter((v) => v !== null && !isNaN(v));
          if (values.length === 0) return;
          const max = Math.max(...values), min = Math.min(...values), trend = calculateTrend(values);
          const label = `Soil Sensor ${m} ${{ valueSM: 'Moisture', valueTemp: 'Temperature', valueEC: 'EC' }[key]}`;
          if (max > thresholds.soil[{ valueSM: 'SM', valueTemp: 'Temp', valueEC: 'EC' }[key]].max)
            insights.push(`${label}: High (${max} ${thresholds.soil[{ valueSM: 'SM', valueTemp: 'Temp', valueEC: 'EC' }[key]].unit}), exceeding range.`);
          if (min < thresholds.soil[{ valueSM: 'SM', valueTemp: 'Temp', valueEC: 'EC' }[key]].min)
            insights.push(`${label}: Low (${min} ${thresholds.soil[{ valueSM: 'SM', valueTemp: 'Temp', valueEC: 'EC' }[key]].unit}), below range.`);
          insights.push(`${label}: Trend ${trend}.`);
        });
      }
    });
    return insights.length > 0 ? insights : ['No insights available.'];
  };

  const exportData = async () => {
    if (!isExportModalOpen) {
      setIsExportModalOpen(true);
      return;
    }
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login', { state: { mode: 'login' } });
      return;
    }
    try {
      const headers = { Authorization: `Bearer ${token}` };
      let exportDataArray = [];
      const typesToFetch = exportType === 'all' ? ['light', 'env', 'soil'] : [exportType];
      for (const type of typesToFetch) {
        const insights = generateInsights(type, sensors[type]);
        exportDataArray = exportDataArray.concat(
          insights.map((insight, index) => ({ type, insight: insight.replace(/,/g, ';'), timestamp: new Date().toISOString() }))
        );
      }
      if (exportDataArray.length === 0) {
        alert('No insights to export.');
        return;
      }
      if (exportFormat === 'csv') {
        const csvContent = '\uFEFF' + ['Type,Insight,Timestamp', ...exportDataArray.map((row) => `${row.type},${row.insight},${row.timestamp}`)].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `insights_${exportType}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (exportFormat === 'json') {
        const blob = new Blob([JSON.stringify(exportDataArray, null, 2)], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `insights_${exportType}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      setIsExportModalOpen(false);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export insights.');
    }
  };

  const ExportModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Export Insights</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Data Type</label>
          <select value={exportType} onChange={(e) => setExportType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none">
            <option value="all">All</option>
            <option value="light">Light</option>
            <option value="env">Environment</option>
            <option value="soil">Soil</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Format</label>
          <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none">
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700" onClick={exportData}>Export</button>
          <button className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400" onClick={() => setIsExportModalOpen(false)}>Cancel</button>
        </div>
      </div>
    </div>
  );

  const renderInsights = () => {
    const typesToRender = ['light', 'env', 'soil'];
    return typesToRender.map((type) => {
      const insights = generateInsights(type, sensors[type]);
      return (
        <div key={type} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{type.charAt(0).toUpperCase() + type.slice(1)} Insights</h2>
          <ul className="space-y-2">
            {insights.map((insight, index) => (
              <li key={index} className="text-gray-700">{insight}</li>
            ))}
          </ul>
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <span className="text-xl font-semibold text-gray-600">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <div className="highlight-sidebar">
        <div className="highlight-sidebar-header">
          <div className="highlight-title-container">
            <div className="highlight-title-text" data-text="Greenhouse MTU Insights">Greenhouse MTU Insights</div>
          </div>
          <ul className="highlight-nav-buttons">
            <li className="highlight-nav-item" onClick={() => navigate('/home')}>
              <span className="icon"><ion-icon name="home-outline"></ion-icon></span>
              <span className="title">Home</span>
            </li>
            <li className="highlight-nav-item" onClick={() => navigate('/dashboard')}>
              <span className="icon"><ion-icon name="stats-chart-outline"></ion-icon></span>
              <span className="title">Dashboard</span>
            </li>
            <li className="highlight-nav-item" onClick={() => { localStorage.removeItem('access_token'); navigate('/login', { state: { mode: 'login' } }); }}>
              <span className="icon"><ion-icon name="log-out-outline"></ion-icon></span>
              <span className="title">Disconnect</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="highlight-main-content">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-white/[0.03] md:p-4">
            <div className="grid grid-cols-2 gap-2 h-full min-h-[100px]">
              <div className="col-span-1 flex flex-col h-full">
                <SensorStatus sensors={sensors} totalSensors={8} />
              </div>
              <div className="col-span-1 flex flex-col h-full">
                <div className="weather-card-custom h-full flex flex-col justify-between">
                  <WeatherWidget cityId="2964020" apiKey="9566ed907dba44c0a9d55913103019e4" units="metric" />
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-white/[0.03]">
            <SMGauges />
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 revenue-users-card relative">
            <InteractiveCalendar />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="col-span-2 ">
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden dark:border-gray-800 dark:bg-white/[0.03] relative">
              <MapContainer
                center={[51.8856, -8.5360]}
                zoom={30}
                scrollWheelZoom={false}
                style={{ height: '500px', width: '100%', zIndex: 0 }}
                className="rounded-2xl"
                attributionControl={false}
              >
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution=''
                />
                <Marker position={[51.8856, -8.5360]}>
                  <Popup>Greenhouse MTU</Popup>
                </Marker>
                <Rectangle bounds={greenhouseBounds} pathOptions={{ color: '#ff0800ff', weight: 1 }} />
              </MapContainer>
            </div>
          </div>
          <div className="col-span-1 flex flex-col gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
              <h2 className="text-xl font-semibold mb-4 text-black text-center">Insights (3 days)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Carte pour la température */}
                <div className="rounded-xl bg-orange-50 border border-orange-200 p-6 dark:bg-white/[0.03] dark:border-gray-800 min-h-[300px] flex flex-col justify-between">
                  {Array.isArray(insights) && insights[0] ? (
                    <>
                      <h3 className="text-lg font-semibold text-orange-500 text-center">{insights[0].title}</h3>
                      <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center mt-4">
                        {insights[0].data.split(' ')[0]} {/* Première valeur */}
                      </p>
                      <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center">
                        {insights[0].data.split(' ')[1]} {/* Flèche */}
                      </p>
                      <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center">
                        {insights[0].data.split(' ')[2]} {/* Deuxième valeur */}
                      </p>
                      <h4 className="text-lg font-semibold text-orange-600 dark:text-gray-400 text-center mt-4">
                        {insights[0].overallTitle}
                      </h4>
                      <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center mt-2">
                        {insights[0].overallData}
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-500 italic text-center">Loading...</p>
                  )}
                </div>

                {/* Carte pour l'humidité */}
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-6 dark:bg-white/[0.03] dark:border-gray-800 min-h-[300px] flex flex-col justify-between">
                  {Array.isArray(insights) && insights[1] ? (
                    <>
                      <h3 className="text-lg font-semibold text-blue-500 text-center">{insights[1].title}</h3>
                      <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center mt-4">
                        {insights[1].data.split(' ')[0]} {/* Première valeur */}
                      </p>
                      <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center">
                        {insights[1].data.split(' ')[1]} {/* Flèche */}
                      </p>
                      <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center">
                        {insights[1].data.split(' ')[2]} {/* Deuxième valeur */}
                      </p>
                      <h4 className="text-lg font-semibold text-blue-600 dark:text-gray-400 text-center mt-4">
                        {insights[1].overallTitle}
                      </h4>
                      <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center mt-2">
                        {insights[1].overallData}
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-500 italic text-center">Loading...</p>
                  )}
                </div>

                {/* Carte pour le CO₂ */}
                <div className="rounded-xl bg-green-50 border border-gray-200 p-6 dark:bg-white/[0.03] dark:border-gray-800 min-h-[300px] flex flex-col justify-between">
                  {Array.isArray(insights) && insights[2] ? (
                    <>
                      <h3 className="text-lg font-semibold text-green-500 text-center">{insights[2].title}</h3>
                      <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center mt-4">
                        {insights[2].data.split(' ')[0]} {/* Première valeur */}
                      </p>
                      <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center">
                        {insights[2].data.split(' ')[1]} {/* Flèche */}
                      </p>
                      <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center">
                        {insights[2].data.split(' ')[2]} {/* Deuxième valeur */}
                      </p>
                      <h4 className="text-lg font-semibold text-green-600 dark:text-gray-400 text-center mt-4">
                        {insights[2].overallTitle}
                      </h4>
                      <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center mt-2">
                        {insights[2].overallData}
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-500 italic text-center">Loading...</p>
                  )}
                </div>

                {/* Nouvelle carte pour les recommandations */}
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-6 dark:bg-white/[0.03] dark:border-gray-800 md:col-span-3">
                  <div className="grid grid-cols-3 divide-x divide-gray-300">
                    {/* Section Température */}
                    <div className="px-4">
                      <h4 className="text-md font-semibold text-orange-500 text-center mb-2">Temperature</h4>
                      {Array.isArray(insights) && insights[0]?.recommendation ? (
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                          {insights[0].recommendation}
                        </p>
                      ) : (
                        <p className="text-gray-500 italic text-center">No recommendations available.</p>
                      )}
                    </div>

                    {/* Section Humidity */}
                    <div className="px-4">
                      <h4 className="text-md font-semibold text-blue-500 text-center mb-2">Humidity</h4>
                      {Array.isArray(insights) && insights[1]?.recommendation ? (
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                          {insights[1].recommendation}
                        </p>
                      ) : (
                        <p className="text-gray-500 italic text-center">No recommendations available.</p>
                      )}
                    </div>

                    {/* Section CO₂ */}
                    <div className="px-4">
                      <h4 className="text-md font-semibold text-green-500 text-center mb-2">CO₂</h4>
                      {Array.isArray(insights) && insights[2]?.recommendation ? (
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                          {insights[2].recommendation}
                        </p>
                      ) : (
                        <p className="text-gray-500 italic text-center">No recommendations available.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 mb-6 h-64">
          <h2 className="text-xl font-semibold mb-4">Full Insights Summary</h2>
          <ul className="space-y-2">
            <li className="text-gray-500 italic">No insights to display.</li>
          </ul>
        </div>

        {isExportModalOpen && <ExportModal />}
        {errorMessage && <div className="highlight-error-message mt-6">{errorMessage}</div>}
      </div>
    </div>
  );
}

export default Highlight;