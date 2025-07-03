import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import HighchartsSection from './HighchartsSection';
import '../styles/AppHome.css';

const PERIODS = [
  { value: 'day-average', label: 'Day average' },
  { value: 'full-day', label: 'Full day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'pic-average', label: 'Pic average (day/night)' },
];

const DATA_MODES = [
  { value: 'all', label: 'All' },
  { value: 'ext', label: 'Ext' },
  { value: 'int', label: 'Int' },
  { value: '1', label: 'Sensor 1' },
  { value: '2', label: 'Sensor 2' },
  { value: '3', label: 'Sensor 3' },
  { value: '4', label: 'Sensor 4' },
];


// Composant pour navigation semaine/mois
function PeriodNav({ periodType, offset, setOffset, label }) {
  return (
    <div className="week-controls">
      <button
        className="week-btn"
        onClick={() => setOffset(offset - 1)}
      >{'<'}</button>
      <span className="week-label">{label}</span>
      <button
        className="week-btn"
        onClick={() => setOffset(offset + 1)}
        disabled={offset >= 0}
      >{'>'}</button>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();

  const [mode, setMode] = useState('all');
  const [period, setPeriod] = useState({
    light: 'full-day',
    env: 'full-day',
    soil: 'full-day'
  });
  const [sensors, setSensors] = useState({ light: [], env: [], soil: [] });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [exportFormat, setExportFormat] = useState('csv');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Offsets pour chaque section et chaque période
  const [weekOffset, setWeekOffset] = useState({ light: 0, env: 0, soil: 0 });
  const [monthOffset, setMonthOffset] = useState({ light: 0, env: 0, soil: 0 });

  const scrollPosition = useRef(0);

  const endpointMap = {
    light: {
      'full-day': {
        ext: '/api/sensors/sensor_light_ext/day',
        int: '/api/sensors/sensor_light_int/day',
      },
      'day-average': {
        ext: '/api/sensors/sensor_light_ext/day/average',
        int: '/api/sensors/sensor_light_int/day/average',
      },
      week: {
        ext: '/api/sensors/sensor_light_ext/week',
        int: '/api/sensors/sensor_light_int/week',
      },
      month: {
        ext: '/api/sensors/sensor_light_ext/month',
        int: '/api/sensors/sensor_light_int/month',
      },
      'pic-average': {
        ext: '/api/sensors/sensor_light_ext/day/pic-average',
        int: '/api/sensors/sensor_light_int/day/pic-average',
      },
    },
    env: {
      'full-day': {
        ext: '/api/sensors/sensor_co2temphum_ext/day',
        int: '/api/sensors/sensor_co2temphum_int/day',
      },
      'day-average': {
        ext: '/api/sensors/sensor_co2temphum_ext/day/average',
        int: '/api/sensors/sensor_co2temphum_int/day/average',
      },
      week: {
        ext: '/api/sensors/sensor_co2temphum_ext/week',
        int: '/api/sensors/sensor_co2temphum_int/week',
      },
      month: {
        ext: '/api/sensors/sensor_co2temphum_ext/month',
        int: '/api/sensors/sensor_co2temphum_int/month',
      },
      'pic-average': {
        ext: '/api/sensors/sensor_co2temphum_ext/day/pic-average',
        int: '/api/sensors/sensor_co2temphum_int/day/pic-average',
      },
    },
    soil: {
      'full-day': {
        '1': '/api/sensors/sensor_smtempec_1/day',
        '2': '/api/sensors/sensor_smtempec_2/day',
        '3': '/api/sensors/sensor_smtempec_3/day',
        '4': '/api/sensors/sensor_smtempec_4/day',
      },
      'day-average': {
        '1': '/api/sensors/sensor_smtempec_1/day/average',
        '2': '/api/sensors/sensor_smtempec_2/day/average',
        '3': '/api/sensors/sensor_smtempec_3/day/average',
        '4': '/api/sensors/sensor_smtempec_4/day/average',
      },
      week: {
        '1': '/api/sensors/sensor_smtempec_1/week',
        '2': '/api/sensors/sensor_smtempec_2/week',
        '3': '/api/sensors/sensor_smtempec_3/week',
        '4': '/api/sensors/sensor_smtempec_4/week',
      },
      month: {
        '1': '/api/sensors/sensor_smtempec_1/month',
        '2': '/api/sensors/sensor_smtempec_2/month',
        '3': '/api/sensors/sensor_smtempec_3/month',
        '4': '/api/sensors/sensor_smtempec_4/month',
      },
      'pic-average': {
        '1': '/api/sensors/sensor_smtempec_1/day/pic-average',
        '2': '/api/sensors/sensor_smtempec_2/day/pic-average',
        '3': '/api/sensors/sensor_smtempec_3/day/pic-average',
        '4': '/api/sensors/sensor_smtempec_4/day/pic-average',
      },
    },
  };

  useEffect(() => {
    scrollPosition.current = window.scrollY;
    const fetchAll = async () => {
      setLoading(true);
      setErrorMessage('');
      const token = localStorage.getItem('access_token') || '';
      if (!token) {
        navigate('/login', { replace: true, state: { item: 'login' } });
        return;
      }

      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        const results = {};
        const types = ['light', 'env', 'soil'];

        for (const type of types) {
          let modesToFetch;
          if (mode === 'all') {
            modesToFetch = type === 'soil' ? ['1', '2', '3', '4'] : ['ext', 'int'];
          } else if (type === 'soil' && ['1', '2', '3', '4'].includes(mode)) {
            modesToFetch = [mode];
          } else if (type !== 'soil' && ['ext', 'int'].includes(mode)) {
            modesToFetch = [mode];
          } else {
            modesToFetch = [];
          }

          const arr = await Promise.all(
            modesToFetch.map(async m => {
              let path = endpointMap[type][period[type]][m];
              // Ajoute l'offset dans l'URL pour week et month
              if (period[type] === 'week') {
                path += `?offset=${weekOffset[type]}`;
              } else if (period[type] === 'month') {
                path += `?offset=${monthOffset[type]}`;
              }
              const url = `http://localhost:8080${path}`;
              const res = await fetch(url, { headers });
              if (!res.ok) {
                return { mode: m, data: [] };
              }
              const json = await res.json();
              const data = Array.isArray(json) ? json : [json];
              return { mode: m, data };
            })
          );

          results[type] = arr;
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
  }, [
    mode,
    period.light, period.env, period.soil,
    weekOffset.light, weekOffset.env, weekOffset.soil,
    monthOffset.light, monthOffset.env, monthOffset.soil,
    refreshTrigger,
    navigate
  ]);

  // Ajoute ce useEffect pour restaurer la position après chargement :
  useEffect(() => {
    if (!loading) {
      window.scrollTo({ top: scrollPosition.current, behavior: 'auto' });
    }
  }, [loading]);
  
  function handlePeriodChange(section, value, offset = 0) {
    setPeriod(prev => ({ ...prev, [section]: value }));
    if (value === 'week') {
      setWeekOffset(prev => ({ ...prev, [section]: offset }));
    } else if (value === 'month') {
      setMonthOffset(prev => ({ ...prev, [section]: offset }));
    } else {
      setWeekOffset(prev => ({ ...prev, [section]: 0 }));
      setMonthOffset(prev => ({ ...prev, [section]: 0 }));
    }
  }

  function handleOffsetChange(section, periodType, newOffset) {
    if (periodType === 'week') {
      setWeekOffset(prev => ({ ...prev, [section]: newOffset }));
    } else if (periodType === 'month') {
      setMonthOffset(prev => ({ ...prev, [section]: newOffset }));
    }
  }

  const getWeekLabel = (offset) => {
    const now = new Date();
    // Trouve le lundi de la semaine courante
    const monday = new Date(now.setDate(now.getDate() - now.getDay() + 1 + offset * 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return `Week (${monday.getDate()}/${monday.getMonth() + 1} - ${sunday.getDate()}/${sunday.getMonth() + 1})`;
  }

  const getMonthLabel = (offset) => {
    const now = new Date();
    now.setMonth(now.getMonth() + offset);
    // Utilise 'en-US' pour l'anglais
    return `Month (${now.toLocaleString('en-US', { month: 'long', year: 'numeric' })})`;
  };

  const formatLux = (value) => {
    if (value === undefined || value === null || value === 'N/A') return 'N/A';
    return `${value} Lux`;
  };

  const getDailyAverage = (data, key) => {
    if (!data || !data.length) return 'N/A';
    const sum = data.reduce((acc, item) => acc + (item[key] || 0), 0);
    const avg = sum / data.length;
    return isNaN(avg) ? 'N/A' : Math.round(avg * 100) / 100;
  };

  // Fonction utilitaire pour le titre des valeurs à gauche
  const getValuesTitle = (period, type) => {
    switch (period) {
      case 'full-day':
        return 'Latest Value';
      case 'day-average':
        return 'Daily Average Values';
      case 'week':
        if (type === 'soil' || type === 'env') return 'Weekly Averages';
        return 'Weekly Average';
      case 'month':
        return 'Monthly Averages';
      case 'pic-average':
        return 'Mean Values per Period (Day/Night)';
      default:
        return '';
    }
  };

  const getLastValueBlock = (type, offset = 0) => {
    const arr = sensors[type] || [];

    // Helper to calculate monthly average for a given field
    const getMonthlyAverage = (data, field) => {
      if (!data || !data.length) return 'N/A';
      const values = data.map(item => item[field] ?? item[`average_${field}`] ?? null).filter(v => v !== null && !isNaN(v));
      if (!values.length) return 'N/A';
      const avg = values.reduce((sum, val) => sum + Number(val), 0) / values.length;
      return avg.toFixed(2); // Round to 2 decimal places
    };

    const filterDataByMonthOffset = (data, offset) => {
      const now = new Date();
      const target = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const targetMonth = target.getMonth();
      const targetYear = target.getFullYear();
      return (data || []).filter(item => {
        const date = new Date(item.date);
        return date.getMonth() === targetMonth && date.getFullYear() === targetYear;
      });
    };
    

    // MONTH
    if (period[type] === 'month') {
      if (type === 'light') {
        const ext = filterDataByMonthOffset(arr.find(s => s.mode === 'ext')?.data || [], offset);
        const int = filterDataByMonthOffset(arr.find(s => s.mode === 'int')?.data || [], offset);
        if (mode === 'all') {
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700, marginBottom: 8 }}>
                {getValuesTitle(period[type], type)}
              </div>
              <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {formatLux(getMonthlyAverage(ext, 'value'))}
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Ext Lum</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {formatLux(getMonthlyAverage(int, 'value'))}
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Int Lum</div>
                </div>
              </div>
            </div>
          );
        } else if (['ext', 'int'].includes(mode)) {
            const data = filterDataByMonthOffset(
              arr.find(s => s.mode === mode)?.data || [],
              offset
            );
          const labelColor = mode === 'ext' ? '#40513B' : '#40513B';
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: labelColor, fontWeight: 700, marginBottom: 8 }}>
                {getValuesTitle(period[type], type)}
              </div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {formatLux(getMonthlyAverage(data, 'value'))}
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>
                {mode === 'ext' ? 'Ext Lum' : 'Int Lum'}
              </div>
            </div>
          );
        }
      }
      if (type === 'env') {
        const ext = filterDataByMonthOffset(arr.find(s => s.mode === 'ext')?.data || [], offset);
        const int = filterDataByMonthOffset(arr.find(s => s.mode === 'int')?.data || [], offset);
        if (mode === 'all') {
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700, marginBottom: 8 }}>
                {getValuesTitle(period[type], type)}
              </div>
              <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {getMonthlyAverage(ext, 'valueTemp')} °C
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Temp</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {getMonthlyAverage(ext, 'valueHum')} %
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Hum</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {getMonthlyAverage(ext, 'valueCO2')} ppm
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>CO₂</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {getMonthlyAverage(int, 'valueTemp')} °C
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Temp</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {getMonthlyAverage(int, 'valueHum')} %
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Hum</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {getMonthlyAverage(int, 'valueCO2')} ppm
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>CO₂</div>
                </div>
              </div>
            </div>
          );
        } else if (['ext', 'int'].includes(mode)) {
            const data = filterDataByMonthOffset(
              arr.find(s => s.mode === mode)?.data || [],
              offset
            );
          const labelColor = mode === 'ext' ? '#40513B' : '#40513B';
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: labelColor, fontWeight: 700, marginBottom: 8 }}>
                {getValuesTitle(period[type], type)}
              </div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {getMonthlyAverage(data, 'valueTemp')} °C
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>Temp</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {getMonthlyAverage(data, 'valueHum')} %
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>Hum</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {getMonthlyAverage(data, 'valueCO2')} ppm
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>CO₂</div>
            </div>
          );
        }
      }
      if (type === 'soil') {
        if (mode === 'all') {
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700, marginBottom: 8 }}>
                {getValuesTitle(period[type], type)}
              </div>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'flex-start' }}>
                {['1', '2', '3', '4'].map((sensor, index) => {
                  const data = filterDataByMonthOffset(arr.find(s => s.mode === sensor)?.data || [], offset);
                  return (
                    <React.Fragment key={sensor}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                          {getMonthlyAverage(data, 'valueTemp')} °C
                        </div>
                        <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Temp</div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                          {getMonthlyAverage(data, 'valueSM')} %
                        </div>
                        <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Hum</div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                          {getMonthlyAverage(data, 'valueEC')} mS/cm
                        </div>
                        <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>EC ({sensor})</div>
                      </div>
                      {index < 3 && (
                        <div style={{ fontSize: 32, color: '#40513B', fontWeight: 700, alignSelf: 'center' }}>|</div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          );
        } else if (['1', '2', '3', '4'].includes(mode)) {
          const data = filterDataByMonthOffset(arr[0]?.data || [], offset);
          const labelColor = '#40513B';
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: labelColor, fontWeight: 700, marginBottom: 8 }}>
                {getValuesTitle(period[type], type)}
              </div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {getMonthlyAverage(data, 'valueTemp')} °C
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>Temp</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {getMonthlyAverage(data, 'valueSM')} %
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>Hum</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {getMonthlyAverage(data, 'valueEC')} mS/cm
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>EC (Sensor {mode})</div>
            </div>
          );
        }
      }
    }

    // DAY-AVERAGE and WEEK
    if (period[type] === 'day-average' || period[type] === 'week') {
      if (type === 'light') {
        const ext = arr.find(s => s.mode === 'ext')?.data;
        const int = arr.find(s => s.mode === 'int')?.data;
        if (mode === 'all') {
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700, marginBottom: 8 }}>
                {getValuesTitle(period[type], type)}
              </div>
              <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {formatLux(getDailyAverage(ext, 'average_value'))}
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Ext Lum</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {formatLux(getDailyAverage(int, 'average_value'))}
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Int Lum</div>
                </div>
              </div>
            </div>
          );
        } else if (['ext', 'int'].includes(mode)) {
          const data = arr[0]?.data;
          const labelColor = mode === 'ext' ? '#40513B' : '#40513B';
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: labelColor, fontWeight: 700, marginBottom: 8 }}>
                {getValuesTitle(period[type], type)}
              </div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {formatLux(getDailyAverage(data, 'average_value'))}
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>
                {mode === 'ext' ? 'Ext Lum' : 'Int Lum'}
              </div>
            </div>
          );
        }
      }
      if (type === 'env') {
        const ext = arr.find(s => s.mode === 'ext')?.data;
        const int = arr.find(s => s.mode === 'int')?.data;
        if (mode === 'all') {
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700, marginBottom: 8 }}>
                {getValuesTitle(period[type], type)}
              </div>
              <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {getDailyAverage(ext, 'average_valueTemp')} °C
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Temp</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {getDailyAverage(ext, 'average_valueHum')} %
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Hum</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {getDailyAverage(ext, 'average_valueCO2')} ppm
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>CO₂</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {getDailyAverage(int, 'average_valueTemp')} °C
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Temp</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {getDailyAverage(int, 'average_valueHum')} %
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Hum</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {getDailyAverage(int, 'average_valueCO2')} ppm
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>CO₂</div>
                </div>
              </div>
            </div>
          );
        } else if (['ext', 'int'].includes(mode)) {
          const data = arr[0]?.data;
          const labelColor = mode === 'ext' ? '#40513B' : '#40513B';
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: labelColor, fontWeight: 700, marginBottom: 8 }}>
                {getValuesTitle(period[type], type)}
              </div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {getDailyAverage(data, 'average_valueTemp')} °C
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>Temp</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {getDailyAverage(data, 'average_valueHum')} %
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>Hum</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {getDailyAverage(data, 'average_valueCO2')} ppm
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>CO₂</div>
            </div>
          );
        }
      }
      if (type === 'soil') {
        if (mode === 'all') {
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700, marginBottom: 8 }}>
                {getValuesTitle(period[type], type)}
              </div>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'flex-start' }}>
                {['1', '2', '3', '4'].map((sensor, index) => {
                  const data = arr.find(s => s.mode === sensor)?.data;
                  return (
                    <React.Fragment key={sensor}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                          {getDailyAverage(data, 'average_valueTemp')} °C
                        </div>
                        <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Temp</div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                          {getDailyAverage(data, 'average_valueSM')} %
                        </div>
                        <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Hum</div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                          {getDailyAverage(data, 'average_valueEC')} mS/cm
                        </div>
                        <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>EC ({sensor})</div>
                      </div>
                      {index < 3 && (
                        <div style={{ fontSize: 32, color: '#40513B', fontWeight: 700, alignSelf: 'center' }}>|</div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          );
        } else if (['1', '2', '3', '4'].includes(mode)) {
          const data = arr[0]?.data;
          const labelColor = '#40513B';
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: labelColor, fontWeight: 700, marginBottom: 8 }}>
                {getValuesTitle(period[type], type)}
              </div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {getDailyAverage(data, 'average_valueTemp')} °C
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>Temp</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {getDailyAverage(data, 'average_valueSM')} %
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>Hum</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {getDailyAverage(data, 'average_valueEC')} mS/cm
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>EC (Sensor {mode})</div>
            </div>
          );
        }
      }
    }

    // FULL-DAY and PIC-AVERAGE
    
    // FULL-DAY
    if (period[type] === 'full-day') {
      if (type === 'light') {
        const ext = arr.find(s => s.mode === 'ext')?.data;
        const int = arr.find(s => s.mode === 'int')?.data;
        if (mode === 'all') {
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700, marginBottom: 8 }}>
                {getValuesTitle(period[type], type)}
              </div>
              <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {formatLux(ext && ext.length ? ext[ext.length - 1].value : 'N/A')}
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Ext Lum</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {formatLux(int && int.length ? int[int.length - 1].value : 'N/A')}
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Int Lum</div>
                </div>
              </div>
            </div>
          );
        } else if (['ext', 'int'].includes(mode)) {
          const data = arr[0]?.data;
          const labelColor = mode === 'ext' ? '#40513B' : '#40513B';
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: labelColor, fontWeight: 700, marginBottom: 8 }}>
                {getValuesTitle(period[type], type)}
              </div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {formatLux(data && data.length ? data[data.length - 1].value : 'N/A')}
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>
                {mode === 'ext' ? 'Ext Lum' : 'Int Lum'}
              </div>
            </div>
          );
        }
      }
      if (type === 'env') {
        const ext = arr.find(s => s.mode === 'ext')?.data;
        const int = arr.find(s => s.mode === 'int')?.data;
        if (mode === 'all') {
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700, marginBottom: 8 }}>
                {getValuesTitle(period[type], type)}
              </div>
              <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {ext && ext.length ? `${ext[ext.length - 1].valueTemp} °C` : 'N/A'}
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Temp</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {ext && ext.length ? `${ext[ext.length - 1].valueHum} %` : 'N/A'}
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Hum</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {ext && ext.length ? `${ext[ext.length - 1].valueCO2} ppm` : 'N/A'}
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>CO₂</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {int && int.length ? `${int[int.length - 1].valueTemp} °C` : 'N/A'}
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Temp</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {int && int.length ? `${int[int.length - 1].valueHum} %` : 'N/A'}
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Hum</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {int && int.length ? `${int[int.length - 1].valueCO2} ppm` : 'N/A'}
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>CO₂</div>
                </div>
              </div>
            </div>
          );
        } else if (['ext', 'int'].includes(mode)) {
          const data = arr[0]?.data;
          const labelColor = mode === 'ext' ? '#40513B' : '#40513B';
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: labelColor, fontWeight: 700, marginBottom: 8 }}>
                {getValuesTitle(period[type], type)}
              </div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {data && data.length ? `${data[data.length - 1].valueTemp} °C` : 'N/A'}
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>Temp</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {data && data.length ? `${data[data.length - 1].valueHum} %` : 'N/A'}
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>Hum</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {data && data.length ? `${data[data.length - 1].valueCO2} ppm` : 'N/A'}
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>CO₂</div>
            </div>
          );
        }
      }
      if (type === 'soil') {
        if (mode === 'all') {
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700, marginBottom: 8 }}>
                {getValuesTitle(period[type], type)}
              </div>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'flex-start' }}>
                {['1', '2', '3', '4'].map((sensor, index) => {
                  const data = arr.find(s => s.mode === sensor)?.data;
                  return (
                    <React.Fragment key={sensor}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                          {data && data.length ? `${data[data.length - 1].valueTemp} °C` : 'N/A'}
                        </div>
                        <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Temp</div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                          {data && data.length ? `${data[data.length - 1].valueSM} %` : 'N/A'}
                        </div>
                        <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Hum</div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                          {data && data.length ? `${data[data.length - 1].valueEC} mS/cm` : 'N/A'}
                        </div>
                        <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>EC ({sensor})</div>
                      </div>
                      {index < 3 && (
                        <div style={{ fontSize: 32, color: '#40513B', fontWeight: 700, alignSelf: 'center' }}>|</div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          );
        } else if (['1', '2', '3', '4'].includes(mode)) {
          const data = arr[0]?.data;
          const labelColor = '#40513B';
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: labelColor, fontWeight: 700, marginBottom: 8 }}>
                {getValuesTitle(period[type], type)}
              </div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {data && data.length ? `${data[data.length - 1].valueTemp} °C` : 'N/A'}
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>Temp</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {data && data.length ? `${data[data.length - 1].valueSM} %` : 'N/A'}
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>Hum</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {data && data.length ? `${data[data.length - 1].valueEC} mS/cm` : 'N/A'}
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>EC (Sensor {mode})</div>
            </div>
          );
        }
      }
    }
    // PIC-AVERAGE
    if (period[type] === 'pic-average') {
      if (type === 'light') {
        const ext = arr.find(s => s.mode === 'ext')?.data;
        const int = arr.find(s => s.mode === 'int')?.data;
        if (mode === 'all') {
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700, marginBottom: 8 }}>
                {getValuesTitle(period[type], type)}
              </div>
              <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {formatLux(ext && ext.length ? ext[0].pic_average : 'N/A')}
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Ext Lum Avg</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {formatLux(int && int.length ? int[0].pic_average : 'N/A')}
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Int Lum Avg</div>
                </div>
              </div>
            </div>
          );
        } else if (['ext', 'int'].includes(mode)) {
          const data = arr[0]?.data;
          const labelColor = mode === 'ext' ? '#40513B' : '#40513B';
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: labelColor, fontWeight: 700, marginBottom: 8 }}>
                {getValuesTitle(period[type], type)}
              </div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {formatLux(data && data.length ? data[0].pic_average : 'N/A')}
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>
                {mode === 'ext' ? 'Ext Lum Avg' : 'Int Lum Avg'}
              </div>
            </div>
          );
        }
      }
      if (type === 'env') {
        const ext = arr.find(s => s.mode === 'ext')?.data;
        const int = arr.find(s => s.mode === 'int')?.data;
        if (mode === 'all') {
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700, marginBottom: 8 }}>
                {getValuesTitle(period[type], type)}
              </div>
              <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {ext && ext.length ? `${ext[0].pic_average_Temp} °C` : 'N/A'}
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Temp Avg</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {ext && ext.length ? `${ext[0].pic_average_Hum} %` : 'N/A'}
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Hum Avg</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {ext && ext.length ? `${ext[0].pic_average_CO2} ppm` : 'N/A'}
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>CO₂ Avg</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {int && int.length ? `${int[0].pic_average_Temp} °C` : 'N/A'}
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Temp Avg</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {int && int.length ? `${int[0].pic_average_Hum} %` : 'N/A'}
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Hum Avg</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                    {int && int.length ? `${int[0].pic_average_CO2} ppm` : 'N/A'}
                  </div>
                  <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>CO₂ Avg</div>
                </div>
              </div>
            </div>
          );
        } else if (['ext', 'int'].includes(mode)) {
          const data = arr[0]?.data;
          const labelColor = mode === 'ext' ? '#40513B' : '#40513B';
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: labelColor, fontWeight: 700, marginBottom: 8 }}>
                {getValuesTitle(period[type], type)}
              </div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {data && data.length ? `${data[0].pic_average_Temp} °C` : 'N/A'}
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>Temp Avg</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {data && data.length ? `${data[0].pic_average_Hum} %` : 'N/A'}
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>Hum Avg</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {data && data.length ? `${data[0].pic_average_CO2} ppm` : 'N/A'}
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>CO₂ Avg</div>
            </div>
          );
        }
      }
      if (type === 'soil') {
        if (mode === 'all') {
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700, marginBottom: 8 }}>
                {getValuesTitle(period[type], type)}
              </div>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'flex-start' }}>
                {['1', '2', '3', '4'].map((sensor, index) => {
                  const data = arr.find(s => s.mode === sensor)?.data;
                  return (
                    <React.Fragment key={sensor}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                          {data && data.length ? `${data[0].pic_average_Temp} °C` : 'N/A'}
                        </div>
                        <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Temp Avg</div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                          {data && data.length ? `${data[0].pic_average_SM} %` : 'N/A'}
                        </div>
                        <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>Hum Avg</div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#40513B' }}>
                          {data && data.length ? `${data[0].pic_average_EC} mS/cm` : 'N/A'}
                        </div>
                        <div style={{ fontSize: 16, color: '#40513B', fontWeight: 700 }}>EC Avg ({sensor})</div>
                      </div>
                      {index < 3 && (
                        <div style={{ fontSize: 32, color: '#40513B', fontWeight: 700, alignSelf: 'center' }}>|</div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          );
        } else if (['1', '2', '3', '4'].includes(mode)) {
          const data = arr[0]?.data;
          const labelColor = '#40513B';
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: labelColor, fontWeight: 700, marginBottom: 8 }}>
                {getValuesTitle(period[type], type)}
              </div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {data && data.length ? `${data[0].pic_average_Temp} °C` : 'N/A'}
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>Temp Avg</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {data && data.length ? `${data[0].pic_average_SM} %` : 'N/A'}
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>Hum Avg</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#40513B' }}>
                {data && data.length ? `${data[0].pic_average_EC} mS/cm` : 'N/A'}
              </div>
              <div style={{ fontSize: 18, color: labelColor, fontWeight: 700 }}>EC Avg (Sensor {mode})</div>
            </div>
          );
        }
      }
    }

    return <div style={{ textAlign: 'center', color: '#40513B' }}>No data available</div>;
  };

  const PeriodSelector = ({ value, onChange }) => (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '6px 14px',
        borderRadius: 8,
        border: '1.5px solid #9DC08B',
        fontFamily: "'League Spartan', sans-serif",
        fontSize: 14,
        background: '#EDF1D6',
        color: '#40513B',
        fontWeight: 600,
        minWidth: 120
      }}
    >
      {PERIODS.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );

  const DataSelector = () => (
    <select
      value={mode}
      onChange={e => setMode(e.target.value)}
      className="data-selector"
    >
      {DATA_MODES.map(m => (
        <option key={m.value} value={m.value}>{m.label}</option>
      ))}
    </select>
  );

  const RefreshButton = () => (
    <button
      className="refresh-button"
      onClick={() => setRefreshTrigger(t => t + 1)}
    >
      Refresh
    </button>
  );

  const getChartOptions = (type, offset = 0) => {
    const arr = sensors[type] || [];
    let series = [];
    let categories = [];

    // Helper to convert datetime string to timestamp (in milliseconds)
    const getTimestamp = (datetimeStr) => {
      if (!datetimeStr) return null;
      return new Date(datetimeStr + 'Z').getTime();
    };

    // Helpers for week/month
    function getWeekDates(offset = 0) {
      const today = new Date();
      const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1 + offset * 7));
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d.toISOString().slice(0, 10);
      });
    }

    function getMonthDates(offset = 0) {
      const now = new Date();
      now.setMonth(now.getMonth() + offset);
      const year = now.getFullYear();
      const month = now.getMonth();
      const days = new Date(year, month + 1, 0).getDate();
      return Array.from({ length: days }, (_, i) =>
        `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
      );
    }

    // Définir les couleurs pour les capteurs (dégradé du noir au vert)
    const colorMap = {
      light: ['#000000', '#9DC08B'], // ext: noir, int: vert
      env: ['#000000', '#9DC08B'],   // ext: noir, int: vert
      soil: ['#000000', '#333333', '#666666', '#9DC08B'] // Sensor 1: noir, Sensor 2: gris foncé, Sensor 3: gris moyen, Sensor 4: vert
    };

    // FULL-DAY
    if (period[type] === 'full-day') {
      if (mode === 'all') {
        arr.forEach(({ mode: m, data }, index) => {
          if (type === 'light') {
            series.push({
              name: `Lum ${m}`,
              data: data.map(item => [getTimestamp(item.datetime), item.value || null]),
              color: colorMap.light[index]
            });
          }
          if (type === 'env') {
            series.push(
              {
                name: `${m} CO2`,
                data: data.map(item => [getTimestamp(item.datetime), item.valueCO2 || null]),
                color: colorMap.env[index],
                yAxis: 0
              },
              {
                name: `${m} Temp`,
                data: data.map(item => [getTimestamp(item.datetime), item.valueTemp || null]),
                color: colorMap.env[index],
                yAxis: 1
              },
              {
                name: `${m} Hum`,
                data: data.map(item => [getTimestamp(item.datetime), item.valueHum || null]),
                color: colorMap.env[index],
                yAxis: 2
              }
            );
          }
          if (type === 'soil') {
            if (['1', '2', '3', '4'].includes(m)) {
              const soilIndex = parseInt(m) - 1;
              series.push(
                {
                  name: `Soil ${m} Hum`,
                  data: data.map(item => [getTimestamp(item.datetime), item.valueSM || null]),
                  color: colorMap.soil[soilIndex],
                  yAxis: 0
                },
                {
                  name: `Soil ${m} Temp`,
                  data: data.map(item => [getTimestamp(item.datetime), item.valueTemp || null]),
                  color: colorMap.soil[soilIndex],
                  yAxis: 1
                },
                {
                  name: `Soil ${m} EC`,
                  data: data.map(item => [getTimestamp(item.datetime), item.valueEC || null]),
                  color: colorMap.soil[soilIndex],
                  yAxis: 2
                }
              );
            }
          }
        });
      } else if (
        (type === 'light' && ['ext', 'int'].includes(mode)) ||
        (type === 'env' && ['ext', 'int'].includes(mode)) ||
        (type === 'soil' && ['1', '2', '3', '4'].includes(mode))
      ) {
        const data = arr[0]?.data || [];
        const index = type === 'soil' ? parseInt(mode) - 1 : (mode === 'ext' ? 0 : 1);
        if (type === 'light') {
          series.push({
            name: `Lum ${mode}`,
            data: data.map(item => [getTimestamp(item.datetime), item.value || null]),
            color: colorMap.light[index]
          });
        }
        if (type === 'env') {
          series.push(
            {
              name: 'CO2',
              data: data.map(item => [getTimestamp(item.datetime), item.valueCO2 || null]),
              color: colorMap.env[index],
              yAxis: 0
            },
            {
              name: 'Temp',
              data: data.map(item => [getTimestamp(item.datetime), item.valueTemp || null]),
              color: colorMap.env[index],
              yAxis: 1
            },
            {
              name: 'Hum',
              data: data.map(item => [getTimestamp(item.datetime), item.valueHum || null]),
              color: colorMap.env[index],
              yAxis: 2
            }
          );
        }
        if (type === 'soil') {
          series.push(
            {
              name: `Soil ${mode} Hum`,
              data: data.map(item => [getTimestamp(item.datetime), item.valueSM || null]),
              color: colorMap.soil[index],
              yAxis: 0
            },
            {
              name: `Soil ${mode} Temp`,
              data: data.map(item => [getTimestamp(item.datetime), item.valueTemp || null]),
              color: colorMap.soil[index],
              yAxis: 1
            },
            {
              name: `Soil ${mode} EC`,
              data: data.map(item => [getTimestamp(item.datetime), item.valueEC || null]),
              color: colorMap.soil[index],
              yAxis: 2
            }
          );
        }
      }

      return {
        chart: { type: 'line', backgroundColor: 'rgba(0,0,0,0)', height: 400, spacingBottom: 60 },
        title: { text: null },
        xAxis: {
          type: 'datetime',
          title: { text: 'Time', style: { fontSize: '14px' } },
          labels: {
            format: '{value:%H:%M}',
            rotation: -45,
            style: { fontSize: '12px' },
            y: 25
          },
          dateTimeLabelFormats: {
            hour: '%H:%M',
            minute: '%H:%M'
          }
        },
        yAxis: type === 'light' ? {
          title: { text: 'Luminosity (lux)' },
          min: 0
        } : type === 'soil' ? [
          { title: { text: 'Humidity (%)' }, min: 0 },
          { title: { text: 'Temp (°C)' }, opposite: true, min: 0 },
          { title: { text: 'EC (mS/cm)' }, opposite: true, min: 0 }
        ] : [
          { title: { text: 'CO₂ (ppm)' }, min: 0 },
          { title: { text: 'Temp (°C)' }, opposite: true, min: 0 },
          { title: { text: 'Humidity (%)' }, opposite: true, min: 0 }
        ],
        legend: { layout: 'vertical', align: 'right', verticalAlign: 'middle' },
        tooltip: {
          xDateFormat: '%Y-%m-%d %H:%M:%S',
          shared: true
        },
        series
      };
    }

    // WEEK
    if (period[type] === 'week') {
      const weekDates = getWeekDates(offset);
      categories = weekDates;
      const datasets = mode === 'all' ? arr : arr.filter(s => s.mode === mode);
      datasets.forEach(({ mode: m, data }, index) => {
        const valueMap = {};
        data.forEach(item => {
          const date = (item.date || '').slice(0, 10);
          if (type === 'light') valueMap[date] = item.average_value ?? item.value ?? null;
          if (type === 'env') {
            if (!valueMap[date]) valueMap[date] = {};
            valueMap[date].CO2 = item.average_valueCO2 ?? item.valueCO2 ?? null;
            valueMap[date].Temp = item.average_valueTemp ?? item.valueTemp ?? null;
            valueMap[date].Hum = item.average_valueHum ?? item.valueHum ?? null;
          }
          if (type === 'soil') {
            if (!valueMap[date]) valueMap[date] = {};
            valueMap[date].SM = item.average_valueSM ?? item.valueSM ?? null;
            valueMap[date].Temp = item.average_valueTemp ?? item.valueTemp ?? null;
            valueMap[date].EC = item.average_valueEC ?? item.valueEC ?? null;
          }
        });
        if (type === 'light') {
          series.push({
            name: `Lum ${m}`,
            data: weekDates.map(date => valueMap[date] ?? null),
            color: colorMap.light[index],
            marker: { enabled: true }
          });
        }
        if (type === 'env') {
          series.push(
            {
              name: `${m} CO2`,
              data: weekDates.map(date => (valueMap[date] ? valueMap[date].CO2 : null)),
              color: colorMap.env[index],
              yAxis: 0,
              marker: { enabled: true }
            },
            {
              name: `${m} Temp`,
              data: weekDates.map(date => (valueMap[date] ? valueMap[date].Temp : null)),
              color: colorMap.env[index],
              yAxis: 1,
              marker: { enabled: true }
            },
            {
              name: `${m} Hum`,
              data: weekDates.map(date => (valueMap[date] ? valueMap[date].Hum : null)),
              color: colorMap.env[index],
              yAxis: 2,
              marker: { enabled: true }
            }
          );
        }
        if (type === 'soil') {
          const soilIndex = parseInt(m) - 1;
          series.push(
            {
              name: `Soil ${m} Hum`,
              data: weekDates.map(date => (valueMap[date] ? valueMap[date].SM : null)),
              color: colorMap.soil[soilIndex],
              yAxis: 0,
              marker: { enabled: true }
            },
            {
              name: `Soil ${m} Temp`,
              data: weekDates.map(date => (valueMap[date] ? valueMap[date].Temp : null)),
              color: colorMap.soil[soilIndex],
              yAxis: 1,
              marker: { enabled: true }
            },
            {
              name: `Soil ${m} EC`,
              data: weekDates.map(date => (valueMap[date] ? valueMap[date].EC : null)),
              color: colorMap.soil[soilIndex],
              yAxis: 2,
              marker: { enabled: true }
            }
          );
        }
      });

      return {
        chart: { type: 'line', backgroundColor: 'rgba(0,0,0,0)', height: 400, spacingBottom: 60 },
        title: { text: null },
        xAxis: {
          categories,
          title: { text: 'Date', style: { fontSize: '14px' } },
          labels: { rotation: -45, style: { fontSize: '12px' }, y: 25, enabled: true }
        },
        yAxis: type === 'light' ? {
          title: { text: 'Luminosity (lux)' },
          min: 0
        } : type === 'soil' ? [
          { title: { text: 'Humidity (%)' }, min: 0 },
          { title: { text: 'Temp (°C)' }, opposite: true, min: 0 },
          { title: { text: 'EC (mS/cm)' }, opposite: true, min: 0 }
        ] : [
          { title: { text: 'CO₂ (ppm)' }, min: 0 },
          { title: { text: 'Temp (°C)' }, opposite: true, min: 0 },
          { title: { text: 'Humidity (%)' }, opposite: true, min: 0 }
        ],
        legend: { layout: 'vertical', align: 'right', verticalAlign: 'middle' },
        series
      };
    }

    // MONTH
    if (period[type] === 'month') {
      const datasets = mode === 'all' ? arr : arr.filter(s => s.mode === mode);
      series = [];

      const now = new Date();
      now.setMonth(now.getMonth() + offset);
      const year = now.getFullYear();
      const month = now.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const minDate = firstDay.getTime();
      const maxDate = lastDay.getTime();

      datasets.forEach(({ mode: m, data }, index) => {
        if (type === 'light') {
          series.push({
            name: `Lum ${m}`,
            data: data.map(item => [getTimestamp(item.date), item.average_value || null]),
            color: colorMap.light[index],
            marker: { enabled: true }
          });
        }
        if (type === 'env') {
          series.push(
            {
              name: `${m} CO2`,
              data: data.map(item => [getTimestamp(item.date), item.average_valueCO2 || null]),
              color: colorMap.env[index],
              yAxis: 0,
              marker: { enabled: true }
            },
            {
              name: `${m} Temp`,
              data: data.map(item => [getTimestamp(item.date), item.average_valueTemp || null]),
              color: colorMap.env[index],
              yAxis: 1,
              marker: { enabled: true }
            },
            {
              name: `${m} Hum`,
              data: data.map(item => [getTimestamp(item.date), item.average_valueHum || null]),
              color: colorMap.env[index],
              yAxis: 2,
              marker: { enabled: true }
            }
          );
        }
        if (type === 'soil') {
          const soilIndex = parseInt(m) - 1;
          if (['1', '2', '3', '4'].includes(m)) {
            series.push(
              {
                name: `Soil ${m} Hum`,
                data: data.map(item => [getTimestamp(item.date), item.average_valueSM || null]),
                color: colorMap.soil[soilIndex],
                yAxis: 0,
                marker: { enabled: true }
              },
              {
                name: `Soil ${m} Temp`,
                data: data.map(item => [getTimestamp(item.date), item.average_valueTemp || null]),
                color: colorMap.soil[soilIndex],
                yAxis: 1,
                marker: { enabled: true }
              },
              {
                name: `Soil ${m} EC`,
                data: data.map(item => [getTimestamp(item.date), item.average_valueEC || null]),
                color: colorMap.soil[soilIndex],
                yAxis: 2,
                marker: { enabled: true }
              }
            );
          }
        }
      });

      return {
        chart: {
          type: 'line',
          backgroundColor: 'rgba(0,0,0,0)',
          height: 400,
          spacingBottom: 60,
          zoomType: 'x'
        },
        title: { text: null },
        xAxis: {
          type: 'datetime',
          min: minDate,
          max: maxDate,
          title: { text: 'Date', style: { fontSize: '14px' } },
          labels: {
            style: { fontSize: '12px' },
            rotation: -45,
            y: 25,
            step: 2
          },
          dateTimeLabelFormats: {
            day: '%e/%m',
            hour: '%e/%m %H:%M'
          },
          scrollbar: { enabled: true }
        },
        yAxis: type === 'light' ? {
          title: { text: 'Luminosity (lux)' },
          min: 0
        } : type === 'soil' ? [
          { title: { text: 'Humidity (%)' }, min: 0 },
          { title: { text: 'Temp (°C)' }, opposite: true, min: 0 },
          { title: { text: 'EC (mS/cm)' }, opposite: true, min: 0 }
        ] : [
          { title: { text: 'CO₂ (ppm)' }, min: 0 },
          { title: { text: 'Temp (°C)' }, opposite: true, min: 0 },
          { title: { text: 'Humidity (%)' }, opposite: true, min: 0 }
        ],
        legend: { layout: 'vertical', align: 'right', verticalAlign: 'middle' },
        tooltip: {
          xDateFormat: '%Y-%m-%d %H:%M:%S',
          shared: true
        },
        series,
        navigator: { enabled: true },
        rangeSelector: { enabled: false }
      };
    }

    // DAY-AVERAGE
    if (period[type] === 'day-average') {
      if (mode === 'all') {
        arr.forEach(({ mode: m, data }, index) => {
          if (type === 'light') {
            series.push({
              name: `Lum ${m}`,
              data: data.map(item => item.average_value || item.value || 0),
              color: colorMap.light[index]
            });
          }
          if (type === 'env') {
            series.push(
              {
                name: `${m} CO2`,
                data: data.map(item => item.average_valueCO2 || 0),
                color: colorMap.env[index],
                yAxis: 0
              },
              {
                name: `${m} Temp`,
                data: data.map(item => item.average_valueTemp || 0),
                color: colorMap.env[index],
                yAxis: 1
              },
              {
                name: `${m} Hum`,
                data: data.map(item => item.average_valueHum || 0),
                color: colorMap.env[index],
                yAxis: 2
              }
            );
          }
          if (type === 'soil') {
            const soilIndex = parseInt(m) - 1;
            if (['1', '2', '3', '4'].includes(m)) {
              series.push(
                {
                  name: `Soil ${m} Hum`,
                  data: data.map(item => item.average_valueSM || 0),
                  color: colorMap.soil[soilIndex],
                  yAxis: 0
                },
                {
                  name: `Soil ${m} Temp`,
                  data: data.map(item => item.average_valueTemp || 0),
                  color: colorMap.soil[soilIndex],
                  yAxis: 1
                },
                {
                  name: `Soil ${m} EC`,
                  data: data.map(item => item.average_valueEC || 0),
                  color: colorMap.soil[soilIndex],
                  yAxis: 2
                }
              );
            }
          }
          if (!categories.length && data && data.length) {
            categories = data.map(item => `${String(item.hour).padStart(2, '0')}:00`);
          }
        });
      } else if (
        (type === 'light' && ['ext', 'int'].includes(mode)) ||
        (type === 'env' && ['ext', 'int'].includes(mode)) ||
        (type === 'soil' && ['1', '2', '3', '4'].includes(mode))
      ) {
        const data = arr[0]?.data || [];
        const index = type === 'soil' ? parseInt(mode) - 1 : (mode === 'ext' ? 0 : 1);
        if (type === 'light') {
          series.push({
            name: `Lum ${mode}`,
            data: data.map(item => item.average_value || item.value || 0),
            color: colorMap.light[index]
          });
        }
        if (type === 'env') {
          series.push(
            {
              name: 'CO2',
              data: data.map(item => item.average_valueCO2 || 0),
              color: colorMap.env[index],
              yAxis: 0
            },
            {
              name: 'Temp',
              data: data.map(item => item.average_valueTemp || 0),
              color: colorMap.env[index],
              yAxis: 1
            },
            {
              name: 'Hum',
              data: data.map(item => item.average_valueHum || 0),
              color: colorMap.env[index],
              yAxis: 2
            }
          );
        }
        if (type === 'soil') {
          series.push(
            {
              name: `Soil ${mode} Hum`,
              data: data.map(item => item.average_valueSM || 0),
              color: colorMap.soil[index],
              yAxis: 0
            },
            {
              name: `Soil ${mode} Temp`,
              data: data.map(item => item.average_valueTemp || 0),
              color: colorMap.soil[index],
              yAxis: 1
            },
            {
              name: `Soil ${mode} EC`,
              data: data.map(item => item.average_valueEC || 0),
              color: colorMap.soil[index],
              yAxis: 2
            }
          );
        }
        categories = data.map(item => `${String(item.hour).padStart(2, '0')}:00`);
      }

      return {
        chart: { type: 'column', backgroundColor: 'rgba(0,0,0,0)', height: 400, spacingBottom: 60 },
        title: { text: null },
        xAxis: {
          categories,
          title: { text: 'Hours', style: { fontSize: '14px' } },
          labels: { rotation: -45, style: { fontSize: '12px' }, y: 25, enabled: true }
        },
        yAxis: type === 'light' ? {
          title: { text: 'Luminosity (lux)' },
          min: 0
        } : type === 'soil' ? [
          { title: { text: 'Humidity (%)' }, min: 0 },
          { title: { text: 'Temp (°C)' }, opposite: true, min: 0 },
          { title: { text: 'EC (mS/cm)' }, opposite: true, min: 0 }
        ] : [
          { title: { text: 'CO₂ (ppm)' }, min: 0 },
          { title: { text: 'Temp (°C)' }, opposite: true, min: 0 },
          { title: { text: 'Humidity (%)' }, opposite: true, min: 0 }
        ],
        legend: { layout: 'vertical', align: 'right', verticalAlign: 'middle' },
        series
      };
    }

    // PIC-AVERAGE
    if (period[type] === 'pic-average') {
      const datasets = mode === 'all' ? arr : arr.filter(s => s.mode === mode);
      datasets.forEach(({ mode: m, data }, index) => {
        if (type === 'light') {
          series.push(
            {
              name: `Lum ${m} Max Day`,
              data: [data.max_day || 0],
              color: colorMap.light[index]
            },
            {
              name: `Lum ${m} Max Night`,
              data: [data.max_night || 0],
              color: colorMap.light[index]
            }
          );
        }
        if (type === 'env') {
          series.push(
            {
              name: `${m} Max Day CO2`,
              data: [data.max_day_CO2 || 0],
              color: colorMap.env[index],
              yAxis: 0
            },
            {
              name: `${m} Max Night CO2`,
              data: [data.max_night_CO2 || 0],
              color: colorMap.env[index],
              yAxis: 0
            },
            {
              name: `${m} Max Day Temp`,
              data: [data.max_day_Temp || 0],
              color: colorMap.env[index],
              yAxis: 1
            },
            {
              name: `${m} Max Night Temp`,
              data: [data.max_night_Temp || 0],
              color: colorMap.env[index],
              yAxis: 1
            },
            {
              name: `${m} Max Day Hum`,
              data: [data.max_day_Hum || 0],
              color: colorMap.env[index],
              yAxis: 2
            },
            {
              name: `${m} Max Night Hum`,
              data: [data.max_night_Hum || 0],
              color: colorMap.env[index],
              yAxis: 2
            }
          );
        }
        if (type === 'soil') {
          const soilIndex = parseInt(m) - 1;
          if (['1', '2', '3', '4'].includes(m)) {
            series.push(
              {
                name: `Soil ${m} Max Day Hum`,
                data: [data.max_day_SM || 0],
                color: colorMap.soil[soilIndex],
                yAxis: 0
              },
              {
                name: `Soil ${m} Max Night Hum`,
                data: [data.max_night_SM || 0],
                color: colorMap.soil[soilIndex],
                yAxis: 0
              },
              {
                name: `Soil ${m} Max Day Temp`,
                data: [data.max_day_Temp || 0],
                color: colorMap.soil[soilIndex],
                yAxis: 1
              },
              {
                name: `Soil ${m} Max Night Temp`,
                data: [data.max_night_Temp || 0],
                color: colorMap.soil[soilIndex],
                yAxis: 1
              },
              {
                name: `Soil ${m} Max Day EC`,
                data: [data.max_day_EC || 0],
                color: colorMap.soil[soilIndex],
                yAxis: 2
              },
              {
                name: `Soil ${m} Max Night EC`,
                data: [data.max_night_EC || 0],
                color: colorMap.soil[soilIndex],
                yAxis: 2
              }
            );
          }
        }
      });
      categories = ['Day', 'Night'];

      return {
        chart: { type: 'column', backgroundColor: 'rgba(0,0,0,0)', height: 400, spacingBottom: 60 },
        title: { text: null },
        xAxis: {
          categories,
          title: { text: 'Period', style: { fontSize: '14px' } },
          labels: { rotation: 0, style: { fontSize: '12px' }, y: 25, enabled: true }
        },
        yAxis: type === 'light' ? {
          title: { text: 'Luminosity (lux)' },
          min: 0
        } : type === 'soil' ? [
          { title: { text: 'Humidity (%)' }, min: 0 },
          { title: { text: 'Temp (°C)' }, opposite: true, min: 0 },
          { title: { text: 'EC (mS/cm)' }, opposite: true, min: 0 }
        ] : [
          { title: { text: 'CO₂ (ppm)' }, min: 0 },
          { title: { text: 'Temp (°C)' }, opposite: true, min: 0 },
          { title: { text: 'Humidity (%)' }, opposite: true, min: 0 }
        ],
        legend: { layout: 'vertical', align: 'right', verticalAlign: 'middle' },
        tooltip: {
          shared: true
        },
        series
      };
    }


    // Fallback
    return {
      chart: { type: 'line', backgroundColor: 'rgba(0,0,0,0)', height: 400, spacingBottom: 60 },
      title: { text: null },
      xAxis: { categories, title: { text: '' } },
      yAxis: { title: { text: '' } },
      series
    };
  };

  const exportData = () => {
    let exportDataArray = [];
    ['light', 'env', 'soil'].forEach(type => {
      (sensors[type] || []).forEach(s => exportDataArray = exportDataArray.concat(s.data || []));
    });
    if (exportDataArray.length === 0) { alert("Aucune donnée à exporter"); return; }
    if (exportFormat === 'csv') {
      const keys = Object.keys(exportDataArray[0] || {});
      const csvRows = [keys.join(','), ...exportDataArray.map(row => keys.map(k => row[k] || '').join(','))];
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'export.csv'; a.click();
      URL.revokeObjectURL(url);
    } else if (exportFormat === 'json') {
      const jsonContent = JSON.stringify(exportDataArray, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'export.json'; a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        Loading...
      </div>
    );
  }

  return (
    <div className="dashboard-bg">
      <div className="dashboard-ribbon">
        <div className="ribbon-header">
          <div className="ribbon-title">Greenhouse MTU</div>
          <button className="logout-button" onClick={() => { localStorage.removeItem('access_token'); navigate('/login'); }}>Disconnect</button>
        </div>
      </div>

      <div className="filters-container">
        <div className="mode-selector">
          <RefreshButton />
          <DataSelector />
        </div>
        <div className="export-controls">
          <select value={exportFormat} onChange={e => setExportFormat(e.target.value)}>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
          <button onClick={exportData}>Export</button>
        </div>
      </div>

      <div className="dashboard-content">
        {(mode === 'all' || mode === 'ext' || mode === 'int') && (
          <>
            <HighchartsSection
              type="light"
              period={period}
              mode={mode}
              weekOffset={weekOffset}
              monthOffset={monthOffset}
              getChartOptions={getChartOptions}
              getLastValueBlock={getLastValueBlock}
              handlePeriodChange={handlePeriodChange}
              handleOffsetChange={handleOffsetChange}
              PeriodSelector={PeriodSelector}
              PeriodNav={PeriodNav}
              getWeekLabel={getWeekLabel}
              getMonthLabel={getMonthLabel}
            />
            <div className="section-divider"></div>
          </>
        )}
        {(mode === 'all' || mode === 'ext' || mode === 'int') && (
          <>
            <HighchartsSection
              type="env"
              period={period}
              mode={mode}
              weekOffset={weekOffset}
              monthOffset={monthOffset}
              getChartOptions={getChartOptions}
              getLastValueBlock={getLastValueBlock}
              handlePeriodChange={handlePeriodChange}
              handleOffsetChange={handleOffsetChange}
              PeriodSelector={PeriodSelector}
              PeriodNav={PeriodNav}
              getWeekLabel={getWeekLabel}
              getMonthLabel={getMonthLabel}
            />
            <div className="section-divider"></div>
          </>
        )}
        {(mode === 'all' || ['1', '2', '3', '4'].includes(mode)) && (
          <>
            <HighchartsSection
              type="soil"
              period={period}
              mode={mode}
              weekOffset={weekOffset}
              monthOffset={monthOffset}
              getChartOptions={getChartOptions}
              getLastValueBlock={getLastValueBlock}
              handlePeriodChange={handlePeriodChange}
              handleOffsetChange={handleOffsetChange}
              PeriodSelector={PeriodSelector}
              PeriodNav={PeriodNav}
              getWeekLabel={getWeekLabel}
              getMonthLabel={getMonthLabel}
            />
            <div className="section-divider"></div>
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;