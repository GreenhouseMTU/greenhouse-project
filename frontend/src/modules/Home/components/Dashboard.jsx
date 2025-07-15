import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import HighchartsSection from './HighchartsSection';
import '../styles/Dashboard.css';
import { formatDistanceToNow } from 'date-fns';

const PERIODS = [
  { value: 'full-day', label: 'Full day' },
  { value: 'day-average', label: 'Day average' },
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


const SensorStatusWidget = ({ type, sensors, mode, period }) => {
  // Log pour déboguer
  console.log('SensorStatusWidget:', { type, period: period[type], mode, sensors: sensors[type] });

  // Ne rien afficher si la période pour ce type n'est pas 'full-day'
  if (period[type] !== 'full-day') {
    console.log(`Skipping widget for ${type}, period is ${period[type]}, not 'full-day'`);
    return null;
  }

  const getSensorStatus = (data) => {
    if (!data || !data.length || !data[data.length - 1]?.datetime) {
      console.log(`No valid data for ${type}, mode ${data?.mode || 'unknown'}:`, data);
      return { isActive: false, duration: 'N/A' };
    }
    // Interpréter datetime comme une date locale (IST, pas UTC)
    const latest = new Date(data[data.length - 1].datetime);
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const isActive = latest >= fifteenMinutesAgo;
    const duration = formatDistanceToNow(latest, { addSuffix: true });
    console.log(`Status for ${type}, mode ${data?.mode || 'unknown'}:`, { isActive, duration, latest: latest.toISOString() });
    return { isActive, duration };
  };

  const modesToCheck = mode === 'all' 
    ? (type === 'soil' ? ['1', '2', '3', '4'] : ['ext', 'int'])
    : [mode];

  return (
    <div className="sensor-status-text">
      {modesToCheck.map(m => {
        const sensorData = sensors[type]?.find(s => s.mode === m)?.data;
        const { isActive, duration } = getSensorStatus(sensorData);
        const label = type === 'soil' ? `Sensor ${m}` : `${m === 'ext' ? 'Ext' : 'Int'} sensor`;
        return (
          <span key={m}>
            {isActive ? '🟢' : '🔴'} <span className="sensor-label">{label}</span>: {isActive ? 'Last data' : 'Offline for'}: {duration}
          </span>
        );
      })}
    </div>
  );
};



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


  // Add new state for export modal
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState('light');
  const [exportPeriod, setExportPeriod] = useState('full-day');
  const [exportOffset, setExportOffset] = useState(0);


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
          const modesToFetch = mode === 'all'
            ? (type === 'soil' ? ['1', '2', '3', '4'] : ['ext', 'int'])
            : (type === 'soil' && ['1', '2', '3', '4'].includes(mode)) || (type !== 'soil' && ['ext', 'int'].includes(mode))
              ? [mode]
              : [];

          results[type] = await Promise.all(
            modesToFetch.map(async m => {
              let path = endpointMap[type][period[type]][m];
              if (period[type] === 'week' || period[type] === 'month') {
                path += `?offset=${period[type] === 'week' ? weekOffset[type] : monthOffset[type]}`;
              }
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

    // Configuration des champs par type
    const typeConfig = {
      light: {
        fields: [{ key: 'value', unit: 'Lux', format: formatLux, label: mode => `${mode === 'ext' ? 'Ext' : 'Int'} Lum`, picKey: '' }],
        modes: ['ext', 'int'],
        gap: 24,
        showSeparator: true,
        separatorSize: '32px'
      },
      env: {
        fields: [
          { key: 'valueTemp', unit: '°C', label: mode => `${mode === 'ext' ? 'Ext' : 'Int'} Temp`, picKey: 'Temp' },
          { key: 'valueHum', unit: '%RH', label: mode => `${mode === 'ext' ? 'Ext' : 'Int'} Hum`, picKey: 'Hum' },
          { key: 'valueCO2', unit: 'ppm', label: mode => `${mode === 'ext' ? 'Ext' : 'Int'} CO₂`, picKey: 'CO2' }
        ],
        modes: ['ext', 'int'],
        gap: 24,
        showSeparator: true,
        separatorSize: '32px'
      },
      soil: {
        fields: [
          { key: 'valueTemp', unit: '°C', label: mode => `Temp ${mode}`, picKey: 'Temp' },
          { key: 'valueSM', unit: '%', label: mode => `Moist ${mode}`, picKey: 'SM' },
          { key: 'valueEC', unit: 'dS/m', label: mode => `EC ${mode}`, picKey: 'EC' }
        ],
        modes: ['1', '2', '3', '4'],
        gap: 16,
        showSeparator: true,
        separatorSize: '32px'
      }
    };

    // Helper pour calculer la moyenne mensuelle
    const getMonthlyAverage = (data, field) => {
      if (!data || !data.length) return 'N/A';
      const values = data.map(item => item[field] ?? item[`average_${field}`] ?? null).filter(v => v !== null && !isNaN(v));
      if (!values.length) return 'N/A';
      const avg = values.reduce((sum, val) => sum + Number(val), 0) / values.length;
      return avg.toFixed(2);
    };

    // Helper pour filtrer les données par mois
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

    // Helper pour formater la valeur
    const formatValue = (value, field) => {
      if (value === undefined || value === null || value === 'N/A') return 'N/A';
      return field.format ? field.format(value) : `${value} ${field.unit}`;
    };

    // Helper pour générer le JSX d'une section de valeurs
    const renderValueBlock = (data, fields, mode, periodType) => {
      const isMonth = periodType === 'month';
      const isDayAverageOrWeek = periodType === 'day-average' || periodType === 'week';
      const isFullDay = periodType === 'full-day';
      const isPicAverage = periodType === 'pic-average';

      return (
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {fields.map(field => {
              let value;
              if (isMonth) {
                value = getMonthlyAverage(data, field.key);
              } else if (isDayAverageOrWeek) {
                value = getDailyAverage(data, `average_${field.key}`);
              } else if (isFullDay) {
                value = data && data.length ? data[data.length - 1][field.key] : 'N/A';
              } else if (isPicAverage) {
                value = data && data.length ? data[0][`pic_average${field.picKey ? `_${field.picKey}` : ''}`] : 'N/A';
              }
              return (
                <React.Fragment key={field.key}>
                  <div style={{ fontSize: '29px', fontWeight: 800, color: '#40513B' }}>
                    {formatValue(value, field)}
                  </div>
                  <div style={{ fontSize: isMonth || isDayAverageOrWeek || isPicAverage ? '16px' : '18px', color: '#40513B', fontWeight: 700 }}>
                    {field.label(mode)}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      );
    };

    const config = typeConfig[type];
    if (!config) return <div style={{ textAlign: 'center', color: '#40513B' }}>No data available</div>;

    if (mode === 'all') {
      return (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', color: '#40513B', fontWeight: 700, marginBottom: '8px' }}>
            {getValuesTitle(period[type], type)}
          </div>
          <div style={{ display: 'flex', gap: config.gap, justifyContent: 'center', alignItems: 'flex-start' }}>
            {config.modes.map((m, index) => {
              const data = period[type] === 'month'
                ? filterDataByMonthOffset(arr.find(s => s.mode === m)?.data || [], offset)
                : arr.find(s => s.mode === m)?.data;
              return (
                <React.Fragment key={m}>
                  {renderValueBlock(data, config.fields, m, period[type])}
                  {config.showSeparator && index < config.modes.length - 1 && (
                    <div style={{ fontSize: config.separatorSize, color: '#40513B', fontWeight: 700, alignSelf: 'center' }}>|</div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      );
    } else if (config.modes.includes(mode)) {
      const data = period[type] === 'month'
        ? filterDataByMonthOffset(arr.find(s => s.mode === mode)?.data || [], offset)
        : arr.find(s => s.mode === mode)?.data;
      return (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', color: '#40513B', fontWeight: 700, marginBottom: '8px' }}>
            {getValuesTitle(period[type], type)}
          </div>
          {renderValueBlock(data, config.fields, mode, period[type])}
        </div>
      );
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
      className="refresh-button button-effect"
      onClick={() => setRefreshTrigger(t => t + 1)}
    >
      Refresh
      <span></span><span></span><span></span><span></span>
    </button>
  );

  const getChartOptions = (type, offset = 0) => {
    const arr = sensors[type] || [];
    let series = [];
    let categories = [];

    const getTimestamp = (datetimeStr) => {
      if (!datetimeStr) return null;
      return new Date(datetimeStr + 'Z').getTime();
    };

    const getWeekDates = (offset = 0) => {
      const today = new Date();
      const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1 + offset * 7));
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d.toISOString().slice(0, 10);
      });
    };

    const getMonthDates = (offset = 0) => {
      const now = new Date();
      now.setMonth(now.getMonth() + offset);
      const year = now.getFullYear();
      const month = now.getMonth();
      const days = new Date(year, month + 1, 0).getDate();
      return Array.from({ length: days }, (_, i) =>
        `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
      );
    };

    const colorMap = {
      light: ['#000000', '#9DC08B'],
      env: ['#000000', '#9DC08B'],
      soil: ['#000000', '#333333', '#666666', '#9DC08B']
    };

    const baseOptions = {
      chart: { backgroundColor: 'rgba(0,0,0,0)', height: 400, spacingBottom: 60 },
      title: { text: null },
      legend: {
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle',
        enabled: true,
        useHTML: true,
        labelFormatter: function () {
          return `
            <div style="display: flex; align-items: center; width: 100px;">
              <input type="checkbox"
                    id="cb-${this.index}-${type}" 
                    ${this.visible ? 'checked' : ''} 
                    style="width: 20px; height: 20px; margin: 0 4px 0 0; flex-shrink: 0;"
                    onchange="Highcharts.charts[this.chart.index].series[${this.index}].setVisible(this.checked);">
              <span style="font-family: 'League Spartan', sans-serif; font-size: 18px; color: #40513B;">
                ${this.name}
              </span>
            </div>
          `;
        }
      },
      plotOptions: {
        series: {
          showCheckbox: false, // Disable native Highcharts checkboxes
          selected: true,
          visible: true,
          events: {
            checkboxClick: function (event) {
              this.setVisible(event.checked);
            },
            legendItemClick: function () {
              // Prevent default legend click to avoid double toggling
              return false;
            },
            mouseOver: function () {
              const series = this;
              const yAxisIndex = series.options.yAxis || 0;
              if (series.chart.yAxis[yAxisIndex]) {
                series.chart.yAxis[yAxisIndex].update({
                  title: {
                    style: {
                      color: '#FF0000', // Rouge pour mettre en évidence
                      fontWeight: 'bold'
                    }
                  },
                  lineWidth: 3, // Épaisseur de la ligne de l'axe
                  lineColor: '#FF0000' // Couleur de la ligne de l'axe
                }, false);
                series.chart.redraw();
              }
            },
            mouseOut: function () {
              const series = this;
              const yAxisIndex = series.options.yAxis || 0;
              if (series.chart.yAxis[yAxisIndex]) {
                series.chart.yAxis[yAxisIndex].update({
                  title: {
                    style: {
                      color: '#000000', // Couleur par défaut
                      fontWeight: 'normal'
                    }
                  },
                  lineWidth: 1, // Épaisseur par défaut
                  lineColor: '#000000' // Couleur par défaut
                }, false);
                series.chart.redraw();
              }
            }
          }
        }
      },
      series
    };

    if (period[type] === 'full-day') {
      if (mode === 'all') {
        arr.forEach(({ mode: m, data }, index) => {
          if (type === 'light') {
            series.push({
              name: `Lum ${m}`,
              data: data.map(item => [getTimestamp(item.datetime), item.value || null]),
              color: colorMap.light[index],
              marker: { enabled: true },
              visible: true,
              showInLegend: true,
              showCheckbox: true
            });
          }
          if (type === 'env') {
            series.push(
              {
                name: `${m} CO2`,
                data: data.map(item => [getTimestamp(item.datetime), item.valueCO2 || null]),
                color: colorMap.env[index],
                yAxis: 0,
                visible: true,
                showInLegend: true,
                showCheckbox: true
              },
              {
                name: `${m} Temp`,
                data: data.map(item => [getTimestamp(item.datetime), item.valueTemp || null]),
                color: colorMap.env[index],
                yAxis: 1,
                visible: true,
                showInLegend: true,
                showCheckbox: true
              },
              {
                name: `${m} Hum`,
                data: data.map(item => [getTimestamp(item.datetime), item.valueHum || null]),
                color: colorMap.env[index],
                yAxis: 2,
                visible: true,
                showInLegend: true,
                showCheckbox: true
              }
            );
          }
          if (type === 'soil' && ['1', '2', '3', '4'].includes(m)) {
            const soilIndex = parseInt(m) - 1;
            series.push(
              {
                name: `Soil ${m} Moist`,
                data: data.map(item => [getTimestamp(item.datetime), item.valueSM || null]),
                color: colorMap.soil[soilIndex],
                yAxis: 0,
                visible: true,
                showInLegend: true,
                showCheckbox: true
              },
              {
                name: `Soil ${m} Temp`,
                data: data.map(item => [getTimestamp(item.datetime), item.valueTemp || null]),
                color: colorMap.soil[soilIndex],
                yAxis: 1,
                visible: true,
                showInLegend: true,
                showCheckbox: true
              },
              {
                name: `Soil ${m} EC`,
                data: data.map(item => [getTimestamp(item.datetime), item.valueEC || null]),
                color: colorMap.soil[soilIndex],
                yAxis: 2,
                visible: true,
                showInLegend: true,
                showCheckbox: true
              }
            );
          }
        });
      } else if (
        (type === 'light' && ['ext', 'int'].includes(mode)) ||
        (type === 'env' && ['ext', 'int'].includes(mode)) ||
        (type === 'soil' && ['1', '2', '3', '4'].includes(mode))
      ) {
        const data = arr.find(s => s.mode === mode)?.data || [];
        const index = type === 'soil' ? parseInt(mode) - 1 : (mode === 'ext' ? 0 : 1);
        if (type === 'light') {
          series.push({
            name: `Lum ${mode}`,
            data: data.map(item => [getTimestamp(item.datetime), item.value || null]),
            color: colorMap.light[index],
            marker: { enabled: true },
            visible: true,
            showInLegend: true,
            showCheckbox: true
          });
        }
        if (type === 'env') {
          series.push(
            {
              name: 'CO2',
              data: data.map(item => [getTimestamp(item.datetime), item.valueCO2 || null]),
              color: colorMap.env[index],
              yAxis: 0,
              visible: true,
              showInLegend: true,
              showCheckbox: true
            },
            {
              name: 'Temp',
              data: data.map(item => [getTimestamp(item.datetime), item.valueTemp || null]),
              color: colorMap.env[index],
              yAxis: 1,
              visible: true,
              showInLegend: true,
              showCheckbox: true
            },
            {
              name: 'Hum',
              data: data.map(item => [getTimestamp(item.datetime), item.valueHum || null]),
              color: colorMap.env[index],
              yAxis: 2,
              visible: true,
              showInLegend: true,
              showCheckbox: true
            }
          );
        }
        if (type === 'soil') {
          series.push(
            {
              name: `Soil ${mode} Moist`,
              data: data.map(item => [getTimestamp(item.datetime), item.valueSM || null]),
              color: colorMap.soil[index],
              yAxis: 0,
              visible: true,
              showInLegend: true,
              showCheckbox: true
            },
            {
              name: `Soil ${mode} Temp`,
              data: data.map(item => [getTimestamp(item.datetime), item.valueTemp || null]),
              color: colorMap.soil[index],
              yAxis: 1,
              visible: true,
              showInLegend: true,
              showCheckbox: true
            },
            {
              name: `Soil ${mode} EC`,
              data: data.map(item => [getTimestamp(item.datetime), item.valueEC || null]),
              color: colorMap.soil[index],
              yAxis: 2,
              visible: true,
              showInLegend: true,
              showCheckbox: true
            }
          );
        }
      }

      return {
        ...baseOptions,
        chart: { ...baseOptions.chart, type: 'line' },
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
          { title: { text: 'Moisture (%)' }, min: 0 },
          { title: { text: 'Temp (°C)' }, opposite: true, min: 0 },
          { title: { text: 'EC (dS/m)' }, opposite: true, min: 0 }
        ] : [
          { title: { text: 'CO₂ (ppm)' }, min: 0 },
          { title: { text: 'Temp (°C)' }, opposite: true, min: 0 },
          { title: { text: 'Humidity (%RH)' }, opposite: true, min: 0 }
        ],
        tooltip: {
          xDateFormat: '%Y-%m-%d %H:%M:%S',
          shared: true
        },
        series
      };
    }

    if (period[type] === 'week') {
      categories = getWeekDates(offset);
      const datasets = mode === 'all' ? arr : arr.filter(s => s.mode === mode);
      datasets.forEach(({ mode: m, data }) => {
        const colorIndex = type === 'soil' ? parseInt(m) - 1 : (m === 'ext' ? 0 : 1);
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
            data: categories.map(date => valueMap[date] ?? null),
            color: colorMap.light[colorIndex],
            marker: { enabled: true },
            visible: true,
            showInLegend: true,
            showCheckbox: true
          });
        }
        if (type === 'env') {
          series.push(
            {
              name: `${m} CO2`,
              data: categories.map(date => (valueMap[date] ? valueMap[date].CO2 : null)),
              color: colorMap.env[colorIndex],
              yAxis: 0,
              marker: { enabled: true },
              visible: true,
              showInLegend: true,
              showCheckbox: true
            },
            {
              name: `${m} Temp`,
              data: categories.map(date => (valueMap[date] ? valueMap[date].Temp : null)),
              color: colorMap.env[colorIndex],
              yAxis: 1,
              marker: { enabled: true },
              visible: true,
              showInLegend: true,
              showCheckbox: true
            },
            {
              name: `${m} Hum`,
              data: categories.map(date => (valueMap[date] ? valueMap[date].Hum : null)),
              color: colorMap.env[colorIndex],
              yAxis: 2,
              marker: { enabled: true },
              visible: true,
              showInLegend: true,
              showCheckbox: true
            }
          );
        }
        if (type === 'soil' && ['1', '2', '3', '4'].includes(m)) {
          const soilIndex = parseInt(m) - 1;
          series.push(
            {
              name: `Soil ${m} Moist`,
              data: categories.map(date => (valueMap[date] ? valueMap[date].SM : null)),
              color: colorMap.soil[soilIndex],
              yAxis: 0,
              marker: { enabled: true },
              visible: true,
              showInLegend: true,
              showCheckbox: true
            },
            {
              name: `Soil ${m} Temp`,
              data: categories.map(date => (valueMap[date] ? valueMap[date].Temp : null)),
              color: colorMap.soil[soilIndex],
              yAxis: 1,
              marker: { enabled: true },
              visible: true,
              showInLegend: true,
              showCheckbox: true
            },
            {
              name: `Soil ${m} EC`,
              data: categories.map(date => (valueMap[date] ? valueMap[date].EC : null)),
              color: colorMap.soil[soilIndex],
              yAxis: 2,
              marker: { enabled: true },
              visible: true,
              showInLegend: true,
              showCheckbox: true
            }
          );
        }
      });

      return {
        ...baseOptions,
        chart: { ...baseOptions.chart, type: 'line' },
        xAxis: {
          categories,
          title: { text: 'Date', style: { fontSize: '14px' } },
          labels: { rotation: -45, style: { fontSize: '12px' }, y: 25, enabled: true }
        },
        yAxis: type === 'light' ? {
          title: { text: 'Luminosity (lux)' },
          min: 0
        } : type === 'soil' ? [
          { title: { text: 'Moisture (%)' }, min: 0 },
          { title: { text: 'Temp (°C)' }, opposite: true, min: 0 },
          { title: { text: 'EC (dS/m)' }, opposite: true, min: 0 }
        ] : [
          { title: { text: 'CO₂ (ppm)' }, min: 0 },
          { title: { text: 'Temp (°C)' }, opposite: true, min: 0 },
          { title: { text: 'Humidity (%RH)' }, opposite: true, min: 0 }
        ],
        series
      };
    }

    if (period[type] === 'month') {
      const datasets = mode === 'all' ? arr : arr.filter(s => s.mode === mode);
      const now = new Date();
      now.setMonth(now.getMonth() + offset);
      const year = now.getFullYear();
      const month = now.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const minDate = firstDay.getTime();
      const maxDate = lastDay.getTime();

      datasets.forEach(({ mode: m, data }, index) => {
        const colorIndex = type === 'soil' ? parseInt(m) - 1 : (m === 'ext' ? 0 : 1);
        if (type === 'light') {
          series.push({
            name: `Lum ${m}`,
            data: data.map(item => [getTimestamp(item.date), item.average_value || null]),
            color: colorMap.light[colorIndex],
            marker: { enabled: true },
            visible: true,
            showInLegend: true,
            showCheckbox: true
          });
        }
        if (type === 'env') {
          series.push(
            {
              name: `${m} CO2`,
              data: data.map(item => [getTimestamp(item.date), item.average_valueCO2 || null]),
              color: colorMap.env[colorIndex],
              yAxis: 0,
              marker: { enabled: true },
              visible: true,
              showInLegend: true,
              showCheckbox: true
            },
            {
              name: `${m} Temp`,
              data: data.map(item => [getTimestamp(item.date), item.average_valueTemp || null]),
              color: colorMap.env[colorIndex],
              yAxis: 1,
              marker: { enabled: true },
              visible: true,
              showInLegend: true,
              showCheckbox: true
            },
            {
              name: `${m} Hum`,
              data: data.map(item => [getTimestamp(item.date), item.average_valueHum || null]),
              color: colorMap.env[colorIndex],
              yAxis: 2,
              marker: { enabled: true },
              visible: true,
              showInLegend: true,
              showCheckbox: true
            }
          );
        }
        if (type === 'soil' && ['1', '2', '3', '4'].includes(m)) {
          const colorIndex = parseInt(m) - 1;
          series.push(
            {
              name: `Soil ${m} Moist`,
              data: data.map(item => [getTimestamp(item.date), item.average_valueSM || null]),
              color: colorMap.soil[colorIndex],
              yAxis: 0,
              marker: { enabled: true },
              visible: true,
              showInLegend: true,
              showCheckbox: true
            },
            {
              name: `Soil ${m} Temp`,
              data: data.map(item => [getTimestamp(item.date), item.average_valueTemp || null]),
              color: colorMap.soil[colorIndex],
              yAxis: 1,
              marker: { enabled: true },
              visible: true,
              showInLegend: true,
              showCheckbox: true
            },
            {
              name: `Soil ${m} EC`,
              data: data.map(item => [getTimestamp(item.date), item.average_valueEC || null]),
              color: colorMap.soil[colorIndex],
              yAxis: 2,
              marker: { enabled: true },
              visible: true,
              showInLegend: true,
              showCheckbox: true
            }
          );
        }
      });

      return {
        ...baseOptions,
        chart: { ...baseOptions.chart, type: 'line', zoomType: 'x' },
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
          { title: { text: 'Moisture (%)' }, min: 0 },
          { title: { text: 'Temp (°C)' }, opposite: true, min: 0 },
          { title: { text: 'EC (dS/m)' }, opposite: true, min: 0 }
        ] : [
          { title: { text: 'CO₂ (ppm)' }, min: 0 },
          { title: { text: 'Temp (°C)' }, opposite: true, min: 0 },
          { title: { text: 'Humidity (%RH)' }, opposite: true, min: 0 }
        ],
        tooltip: {
          xDateFormat: '%Y-%m-%d %H:%M:%S',
          shared: true
        },
        navigator: { enabled: true },
        rangeSelector: { enabled: false },
        series
      };
    }

    if (period[type] === 'day-average') {
      const datasets = mode === 'all' ? arr : arr.filter(s => s.mode === mode);
      datasets.forEach(({ mode: m, data }) => {
        const colorIndex = type === 'soil' ? parseInt(m) - 1 : (m === 'ext' ? 0 : 1);
        if (type === 'light') {
          series.push({
            name: `Lum ${m}`,
            data: data.map(item => item.average_value || item.value || 0),
            color: colorMap.light[colorIndex],
            visible: true,
            showInLegend: true,
            showCheckbox: true
          });
        }
        if (type === 'env') {
          series.push(
            {
              name: `${m} CO2`,
              data: data.map(item => item.average_valueCO2 || 0),
              color: colorMap.env[colorIndex],
              yAxis: 0,
              visible: true,
              showInLegend: true,
              showCheckbox: true
            },
            {
              name: `${m} Temp`,
              data: data.map(item => item.average_valueTemp || 0),
              color: colorMap.env[colorIndex],
              yAxis: 1,
              visible: true,
              showInLegend: true,
              showCheckbox: true
            },
            {
              name: `${m} Hum`,
              data: data.map(item => item.average_valueHum || 0),
              color: colorMap.env[colorIndex],
              yAxis: 2,
              visible: true,
              showInLegend: true,
              showCheckbox: true
            }
          );
        }
        if (type === 'soil' && ['1', '2', '3', '4'].includes(m)) {
          const soilIndex = parseInt(m) - 1;
          series.push(
            {
              name: `Soil ${m} Moist`,
              data: data.map(item => item.average_valueSM || 0),
              color: colorMap.soil[soilIndex],
              yAxis: 0,
              visible: true,
              showInLegend: true,
              showCheckbox: true
            },
            {
              name: `Soil ${m} Temp`,
              data: data.map(item => item.average_valueTemp || 0),
              color: colorMap.soil[soilIndex],
              yAxis: 1,
              visible: true,
              showInLegend: true,
              showCheckbox: true
            },
            {
              name: `Soil ${m} EC`,
              data: data.map(item => item.average_valueEC || 0),
              color: colorMap.soil[soilIndex],
              yAxis: 2,
              visible: true,
              showInLegend: true,
              showCheckbox: true
            }
          );
        }
        if (!categories.length && data?.length) {
          categories = data.map(item => `${String(item.hour).padStart(2, '0')}:00`);
        }
      });

      return {
        ...baseOptions,
        chart: { ...baseOptions.chart, type: 'column' },
        xAxis: {
          categories,
          title: { text: 'Hours', style: { fontSize: '14px' } },
          labels: { rotation: -45, style: { fontSize: '12px' }, y: 25, enabled: true }
        },
        yAxis: type === 'light' ? {
          title: { text: 'Luminosity (lux)' },
          min: 0
        } : type === 'soil' ? [
          { title: { text: 'Moisture (%)' }, min: 0 },
          { title: { text: 'Temp (°C)' }, opposite: true, min: 0 },
          { title: { text: 'EC (dS/m)' }, opposite: true, min: 0 }
        ] : [
          { title: { text: 'CO₂ (ppm)' }, min: 0 },
          { title: { text: 'Temp (°C)' }, opposite: true, min: 0 },
          { title: { text: 'Humidity (%RH)' }, opposite: true, min: 0 }
        ],
        series
      };
    }

    if (period[type] === 'pic-average') {
      const datasets = mode === 'all' ? arr : arr.filter(s => s.mode === mode);
      datasets.forEach(({ mode: m, data }) => {
        const colorIndex = type === 'soil' ? parseInt(m) - 1 : (m === 'ext' ? 0 : 1);
        if (type === 'light') {
          series.push({
            name: `Lum ${m}`,
            data: [data?.[0]?.max_day ?? null, data?.[0]?.max_night ?? null],
            color: colorMap.light[colorIndex],
            visible: true,
            showInLegend: true,
            showCheckbox: true
          });
        }
        if (type === 'env') {
          series.push(
            {
              name: `${m} CO2`,
              data: [data?.[0]?.max_day_CO2 ?? 0, data?.[0]?.max_night_CO2 ?? 0],
              color: colorMap.env[colorIndex],
              yAxis: 0,
              visible: true,
              showInLegend: true,
              showCheckbox: true
            },
            {
              name: `${m} Temp`,
              data: [data?.[0]?.max_day_Temp ?? 0, data?.[0]?.max_night_Temp ?? 0],
              color: colorMap.env[colorIndex],
              yAxis: 1,
              visible: true,
              showInLegend: true,
              showCheckbox: true
            },
            {
              name: `${m} Hum`,
              data: [data?.[0]?.max_day_Hum ?? 0, data?.[0]?.max_night_Hum ?? 0],
              color: colorMap.env[colorIndex],
              yAxis: 2,
              visible: true,
              showInLegend: true,
              showCheckbox: true
            }
          );
        }
        if (type === 'soil' && ['1', '2', '3', '4'].includes(m)) {
          const soilIndex = parseInt(m) - 1;
          series.push(
            {
              name: `Soil ${m} Moist`,
              data: [data?.[0]?.max_day_SM ?? 0, data?.[0]?.max_night_SM ?? 0],
              color: colorMap.soil[soilIndex],
              yAxis: 0,
              visible: true,
              showInLegend: true,
              showCheckbox: true
            },
            {
              name: `Soil ${m} Temp`,
              data: [data?.[0]?.max_day_Temp ?? 0, data?.[0]?.max_night_Temp ?? 0],
              color: colorMap.soil[soilIndex],
              yAxis: 1,
              visible: true,
              showInLegend: true,
              showCheckbox: true
            },
            {
              name: `Soil ${m} EC`,
              data: [data?.[0]?.max_day_EC ?? 0, data?.[0]?.max_night_EC ?? 0],
              color: colorMap.soil[soilIndex],
              yAxis: 2,
              visible: true,
              showInLegend: true,
              showCheckbox: true
            }
          );
        }
      });
      categories = ['Day', 'Night'];

      return {
        ...baseOptions,
        chart: { ...baseOptions.chart, type: 'column' },
        xAxis: {
          categories,
          title: { text: 'Period', style: { fontSize: '14px' } },
          labels: { rotation: 0, style: { fontSize: '12px' }, y: 25, enabled: true }
        },
        yAxis: type === 'light' ? {
          title: { text: 'Luminosity (lux)' },
          min: 0
        } : type === 'soil' ? [
          { title: { text: 'Moisture (%)' }, min: 0 },
          { title: { text: 'Temp (°C)' }, opposite: true, min: 0 },
          { title: { text: 'EC (dS/m)' }, opposite: true, min: 0 }
        ] : [
          { title: { text: 'CO₂ (ppm)' }, min: 0 },
          { title: { text: 'Temp (°C)' }, opposite: true, min: 0 },
          { title: { text: 'Humidity (%RH)' }, opposite: true, min: 0 }
        ],
        tooltip: { shared: false },
        series
      };
    }

    return {
      ...baseOptions,
      chart: { ...baseOptions.chart, type: 'line' },
      xAxis: { categories, title: { text: '' } },
      yAxis: { title: { text: '' } },
      series
    };
  };

  const formatValue = (value, field) => {
    if (value === undefined || value === null || isNaN(value) || (['valueSM', 'valueEC'].includes(field.key) && value === 0)) return '';
    return field.format ? field.format(value) : `${parseFloat(value).toFixed(2)} ${field.unit}`;
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
        const modesToFetch = type === 'soil' ? ['1', '2', '3', '4'] : ['ext', 'int'];
        console.log(`Exporting ${type}:`, { exportPeriod, exportOffset, modesToFetch });

        const data = await Promise.all(
          modesToFetch.map(async m => {
            let path = endpointMap[type][exportPeriod][m];
            if (exportPeriod === 'week' || exportPeriod === 'month') {
              path += `?offset=${exportOffset}`;
            }
            const url = `http://localhost:8080${path}`;
            console.log(`Fetching: ${url}`);
            const res = await fetch(url, { headers });
            if (!res.ok) {
              throw new Error(`HTTP error! Status: ${res.status}, URL: ${url}`);
            }
            const json = await res.json();
            console.log(`Response for ${type} mode ${m}:`, json);
            const data = Array.isArray(json) ? json : [json];
            return { mode: m, data };
          })
        );

        data.forEach(s => {
          if (exportPeriod === 'pic-average') {
            // For pic-average, create separate rows for Day and Night
            s.data.forEach(d => {
              exportDataArray.push(
                { type, mode: s.mode, period: 'Day', ...d },
                { type, mode: s.mode, period: 'Night', ...d }
              );
            });
          } else {
            exportDataArray = exportDataArray.concat(
              s.data.map(d => ({
                type,
                mode: s.mode,
                ...d
              }))
            );
          }
        });
      }

      if (exportDataArray.length === 0) {
        console.log('No data to export:', exportDataArray);
        alert("Aucune donnée à exporter");
        return;
      }

      if (exportFormat === 'csv') {
        const typeConfig = {
          light: {
            fields: [
              { key: 'value', unit: 'Lux', format: formatLux, label: mode => `${mode === 'ext' ? 'Ext' : 'Int'} Lum`, picKeys: ['max_day', 'max_night'] }
            ]
          },
          env: {
            fields: [
              { key: 'valueTemp', unit: '°C', label: mode => `${mode === 'ext' ? 'Ext' : 'Int'} Temp`, picKeys: ['max_day_Temp', 'max_night_Temp'] },
              { key: 'valueHum', unit: '%RH', label: mode => `${mode === 'ext' ? 'Ext' : 'Int'} Hum`, picKeys: ['max_day_Hum', 'max_night_Hum'] },
              { key: 'valueCO2', unit: 'ppm', label: mode => `${mode === 'ext' ? 'Ext' : 'Int'} CO₂`, picKeys: ['max_day_CO2', 'max_night_CO2'] }
            ]
          },
          soil: {
            fields: [
              { key: 'valueTemp', unit: '°C', label: mode => `Temp ${mode}`, picKeys: ['max_day_Temp', 'max_night_Temp'] },
              { key: 'valueSM', unit: '%', label: mode => `Moist ${mode}`, picKeys: ['max_day_SM', 'max_night_SM'] },
              { key: 'valueEC', unit: 'dS/m', label: mode => `EC ${mode}`, picKeys: ['max_day_EC', 'max_night_EC'] }
            ]
          }
        };

        const allFields = exportType === 'all' ? [
          ...typeConfig.light.fields.map(f => ({ ...f, type: 'light' })),
          ...typeConfig.env.fields.map(f => ({ ...f, type: 'env' })),
          ...typeConfig.soil.fields.map(f => ({ ...f, type: 'soil' }))
        ] : typeConfig[exportType].fields.map(f => ({ ...f, type: exportType }));

        const timeKey = exportPeriod === 'full-day' ? 'datetime' : exportPeriod === 'day-average' ? 'hour' : exportPeriod === 'pic-average' ? 'period' : 'date';
        const keys = ['type', 'mode', timeKey];
        const keyMap = {
          'full-day': field => field.key,
          'day-average': field => `average_${field.key}`,
          'week': field => `average_${field.key}`,
          'month': field => `average_${field.key}`,
          'pic-average': field => field.picKeys
        };

        allFields.forEach(field => {
          if (exportPeriod === 'pic-average') {
            keyMap[exportPeriod](field).forEach(k => keys.push(k));
          } else {
            keys.push(keyMap[exportPeriod](field));
          }
        });

        const csvRows = [
          keys.map(k => {
            if (k === 'type') return 'Type';
            if (k === 'mode') return 'Mode';
            if (k === 'datetime' || k === 'date') return 'Timestamp';
            if (k === 'hour') return 'Hour';
            if (k === 'period') return 'Period';
            let fieldKey = k;
            let prefix = '';
            if (k.startsWith('max_day_')) {
              fieldKey = k.replace('max_day_', '');
              prefix = 'Day ';
            } else if (k.startsWith('max_night_')) {
              fieldKey = k.replace('max_night_', '');
              prefix = 'Night ';
            } else if (k === 'max_day' && fieldKey === 'max_day') {
              fieldKey = 'value';
              prefix = 'Day ';
            } else if (k === 'max_night' && fieldKey === 'max_night') {
              fieldKey = 'value';
              prefix = 'Night ';
            } else if (k.startsWith('average_')) {
              fieldKey = k.replace('average_', '');
              prefix = '';
            }
            const field = allFields.find(f => f.key === fieldKey || f.picKeys?.includes(k));
            return field ? `${prefix}${field.label(field.type === 'soil' ? '1' : field.type === 'light' ? 'ext' : 'ext')}` : k;
          }).join(','),
          ...exportDataArray.map(row => {
            // Filter keys to include only those relevant to the row's type
            const relevantKeys = keys.filter(k => {
              if (['type', 'mode', timeKey].includes(k)) return true;
              const field = allFields.find(f => (exportPeriod === 'pic-average' ? f.picKeys?.includes(k) : k.includes(f.key)) && f.type === row.type);
              return !!field;
            });

            const rowKeys = relevantKeys.map(k => {
              if (k === 'type') return row.type || '';
              if (k === 'mode') return row.mode || '';
              if (k === timeKey) return row[timeKey] || '';
              const field = allFields.find(f => (exportPeriod === 'pic-average' ? f.picKeys?.includes(k) : k.includes(f.key)) && f.type === row.type);
              if (!field) return '';
              if (exportPeriod === 'pic-average') {
                // For pic-average, only include value if period matches key
                if (row.period === 'Day' && (k.startsWith('max_night_') || k === 'max_night')) return '';
                if (row.period === 'Night' && (k.startsWith('max_day_') || k === 'max_day')) return '';
              }
              const rawValue = row[k];
              return formatValue(rawValue, field);
            });
            return rowKeys.join(',');
          })
        ].filter(row => row.split(',').some((val, idx) => idx > 2 && val !== '')); // Remove rows with no data beyond type/mode/period

        const csvContent = '\uFEFF' + csvRows.join('\n'); // Add UTF-8 BOM
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export_${exportType}_${exportPeriod}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (exportFormat === 'json') {
        const jsonContent = JSON.stringify(exportDataArray, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export_${exportType}_${exportPeriod}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      setIsExportModalOpen(false);
    } catch (err) {
      console.error('Export error:', err.message, err.stack);
      alert('Failed to export data. Please try again.');
    }
  };

    const ExportModal = () => (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">Export Data</h2>
        <div className="modal-field">
          <label>Data Type</label>
          <select
            value={exportType}
            onChange={(e) => setExportType(e.target.value)}
            className="modal-select"
          >
            <option value="all">All</option>
            <option value="light">Light</option>
            <option value="env">Environment</option>
            <option value="soil">Soil</option>
          </select>
        </div>
        <div className="modal-field">
          <label>Period</label>
          <select
            value={exportPeriod}
            onChange={(e) => {
              setExportPeriod(e.target.value);
              setExportOffset(0); // Reset offset when period changes
            }}
            className="modal-select"
          >
            {PERIODS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {(exportPeriod === "week" || exportPeriod === "month") && (
          <div className="modal-field">
            <label>{exportPeriod === "week" ? "Week" : "Month"}</label>
            <div className="offset-controls">
              <button
                className="week-btn"
                onClick={() => setExportOffset((prev) => prev - 1)}
              >
                {"<"}
              </button>
              <span className="week-label">
                {exportPeriod === "week"
                  ? getWeekLabel(exportOffset)
                  : getMonthLabel(exportOffset)}
              </span>
              <button
                className="week-btn"
                onClick={() => setExportOffset((prev) => prev + 1)}
                disabled={exportOffset >= 0}
              >
                {">"}
              </button>
            </div>
          </div>
        )}
        <div className="modal-field">
          <label>Format</label>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="modal-select"
          >
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
        </div>
        <div className="modal-actions">
          <button className="button-effect modal-button" onClick={exportData}>
            Export
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </button>
          <button
            className="button-effect modal-button cancel-button"
            onClick={() => setIsExportModalOpen(false)}
          >
            Cancel
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </div>
  );

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
          <div className="hover-title-container">
            <span className="hover-title-text" data-text="Greenhouse MTU">Greenhouse MTU</span>
          </div>
          <ul className="nav-buttons">
            <li style={{ '--i': '#609966', '--j': '#40513B' }} onClick={() => navigate('/home')}>
              <span className="icon"><ion-icon name="home-outline"></ion-icon></span>
              <span className="title">Home</span>
            </li>
            <li style={{ '--i': '#609966', '--j': '#40513B' }} onClick={() => {
              localStorage.removeItem('access_token');
              navigate('/login', { state: { mode: 'login' } });
            }}>
              <span className="icon"><ion-icon name="log-out-outline"></ion-icon></span>
              <span className="title">Disconnect</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="filters-container">
        <div className="mode-selector">
          <RefreshButton />
          <DataSelector />
        </div>
        <div className="export-controls">
          <button className="button-effect" onClick={exportData}>
            Export
            <span></span><span></span><span></span><span></span>
          </button>
        </div>
      </div>
      {isExportModalOpen && <ExportModal />}
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
            <SensorStatusWidget type="light" sensors={sensors} mode={mode} period={period} />
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
            <SensorStatusWidget type="env" sensors={sensors} mode={mode} period={period} />
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
            <SensorStatusWidget type="soil" sensors={sensors} mode={mode} period={period} />
            <div className="section-divider"></div>
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;