import React, { useState, useEffect } from 'react';
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
    return `Month (${now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })})`;
  }

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

  const getLastValueBlock = (type) => {
    const arr = sensors[type] || [];
    if (period[type] === 'day-average' || period[type] === 'week') {
      if (type === 'light') {
        const ext = arr.find(s => s.mode === 'ext')?.data;
        const int = arr.find(s => s.mode === 'int')?.data;
        if (mode === 'all') {
          return (
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
          );
        } else if (['ext', 'int'].includes(mode)) {
          const data = arr[0]?.data;
          const labelColor = mode === 'ext' ? '#609966' : '#40513B';
          return (
            <div style={{ textAlign: 'center' }}>
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
          );
        } else if (['ext', 'int'].includes(mode)) {
          const data = arr[0]?.data;
          const labelColor = mode === 'ext' ? '#609966' : '#40513B';
          return (
            <div style={{ textAlign: 'center' }}>
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
          );
        } else if (['1', '2', '3', '4'].includes(mode)) {
          const data = arr[0]?.data;
          const labelColor = '#609966';
          return (
            <div style={{ textAlign: 'center' }}>
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
    } else {
      if (type === 'light') {
        const ext = arr.find(s => s.mode === 'ext')?.data;
        const int = arr.find(s => s.mode === 'int')?.data;
        if (mode === 'all') {
          return (
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
          );
        } else if (['ext', 'int'].includes(mode)) {
          const data = arr[0]?.data;
          const labelColor = mode === 'ext' ? '#609966' : '#40513B';
          return (
            <div style={{ textAlign: 'center' }}>
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
          );
        } else if (['ext', 'int'].includes(mode)) {
          const data = arr[0]?.data;
          const labelColor = mode === 'ext' ? '#609966' : '#40513B';
          return (
            <div style={{ textAlign: 'center' }}>
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
          );
        } else if (['1', '2', '3', '4'].includes(mode)) {
          const data = arr[0]?.data;
          const labelColor = '#609966';
          return (
            <div style={{ textAlign: 'center' }}>
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

    if (period[type] === 'day-average') {
      if (mode === 'all') {
        arr.forEach(({ mode: m, data }) => {
          if (type === 'light') {
            series.push({
              name: m === 'ext' ? 'Ext Lum' : 'Int Lum',
              data: data.map(item => item.average_value || 0),
              color: m === 'ext' ? '#F9B233' : '#40513B'
            });
          }
          if (type === 'env') {
            if (m === 'ext') {
              series.push(
                {
                  name: 'Ext CO2',
                  data: data.map(item => item.average_valueCO2 || 0),
                  color: '#FF0000',
                  yAxis: 0
                },
                {
                  name: 'Ext Temp',
                  data: data.map(item => item.average_valueTemp || 0),
                  color: '#609966',
                  yAxis: 1
                },
                {
                  name: 'Ext Hum',
                  data: data.map(item => item.average_valueHum || 0),
                  color: '#0000FF',
                  yAxis: 2
                }
              );
            }
            if (m === 'int') {
              series.push(
                {
                  name: 'Int CO2',
                  data: data.map(item => item.average_valueCO2 || 0),
                  color: '#B22222',
                  yAxis: 0
                },
                {
                  name: 'Int Temp',
                  data: data.map(item => item.average_valueTemp || 0),
                  color: '#B0C4DE',
                  yAxis: 1
                },
                {
                  name: 'Int Hum',
                  data: data.map(item => item.average_valueHum || 0),
                  color: '#8A2BE2',
                  yAxis: 2
                }
              );
            }
          }
          if (type === 'soil') {
            const colorMap = {
              '1': '#FFA500',
              '2': '#00CED1',
              '3': '#FF69B4',
              '4': '#808080'
            };
            if (['1', '2', '3', '4'].includes(m)) {
              series.push(
                {
                  name: `Soil ${m} Hum`,
                  data: data.map(item => item.average_valueSM || 0),
                  color: colorMap[m],
                  yAxis: 0
                },
                {
                  name: `Soil ${m} Temp`,
                  data: data.map(item => item.average_valueTemp || 0),
                  color: colorMap[m],
                  yAxis: 1
                },
                {
                  name: `Soil ${m} EC`,
                  data: data.map(item => item.average_valueEC || 0),
                  color: colorMap[m],
                  yAxis: 2
                }
              );
            }
          }
          if (!categories.length && data && data.length) {
            categories = data.map(item => item.hour);
          }
        });
      } else if (
        (type === 'light' && ['ext', 'int'].includes(mode)) ||
        (type === 'env' && ['ext', 'int'].includes(mode)) ||
        (type === 'soil' && ['1', '2', '3', '4'].includes(mode))
      ) {
        const data = arr[0]?.data || [];
        if (type === 'light') {
          series.push({
            name: mode === 'ext' ? 'Ext Lum' : 'Int Lum',
            data: data.map(item => item.average_value || 0),
            color: mode === 'ext' ? '#F9B233' : '#40513B'
          });
        }
        if (type === 'env') {
          series.push(
            {
              name: 'CO2',
              data: data.map(item => item.average_valueCO2 || 0),
              color: '#FF0000',
              yAxis: 0
            },
            {
              name: 'Temp',
              data: data.map(item => item.average_valueTemp || 0),
              color: '#609966',
              yAxis: 1
            },
            {
              name: 'Hum',
              data: data.map(item => item.average_valueHum || 0),
              color: '#0000FF',
              yAxis: 2
            }
          );
        }
        if (type === 'soil') {
          series.push(
            {
              name: 'Hum',
              data: data.map(item => item.average_valueSM || 0),
              color: '#0000FF',
              yAxis: 0
            },
            {
              name: 'Temp',
              data: data.map(item => item.average_valueTemp || 0),
              color: '#609966',
              yAxis: 1
            },
            {
              name: 'EC',
              data: data.map(item => item.average_valueEC || 0),
              color: '#FF0000',
              yAxis: 2
            }
          );
        }
        categories = data.map(item => item.hour);
      }

      if (period[type] === 'week') {
        // 1. On filtre selon mode (all ou un seul jeu de données)
        const weekDatasets = (mode === 'all')
          ? arr
          : arr.filter(s => s.mode === mode);

        // 2. Construction des séries
        weekDatasets.forEach(({ mode: m, data }) => {
          if (type === 'light') {
            series.push({
              name: m === 'ext' ? 'Ext Lum' : 'Int Lum',
              data: data.map(item => item.average_value || 0),
              color: m === 'ext' ? '#F9B233' : '#40513B',
              lineWidth: 3,
              marker: { symbol: m === 'ext' ? 'circle' : 'triangle' }
            });
          }
          if (type === 'env') {
            const prefixes = m === 'ext' ? 'Ext' : 'Int';
            const colors = m === 'ext'
              ? ['#FF0000','#609966','#0000FF']
              : ['#B22222','#B0C4DE','#8A2BE2'];
            ['CO2','Temp','Hum'].forEach((key, i) => {
              series.push({
                name: `${prefixes} ${key}`,
                data: data.map(item => item[`average_value${key}`] || 0),
                color: colors[i],
                yAxis: i,
                marker: { symbol: m === 'ext' ? 'circle' : 'triangle' }
              });
            });
          }
          if (type === 'soil') {
            const colorMap = { '1':'#FFA500','2':'#00CED1','3':'#FF69B4','4':'#808080' };
            if (['1','2','3','4'].includes(m)) {
              ['SM','Temp','EC'].forEach((key, i) => {
                series.push({
                  name: `Soil ${m} ${key}`,
                  data: data.map(item => item[`average_value${key}`] || 0),
                  color: colorMap[m],
                  yAxis: i,
                  marker: { symbol: 'circle' }
                });
              });
            }
          }
        });

        // 3. Catégories (dates) basées sur le premier jeu de données
        const firstWeekData = weekDatasets[0]?.data || [];
        categories = firstWeekData.map(item => item.date || item.hour || '');
        // 4. Configuration Highcharts
        return {
          chart: { type: 'line', backgroundColor: 'rgba(0,0,0,0)', height: 450, spacingBottom: 60 },
          title: { text: null },
          xAxis: {
            categories,
            title: { text: 'Date', style: { fontSize: '14px' } },
            labels: { rotation: -45, style: { fontSize: '12px' }, y: 25, enabled: true },
            scrollbar: { enabled: true }
          },
          yAxis: type === 'light'
            ? { title: { text: 'Luminosity (lux)' }, min: 0 }
            : type === 'soil'
              ? [
                  { title: { text: 'Humidity (%)' }, min: 0 },
                  { title: { text: 'Temp (°C)' }, opposite: true, min: 0 },
                  { title: { text: 'EC (mS/cm)' }, opposite: true, min: 0 }
                ]
              : [
                  { title: { text: 'CO₂ (ppm)' }, min: 0 },
                  { title: { text: 'Temp (°C)' }, opposite: true, min: 0 },
                  { title: { text: 'Humidity (%)' }, opposite: true, min: 0 }
                ],
          legend: { layout: 'vertical', align: 'right', verticalAlign: 'middle' },
          series
        };
      } else {
        return {
          chart: {
            type: 'column',
            backgroundColor: 'rgba(0,0,0,0)',
            height: 400,
            width: null
          },
          title: { text: null },
          xAxis: {
            visible: true,              // force l’axe X visible
            lineWidth: 1,               // dessine la ligne de l’axe
            tickLength: 5,              // longueur des graduations
            tickColor: '#40513B',
            tickmarkPlacement: 'on',
            categories,
            title: { text: 'Date', style: { fontSize: '14px' } },
            labels: {
              enabled: true,            // force l’affichage des labels
              rotation: -45,
              style: { fontSize: '12px' },
              y: 25                     // décale les labels en dessous de l’axe
            }
          },
          yAxis: type === 'light' ? {
            title: { text: 'Luminosity (lux)' },
            min: 0
          } : type === 'soil' ? [
            { title: { text: 'Humidity (%)' }, labels: { style: { color: '#609966' } }, min: 0 },
            { title: { text: 'Temp (°C)' }, labels: { style: { color: '#B22222' } }, opposite: true, min: 0 },
            { title: { text: 'EC (mS/cm)' }, labels: { style: { color: '#0000FF' } }, opposite: true, min: 0 }
          ] : [
            { title: { text: 'CO₂ (ppm)' }, labels: { style: { color: '#FF0000' } }, min: 0 },
            { title: { text: 'Temp (°C)' }, labels: { style: { color: '#609966' } }, opposite: true, min: 0 },
            { title: { text: 'Humidity (%)' }, labels: { style: { color: '#0000FF' } }, opposite: true, min: 0 }
          ],
          legend: {
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'middle'
          },
          plotOptions: {
            column: {
              pointPadding: 0.1,
              groupPadding: 0.2
            }
          },
          series
        };
      }

    } else {
      if (mode === 'all') {
        arr.forEach(({ mode: m, data }) => {
          if (type === 'light') {
            series.push({
              name: m === 'ext' ? 'Ext Lum' : 'Int Lum',
              data: data.map(item => item.value || item.average_value || 0),
              color: m === 'ext' ? '#F9B233' : '#40513B',
              lineWidth: 3,
              marker: { symbol: m === 'ext' ? 'circle' : 'triangle' }
            });
          }
          if (type === 'env') {
            if (m === 'ext') {
              series.push(
                {
                  name: 'Ext CO2',
                  data: data.map(item => item.valueCO2 || item.average_valueCO2 || 0),
                  color: '#FF0000',
                  yAxis: 0,
                  marker: { symbol: 'circle' }
                },
                {
                  name: 'Ext Temp',
                  data: data.map(item => item.valueTemp || item.average_valueTemp || 0),
                  color: '#609966',
                  yAxis: 1,
                  marker: { symbol: 'circle' }
                },
                {
                  name: 'Ext Hum',
                  data: data.map(item => item.valueHum || item.average_valueHum || 0),
                  color: '#0000FF',
                  yAxis: 2,
                  marker: { symbol: 'circle' }
                }
              );
            }
            if (m === 'int') {
              series.push(
                {
                  name: 'Int CO2',
                  data: data.map(item => item.valueCO2 || item.average_valueCO2 || 0),
                  color: '#B22222',
                  yAxis: 0,
                  marker: { symbol: 'triangle' }
                },
                {
                  name: 'Int Temp',
                  data: data.map(item => item.valueTemp || 0),
                  color: '#B0C4DE',
                  yAxis: 1,
                  marker: { symbol: 'triangle' }
                },
                {
                  name: 'Int Hum',
                  data: data.map(item => item.valueHum || item.average_valueHum || 0),
                  color: '#8A2BE2',
                  yAxis: 2
                }
              );
            }
          }
          if (type === 'soil') {
            const colorMap = {
              '1': '#FFA500',
              '2': '#00CED1',
              '3': '#FF69B4',
              '4': '#808080'
            };
            if (['1', '2', '3', '4'].includes(m)) {
              const data = (arr.find(s => s.mode === m) || {}).data || [];
              series.push(
                {
                  name: `Soil ${m} Hum`,
                  data: data.map(item => item.valueSM || item.average_valueSM || 0),
                  color: colorMap[m],
                  yAxis: 0,
                  dashStyle: 'Solid',
                  marker: { symbol: 'circle' }
                },
                {
                  name: `Soil ${m} Temp`,
                  data: data.map(item => item.valueTemp || item.average_valueTemp || 0),
                  color: colorMap[m],
                  yAxis: 1,
                  dashStyle: 'ShortDash',
                  marker: { symbol: 'circle' }
                },
                {
                  name: `Soil ${m} EC`,
                  data: data.map(item => item.valueEC || item.average_valueEC || 0),
                  color: colorMap[m],
                  yAxis: 2,
                  dashStyle: 'Dot',
                  marker: { symbol: 'circle' }
                }
              );
            }
          }
          if (!categories.length && data && data.length) {
            categories = data.map(item => {
              let dateStr = item.datetime || '';
              if (!dateStr) return '';
              const dateObj = new Date(dateStr.replace(' ', 'T'));
              return dateObj && dateObj.toTimeString ? dateObj.toTimeString().slice(0, 5) : '';
            });
          }
        });
      } else if (
        (type === 'light' && ['ext', 'int'].includes(mode)) ||
        (type === 'env' && ['ext', 'int'].includes(mode)) ||
        (type === 'soil' && ['1', '2', '3', '4'].includes(mode))
      ) {
        const data = arr[0]?.data || [];
        if (type === 'light') {
          series.push({
            name: mode === 'ext' ? 'Ext Lum' : 'Int Lum',
            data: data.map(item => item.value || item.average_value || 0),
            color: mode === 'ext' ? '#F9B233' : '#40513B',
            lineWidth: 3,
            marker: { symbol: mode === 'ext' ? 'circle' : 'triangle' }
          });
        }
        if (type === 'env') {
          series.push(
            {
              name: 'CO2',
              data: data.map(item => item.valueCO2 || item.average_valueCO2 || 0),
              color: '#FF0000',
              yAxis: 0,
              marker: { symbol: mode === 'ext' ? 'circle' : 'triangle' }
            },
            {
              name: 'Temp',
              data: data.map(item => item.valueTemp || 0),
              color: '#609966',
              yAxis: 1,
              marker: { symbol: mode === 'ext' ? 'circle' : 'triangle' }
            },
            {
              name: 'Hum',
              data: data.map(item => item.valueHum || item.average_valueHum || 0),
              color: '#0000FF',
              yAxis: 2,
              marker: { symbol: mode === 'ext' ? 'circle' : 'triangle' }
            }
          );
        }
        if (type === 'soil') {
          series.push(
            {
              name: 'Hum',
              data: data.map(item => item.valueSM || item.average_valueSM || 0),
              color: '#0000FF',
              yAxis: 0,
              marker: { symbol: 'circle' }
            },
            {
              name: 'Temp',
              data: data.map(item => item.valueTemp || 0),
              color: '#609966',
              yAxis: 1,
              marker: { symbol: 'circle' }
            },
            {
              name: 'EC',
              data: data.map(item => item.valueEC || 0),
              color: '#FF0000',
              yAxis: 2,
              marker: { symbol: 'circle' }
            }
          );
        }
        categories = data.map(item => {
          let dateStr = item.datetime || '';
          if (!dateStr) return '';
          const dateObj = new Date(dateStr.replace(' ', 'T'));
          return dateObj && dateObj.toTimeString ? dateObj.toTimeString().slice(0, 5) : '';
        });
      }

      return {
        chart: {
          type: 'line',
          backgroundColor: 'rgba(0,0,0,0)',
          height: 400,
          width: null,
          spacingBottom: 60    // ← réserve de l’espace sous le graphique
        },
        title: { text: null },
        xAxis: {
          categories,
          title: {
          text: (period[type] === 'week' || period[type] === 'month')
              ? 'Date'
              : 'Hour'
        },
        },
        yAxis: type === 'light' ? {
          title: { text: 'Luminosity (lux)' },
          min: 0
        } : type === 'soil' ? [
          { title: { text: 'Humidity (%)' }, labels: { style: { color: '#609966' } }, min: 0 },
          { title: { text: 'Temp (°C)' }, labels: { style: { color: '#B22222' } }, opposite: true, min: 0 },
          { title: { text: 'EC (mS/cm)' }, labels: { style: { color: '#0000FF' } }, opposite: true, min: 0 }
        ] : [
          { title: { text: 'CO₂ (ppm)' }, labels: { style: { color: '#FF0000' } }, min: 0 },
          { title: { text: 'Temp (°C)' }, labels: { style: { color: '#609966' } }, opposite: true, min: 0 },
          { title: { text: 'Humidity (%)' }, labels: { style: { color: '#0000FF' } }, opposite: true, min: 0 }
        ],
        legend: {
          layout: 'vertical',
          align: 'right',
          verticalAlign: 'middle'
        },
        series
      };
    }
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

  if (loading) return <div className="dashboard-bg">Loading...</div>;

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
        )}
        {(mode === 'all' || mode === 'ext' || mode === 'int') && (
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
        )}
        {(mode === 'all' || ['1', '2', '3', '4'].includes(mode)) && (
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
        )}
      </div>
    </div>
  );
}

export default Dashboard;