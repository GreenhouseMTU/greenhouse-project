import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Highlight.css';
import 'leaflet/dist/leaflet.css';
import SensorStatus from './SensorStatus';
import WeatherWidget from './WeatherWidget';
import SMGauges from './SMGauges';
import InteractiveCalendar from './TaskCalendar';
import LightWeekAreaChart from './LightWeekAreaChart';
import SoilTempHeatmap from './SoilTempHeatmap';
import { getSoilInsights } from './SoilTempHeatmap';
import { getInsight } from './LightWeekAreaChart';

//use for calculate the SensorStatus
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

function Highlight() {
  const navigate = useNavigate();
  const [sensors, setSensors] = useState({ light: [], env: [], soil: [] });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [insights, setInsights] = useState('');
  const [soilTemps, setSoilTemps] = useState([null, null, null, null]);
  const [extData, setExtData] = useState([]);
  const [intData, setIntData] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState(null);

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

  useEffect(() => {
    // Fetch soil temps
    const fetchSoil = async () => {
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };
      const urls = [
        '/api/sensors/sensor_smtempec_1/latest',
        '/api/sensors/sensor_smtempec_2/latest',
        '/api/sensors/sensor_smtempec_3/latest',
        '/api/sensors/sensor_smtempec_4/latest'
      ];
      const temps = await Promise.all(urls.map(async url => {
        try {
          const res = await fetch(`http://localhost:8080${url}`, { headers });
          const json = await res.json();
          return json.valueTemp !== undefined ? parseFloat(json.valueTemp) : null;
        } catch {
          return null;
        }
      }));
      setSoilTemps(temps);
    };
    fetchSoil();

    // Fetch light data
    const fetchLight = async () => {
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };
      const [extRes, intRes] = await Promise.all([
        fetch('http://localhost:8080/api/sensors/sensor_light_ext/week', { headers }),
        fetch('http://localhost:8080/api/sensors/sensor_light_int/week', { headers }),
      ]);
      const extJson = await extRes.json();
      const intJson = await intRes.json();
      setExtData(extJson.map(d => d.average_value));
      setIntData(intJson.map(d => d.average_value));
    };
    fetchLight();
  }, []);

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
      {/* Burger trigger */}
      <div
        className="fixed top-0 left-0 h-full w-14 flex flex-col items-center justify-center bg-[#222] z-50 cursor-pointer group"
        onMouseEnter={() => setMenuOpen(true)}
        onMouseLeave={() => setMenuOpen(false)}
      >
        {/* Burger bars verticales */}
        <div className="flex flex-row items-center justify-center h-24 gap-2 mb-10">
          <span className={`block h-8 w-1 bg-gray-400 rounded transition-all duration-500 ${menuOpen ? 'opacity-0' : ''}`}></span>
          <span className={`block h-8 w-1 bg-gray-400 rounded transition-all duration-500 ${menuOpen ? 'scale-x-125' : ''}`}></span>
          <span className={`block h-8 w-1 bg-gray-400 rounded transition-all duration-500 ${menuOpen ? 'opacity-0' : ''}`}></span>
        </div>
        <p className={`text-gray-300 font-bold tracking-wider text-xs transition-all duration-500 absolute left-1/2 -translate-x-1/2 bottom-8 rotate-[-90deg] ${menuOpen ? 'opacity-0' : 'opacity-100'}`}>MENU</p>
      </div>

      {/* Sliding menu */}
      <div
        className={`fixed top-0 left-0 h-full bg-[#222] border-r border-[#444] z-40 transition-all duration-300 ease-in-out
          ${menuOpen ? 'w-64 pl-4 pr-4' : 'w-14 pl-0 pr-0'}
          pt-2 pb-10 flex flex-col`}
        onMouseEnter={() => setMenuOpen(true)}
        onMouseLeave={() => setMenuOpen(false)}
        style={{ willChange: 'width' }}
      >
        <div className={`mb-1 transition-opacity duration-300 ${menuOpen ? 'opacity-100' : 'opacity-0'}`}>
          <span className="text-2xl font-bold text-[#f9f9ed] tracking-widest pl-10">MTU Insights</span>
        </div>
        {/* Centrer verticalement le menu */}
        <ul className={`flex flex-col gap-8 transition-opacity duration-300 ${menuOpen ? 'opacity-100' : 'opacity-0'} pl-15 justify-center flex-1`}>
          {['home', 'dashboard', 'disconnect'].map((menu) => (
            <li
              key={menu}
              className={`text-2xl cursor-pointer transition font-bold ${
                hoveredMenu
                  ? hoveredMenu === menu
                    ? 'text-white'
                    : 'text-gray-400'
                  : 'text-white'
              }`}
              onMouseEnter={() => setHoveredMenu(menu)}
              onMouseLeave={() => setHoveredMenu(null)}
              onClick={() => {
                if (menu === 'home') navigate('/home');
                if (menu === 'dashboard') navigate('/dashboard');
                if (menu === 'disconnect') {
                  localStorage.removeItem('access_token');
                  navigate('/login', { state: { mode: 'login' } });
                }
              }}
            >
              {menu.charAt(0).toUpperCase() + menu.slice(1)}
            </li>
          ))}
        </ul>
      </div>

      {/* Main content */}
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${menuOpen ? 'ml-64' : 'ml-14'}`}
      >
        <div className="p-6">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 items-stretch">
            <div className="md:col-span-2">
              <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden dark:border-gray-800 dark:bg-white/[0.03] relative h-full flex flex-row">
                {/* Heatmap à gauche */}
                <div className="w-[50%] flex items-center justify-center p-4">
                  <SoilTempHeatmap />
                </div>
                <div className="w-[50%] flex flex-col gap-6 justify-center p-6 overflow-y-auto">
                  {/* Soil Insights */}
                  <div className="rounded-xl bg-[#cba99acc] border border-amber-300 shadow-sm p-5 transition-all duration-200 ease-in-out transform hover:scale-105 hover:shadow-2xl cursor-pointer">
                    <div className="flex items-center mb-2">
                      <span className="text-amber-700 text-2xl mr-2">🌡️</span>
                      <h3 className="text-lg font-bold text-amber-800">Soil Temperature Overview</h3>
                    </div>
                    {soilTemps && soilTemps.every(t => t !== null) && (
                      <div className="flex flex-row items-center justify-center gap-8 mb-2">
                        <div className="flex flex-col items-center">
                          <span className="text-2xl font-bold text-amber-900">
                            {(soilTemps.reduce((a, b) => a + b, 0) / soilTemps.length).toFixed(1)}°C
                          </span>
                          <span className="text-xs text-amber-700">Average</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-2xl font-bold text-amber-900">{Math.min(...soilTemps)}°C</span>
                          <span className="text-xs text-amber-700">Min</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-2xl font-bold text-amber-900">{Math.max(...soilTemps)}°C</span>
                          <span className="text-xs text-amber-700">Max</span>
                        </div>
                      </div>
                    )}
                    <ul className="space-y-2 mt-2">
                      {getSoilInsights(soilTemps).map((msg, i) => (
                        <li key={i} className="text-base text-amber-900 flex items-start">
                          <span>{msg}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Light Insights */}
                  <div className="rounded-xl bg-yellow-50 border border-yellow-200 shadow-sm p-5 transition-all duration-200 ease-in-out transform hover:scale-105 hover:shadow-2xl cursor-pointer flex flex-col">
                    <div className="flex items-center mb-4">
                      <span className="text-yellow-500 text-4xl mr-3">☀️</span>
                      <h3 className="text-xl font-bold text-yellow-700">Light Insights</h3>
                    </div>
                    {(() => {
                      const validExt = extData.filter(v => v && v > 0);
                      const validInt = intData.filter(v => v && v > 0);
                      if (!validExt.length || !validInt.length) {
                        return (
                          <div className="text-red-700 font-semibold mb-2">
                            ❌ No data available for analysis.
                          </div>
                        );
                      }
                      const avgExt = Math.round(validExt.reduce((a, b) => a + b, 0) / validExt.length);
                      const avgInt = Math.round(validInt.reduce((a, b) => a + b, 0) / validInt.length);
                      const ratio = avgExt > 0 ? avgInt / avgExt : 0;
                      const ratioPercent = Math.round(ratio * 100);
                      return (
                        <div className="flex flex-row items-center justify-center gap-8 mb-2">
                          <div className="flex flex-col items-center">
                            <span className="text-2xl font-bold text-yellow-900">{avgExt} Lux</span>
                            <span className="text-xs text-yellow-700">Outdoor Avg</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-2xl font-bold text-yellow-900">{avgInt} Lux</span>
                            <span className="text-xs text-yellow-700">Indoor Avg</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-2xl font-bold text-yellow-900">{ratioPercent}%</span>
                            <span className="text-xs text-yellow-700">Transmission</span>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="w-full flex flex-col items-start mt-2">
                      {(() => {
                        const insight = getInsight(extData, intData);
                        if (!insight || !insight.props || !insight.props.children) return null;
                        const [, adviceBlock] = insight.props.children;
                        if (!adviceBlock) return null;
                        const spans = React.Children.toArray(adviceBlock.props.children).filter(child => child && child.type === "span");
                        if (!spans.length) return null;
                        return spans.map((span, i) => {
                          const text = span.props.children;
                          const phrase = Array.isArray(text) ? text.join('') : text;
                          return (
                            <div key={i} className="text-base text-yellow-900 flex items-center gap-2 mb-1">
                              <span className="text-xl">{phrase}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="md:col-span-1 flex flex-col gap-6 h-full">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 h-full">
                <h2 className="text-xl font-semibold mb-4 text-black text-center">Insights (3 days)</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl bg-orange-50 border border-orange-200 p-6 dark:bg-white/[0.03] dark:border-gray-800 min-h-[300px] flex flex-col justify-between transition-all duration-200 ease-in-out transform hover:scale-105 hover:shadow-2xl cursor-pointer">
                    {Array.isArray(insights) && insights[0] ? (
                      <>
                        <h3 className="text-lg font-semibold text-orange-500 text-center">{insights[0].title}</h3>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center mt-4">
                          {insights[0].data.split(' ')[0]}
                        </p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center">
                          {insights[0].data.split(' ')[1]}
                        </p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center">
                          {insights[0].data.split(' ')[2]}
                        </p>
                        <h4 className="text-lg font-semibold text-orange-600 dark:text-gray-400 text-center mt-4">
                          {insights[0].overallTitle}
                        </h4>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center mt-2">
                          {insights[0].overallAverage}
                          <br />
                          <span className="text-[20px] font-normal text-gray-500">
                            {insights[0].variability !== undefined && insights[0].variability !== null ? `${insights[0].variability}` : ''}
                          </span>
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-500 italic text-center">Loading...</p>
                    )}
                  </div>
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-6 dark:bg-white/[0.03] dark:border-gray-800 min-h-[300px] flex flex-col justify-between transition-all duration-200 ease-in-out transform hover:scale-105 hover:shadow-2xl cursor-pointer">
                    {Array.isArray(insights) && insights[1] ? (
                      <>
                        <h3 className="text-lg font-semibold text-blue-500 text-center">{insights[1].title}</h3>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center mt-4">
                          {insights[1].data.split(' ')[0]}
                        </p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center">
                          {insights[1].data.split(' ')[1]}
                        </p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center">
                          {insights[1].data.split(' ')[2]}
                        </p>
                        <h4 className="text-lg font-semibold text-blue-600 dark:text-gray-400 text-center mt-4">
                          {insights[1].overallTitle}
                        </h4>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center mt-2">
                          {insights[1].overallAverage}
                          <br />
                          <span className="text-[20px] font-normal text-gray-500">
                            {insights[1].variability !== undefined && insights[1].variability !== null ? `${insights[1].variability}` : ''}
                          </span>
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-500 italic text-center">Loading...</p>
                    )}
                  </div>
                  <div className="rounded-xl bg-green-50 border border-gray-200 p-6 dark:bg-white/[0.03] dark:border-gray-800 min-h-[300px] flex flex-col justify-between transition-all duration-200 ease-in-out transform hover:scale-105 hover:shadow-2xl cursor-pointer">
                    {Array.isArray(insights) && insights[2] ? (
                      <>
                        <h3 className="text-lg font-semibold text-green-500 text-center">{insights[2].title}</h3>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center mt-4">
                          {insights[2].data.split(' ')[0]}
                        </p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center">
                          {insights[2].data.split(' ')[1]}
                        </p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center">
                          {insights[2].data.split(' ')[2]}
                        </p>
                        <h4 className="text-lg font-semibold text-green-600 dark:text-gray-400 text-center mt-4">
                          {insights[2].overallTitle}
                        </h4>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center mt-2">
                          {insights[2].overallAverage}
                          <br />
                          <span className="text-[20px] font-normal text-gray-500">
                            {insights[2].variability !== undefined && insights[2].variability !== null ? `${insights[2].variability}` : ''}
                          </span>
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-500 italic text-center">Loading...</p>
                    )}
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-6 dark:bg-white/[0.03] dark:border-gray-800 md:col-span-3 transition-all duration-200 ease-in-out transform hover:scale-105 hover:shadow-2xl cursor-pointer">
                    <div className="grid grid-cols-3 divide-x divide-gray-300">
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
            <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-white/[0.03] md:p-4 mb-6 md:col-span-3 w-full min-h-[400px] flex flex-col">
              <LightWeekAreaChart />
            </div>
            {errorMessage && <div className="highlight-error-message mt-6">{errorMessage}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Highlight;