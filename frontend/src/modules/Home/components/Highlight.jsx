import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Highlight.css'; // Use dedicated Highlight.css
import { formatDistanceToNow } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

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
  const [exportFormat, setExportFormat] = useState('csv');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState('all');

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
            modesToFetch.map(async m => {
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

  const generateInsights = (type, data) => {
    const insights = [];
    const thresholds = {
      light: { min: 100, max: 100000, unit: 'Lux' },
      env: { CO2: { min: 400, max: 2000, unit: 'ppm' }, Temp: { min: 10, max: 35, unit: '°C' }, Hum: { min: 20, max: 80, unit: '%RH' } },
      soil: { SM: { min: 10, max: 60, unit: '%' }, Temp: { min: 10, max: 30, unit: '°C' }, EC: { min: 0.1, max: 2.0, unit: 'dS/m' } },
    };

    const calculateTrend = (values) => (values.length < 2 ? 'stable' : values.slice(0, Math.floor(values.length / 2)).reduce((sum, v) => sum + v, 0) / (values.length / 2) < values.slice(Math.floor(values.length / 2)).reduce((sum, v) => sum + v, 0) / (values.length / 2) ? 'increasing' : 'decreasing');

    data.forEach(({ mode: m, data: sensorData }) => {
      if (!sensorData || sensorData.length === 0) return;
      if (type === 'light') {
        const values = sensorData.map(d => d.value || d.average_value).filter(v => v !== null);
        if (values.length === 0) return;
        const max = Math.max(...values), min = Math.min(...values), trend = calculateTrend(values);
        const label = m === 'ext' ? 'External Light' : 'Internal Light';
        if (max > thresholds.light.max) insights.push(`${label}: High luminosity (${max} ${thresholds.light.unit}), exceeding range.`);
        if (min < thresholds.light.min) insights.push(`${label}: Low luminosity (${min} ${thresholds.light.unit}), below range.`);
        insights.push(`${label}: Trend ${trend}.`);
      }
      if (type === 'env') {
        ['valueCO2', 'valueTemp', 'valueHum'].forEach(key => {
          const values = sensorData.map(d => d[key] || d[`average_${key}`]).filter(v => v !== null && !isNaN(v));
          if (values.length === 0) return;
          const max = Math.max(...values), min = Math.min(...values), trend = calculateTrend(values);
          const label = `${m === 'ext' ? 'External' : 'Internal'} ${{ valueCO2: 'CO2', valueTemp: 'Temperature', valueHum: 'Humidity' }[key]}`;
          if (max > thresholds.env[{ valueCO2: 'CO2', valueTemp: 'Temp', valueHum: 'Hum' }[key]].max) insights.push(`${label}: High (${max} ${thresholds.env[{ valueCO2: 'CO2', valueTemp: 'Temp', valueHum: 'Hum' }[key]].unit}), exceeding range.`);
          if (min < thresholds.env[{ valueCO2: 'CO2', valueTemp: 'Temp', valueHum: 'Hum' }[key]].min) insights.push(`${label}: Low (${min} ${thresholds.env[{ valueCO2: 'CO2', valueTemp: 'Temp', valueHum: 'Hum' }[key]].unit}), below range.`);
          insights.push(`${label}: Trend ${trend}.`);
        });
      }
      if (type === 'soil') {
        ['valueSM', 'valueTemp', 'valueEC'].forEach(key => {
          const values = sensorData.map(d => d[key] || d[`average_${key}`]).filter(v => v !== null && !isNaN(v));
          if (values.length === 0) return;
          const max = Math.max(...values), min = Math.min(...values), trend = calculateTrend(values);
          const label = `Soil Sensor ${m} ${{ valueSM: 'Moisture', valueTemp: 'Temperature', valueEC: 'EC' }[key]}`;
          if (max > thresholds.soil[{ valueSM: 'SM', valueTemp: 'Temp', valueEC: 'EC' }[key]].max) insights.push(`${label}: High (${max} ${thresholds.soil[{ valueSM: 'SM', valueTemp: 'Temp', valueEC: 'EC' }[key]].unit}), exceeding range.`);
          if (min < thresholds.soil[{ valueSM: 'SM', valueTemp: 'Temp', valueEC: 'EC' }[key]].min) insights.push(`${label}: Low (${min} ${thresholds.soil[{ valueSM: 'SM', valueTemp: 'Temp', valueEC: 'EC' }[key]].unit}), below range.`);
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
        exportDataArray = exportDataArray.concat(insights.map((insight, index) => ({ type, insight: insight.replace(/,/g, ';'), timestamp: new Date().toISOString() })));
      }
      if (exportDataArray.length === 0) {
        alert('No insights to export.');
        return;
      }
      if (exportFormat === 'csv') {
        const csvContent = '\uFEFF' + ['Type,Insight,Timestamp', ...exportDataArray.map(row => `${row.type},${row.insight},${row.timestamp}`)].join('\n');
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
    <div className="highlight-modal-overlay">
      <div className="highlight-modal-content">
        <h2 className="highlight-modal-title">Export Insights</h2>
        <div className="highlight-modal-field">
          <label className="block text-sm font-medium mb-1">Data Type</label>
          <select value={exportType} onChange={(e) => setExportType(e.target.value)} className="highlight-modal-select">
            <option value="all">All</option>
            <option value="light">Light</option>
            <option value="env">Environment</option>
            <option value="soil">Soil</option>
          </select>
        </div>
        <div className="highlight-modal-field">
          <label className="block text-sm font-medium mb-1">Format</label>
          <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} className="highlight-modal-select">
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
        </div>
        <div className="highlight-modal-actions">
          <button className="highlight-button-effect bg-green-600 text-white" onClick={exportData}>Export</button>
          <button className="highlight-button-effect bg-gray-300 text-gray-800" onClick={() => setIsExportModalOpen(false)}>Cancel</button>
        </div>
      </div>
    </div>
  );

  const renderInsights = () => {
    const typesToRender = ['light', 'env', 'soil'];
    return typesToRender.map(type => {
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
      <div className="highlight-loading-overlay">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Small Boxes at the Top */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
            <svg className="fill-gray-800 dark:fill-white/90" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M11.665 3.75621C11.8762 3.65064 12.1247 3.65064 12.3358 3.75621L18.7807 6.97856L12.3358 10.2009C12.1247 10.3065 11.8762 10.3065 11.665 10.2009L5.22014 6.97856L11.665 3.75621ZM4.29297 8.19203V16.0946C4.29297 16.3787 4.45347 16.6384 4.70757 16.7654L11.25 20.0366V11.6513C11.1631 11.6205 11.0777 11.5843 10.9942 11.5426L4.29297 8.19203ZM12.75 20.037L19.2933 16.7654C19.5474 16.6384 19.7079 16.3787 19.7079 16.0946V8.19202L13.0066 11.5426C12.9229 11.5844 12.8372 11.6208 12.75 11.6516V20.037ZM13.0066 2.41456C12.3732 2.09786 11.6277 2.09786 10.9942 2.41456L4.03676 5.89319C3.27449 6.27432 2.79297 7.05342 2.79297 7.90566V16.0946C2.79297 16.9469 3.27448 17.726 4.03676 18.1071L10.9942 21.5857L11.3296 20.9149L10.9942 21.5857C11.6277 21.9024 12.3732 21.9024 13.0066 21.5857L19.9641 18.1071C20.7264 17.726 21.2079 16.9469 21.2079 16.0946V7.90566C21.2079 7.05342 20.7264 6.27432 19.9641 5.89319L13.0066 2.41456Z" />
            </svg>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800"></div>
            <div className="mt-5 flex items-end justify-between">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Orders</span>
                <h4 className="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">5,359</h4>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-error-50 py-0.5 pl-2 pr-2.5 text-sm font-medium text-error-600 dark:bg-error-500/15 dark:text-error-500">
                <svg className="fill-current" width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M5.31462 10.3761C5.45194 10.5293 5.65136 10.6257 5.87329 10.6257C5.8736 10.6257 5.8739 10.6257 5.87421 10.6257C6.0663 10.6259 6.25845 10.5527 6.40505 10.4062L9.40514 7.4082C9.69814 7.11541 9.69831 6.64054 9.40552 6.34754C9.11273 6.05454 8.63785 6.05438 8.34486 6.34717L6.62329 8.06753L6.62329 1.875C6.62329 1.46079 6.28751 1.125 5.87329 1.125C5.45908 1.125 5.12329 1.46079 5.12329 1.875L5.12329 8.06422L3.40516 6.34719C3.11218 6.05439 2.6373 6.05454 2.3445 6.34752C2.0517 6.64051 2.05185 7.11538 2.34484 7.40818L5.31462 10.3761Z" />
                </svg>
                9.05%
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
            <svg className="fill-gray-800 dark:fill-white/90" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M11.665 3.75621C11.8762 3.65064 12.1247 3.65064 12.3358 3.75621L18.7807 6.97856L12.3358 10.2009C12.1247 10.3065 11.8762 10.3065 11.665 10.2009L5.22014 6.97856L11.665 3.75621ZM4.29297 8.19203V16.0946C4.29297 16.3787 4.45347 16.6384 4.70757 16.7654L11.25 20.0366V11.6513C11.1631 11.6205 11.0777 11.5843 10.9942 11.5426L4.29297 8.19203ZM12.75 20.037L19.2933 16.7654C19.5474 16.6384 19.7079 16.3787 19.7079 16.0946V8.19202L13.0066 11.5426C12.9229 11.5844 12.8372 11.6208 12.75 11.6516V20.037ZM13.0066 2.41456C12.3732 2.09786 11.6277 2.09786 10.9942 2.41456L4.03676 5.89319C3.27449 6.27432 2.79297 7.05342 2.79297 7.90566V16.0946C2.79297 16.9469 3.27448 17.726 4.03676 18.1071L10.9942 21.5857L11.3296 20.9149L10.9942 21.5857C11.6277 21.9024 12.3732 21.9024 13.0066 21.5857L19.9641 18.1071C20.7264 17.726 21.2079 16.9469 21.2079 16.0946V7.90566C21.2079 7.05342 20.7264 6.27432 19.9641 5.89319L13.0066 2.41456Z" />
            </svg>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800"></div>
            <div className="mt-5 flex items-end justify-between">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Revenue</span>
                <h4 className="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">$12,450</h4>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-success-50 py-0.5 pl-2 pr-2.5 text-sm font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
                <svg className="fill-current" width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M6.68538 1.6239C6.54806 1.4707 6.34864 1.3743 6.12671 1.3743C6.1264 1.3743 6.1261 1.3743 6.12579 1.3743C5.9337 1.3741 5.74155 1.4473 5.59495 1.5938L2.59486 4.5918C2.30186 4.88459 2.30169 5.35946 2.59448 5.65246C2.88728 5.94546 3.36216 5.94562 3.65515 5.65283L5.37672 3.93247L5.37672 10.125C5.37672 10.5392 5.7125 10.875 6.12671 10.875C6.54093 10.875 6.87672 10.5392 6.87672 10.125L6.87672 3.93578L8.59485 5.65281C8.88783 5.94561 9.36271 5.94546 9.65551 5.65248C9.94831 5.35949 9.94816 4.88462 9.65517 4.59182L6.68538 1.6239Z" />
                </svg>
                5.23%
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
            <svg className="fill-gray-800 dark:fill-white/90" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M11.665 3.75621C11.8762 3.65064 12.1247 3.65064 12.3358 3.75621L18.7807 6.97856L12.3358 10.2009C12.1247 10.3065 11.8762 10.3065 11.665 10.2009L5.22014 6.97856L11.665 3.75621ZM4.29297 8.19203V16.0946C4.29297 16.3787 4.45347 16.6384 4.70757 16.7654L11.25 20.0366V11.6513C11.1631 11.6205 11.0777 11.5843 10.9942 11.5426L4.29297 8.19203ZM12.75 20.037L19.2933 16.7654C19.5474 16.6384 19.7079 16.3787 19.7079 16.0946V8.19202L13.0066 11.5426C12.9229 11.5844 12.8372 11.6208 12.75 11.6516V20.037ZM13.0066 2.41456C12.3732 2.09786 11.6277 2.09786 10.9942 2.41456L4.03676 5.89319C3.27449 6.27432 2.79297 7.05342 2.79297 7.90566V16.0946C2.79297 16.9469 3.27448 17.726 4.03676 18.1071L10.9942 21.5857L11.3296 20.9149L10.9942 21.5857C11.6277 21.9024 12.3732 21.9024 13.0066 21.5857L19.9641 18.1071C20.7264 17.726 21.2079 16.9469 21.2079 16.0946V7.90566C21.2079 7.05342 20.7264 6.27432 19.9641 5.89319L13.0066 2.41456Z" />
            </svg>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800"></div>
            <div className="mt-5 flex items-end justify-between">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Users</span>
                <h4 className="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">1,234</h4>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-success-50 py-0.5 pl-2 pr-2.5 text-sm font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
                <svg className="fill-current" width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M6.68538 1.6239C6.54806 1.4707 6.34864 1.3743 6.12671 1.3743C6.1264 1.3743 6.1261 1.3743 6.12579 1.3743C5.9337 1.3741 5.74155 1.4473 5.59495 1.5938L2.59486 4.5918C2.30186 4.88459 2.30169 5.35946 2.59448 5.65246C2.88728 5.94546 3.36216 5.94562 3.65515 5.65283L5.37672 3.93247L5.37672 10.125C5.37672 10.5392 5.7125 10.875 6.12671 10.875C6.54093 10.875 6.87672 10.5392 6.87672 10.125L6.87672 3.93578L8.59485 5.65281C8.88783 5.94561 9.36271 5.94546 9.65551 5.65248C9.94831 5.35949 9.94816 4.88462 9.65517 4.59182L6.68538 1.6239Z" />
                </svg>
                3.15%
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden dark:border-gray-800 dark:bg-white/[0.03]">
              <MapContainer
                center={[51.8856, -8.5360]}
                zoom={16}
                scrollWheelZoom={false}
                style={{ height: '500px', width: '100%' }}
                className="rounded-2xl"
              >
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution='© Esri — Source: Esri, Maxar, Earthstar Geographics'
                />
                <Marker position={[51.8856, -8.5360]}>
                  <Popup>Greenhouse MTU</Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
          <div className="col-span-1 flex flex-col gap-6">
            {renderInsights().slice(0, 2)}
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