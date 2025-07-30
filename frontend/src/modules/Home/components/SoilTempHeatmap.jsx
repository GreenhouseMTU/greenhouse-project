import React, { useEffect, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import 'highcharts/modules/heatmap';

const sensors = [
  { name: 'Soil 1', url: '/api/sensors/sensor_smtempec_1/latest' },
  { name: 'Soil 2', url: '/api/sensors/sensor_smtempec_2/latest' },
  { name: 'Soil 3', url: '/api/sensors/sensor_smtempec_3/latest' },
  { name: 'Soil 4', url: '/api/sensors/sensor_smtempec_4/latest' }
];

function getSoilInsights(temps) {
  if (!temps || temps.some(t => t === null)) return ['Loading soil data...'];
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const insights = [];

  if (temps.every(t => t < 15)) {
    insights.push('❄️ Soil too cold. Consider heating or covering.');
  }
  if (temps.every(t => t > 25)) {
    insights.push('☀️ Soil is warm. Check irrigation needs.');
  }
  const threshold = 2; // seuil de différence en °C
  temps.forEach((t, i) => {
    // Moyenne des autres capteurs
    const others = temps.filter((_, j) => j !== i);
    const avgOthers = others.reduce((a, b) => a + b, 0) / others.length;
    if (Math.abs(t - avgOthers) > threshold) {
      insights.push(`⚠️ Local anomaly: ${sensors[i].name} differs by more than ${threshold}°C from others.`);
    }
  });
  if (max - min > 5) {
    insights.push('🧭 Temperature imbalance. Rotate crops or redistribute heat.');
  }
  if (temps.every(t => t >= 18 && t <= 22)) {
    insights.push('✅ Optimal soil temperature for growth.');
  }
  if (insights.length === 0) {
    insights.push('🪴 Soil temperatures are within normal range.');
  }
  return insights;
}

export default function SoilTempHeatmap({ showInsights = false }) {
  const [temps, setTemps] = useState([null, null, null, null]);

  useEffect(() => {
    const fetchTemps = async () => {
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };
      const results = await Promise.all(
        sensors.map(async (s) => {
          try {
            const res = await fetch(`http://localhost:8080${s.url}`, { headers });
            const json = await res.json();
            return json.valueTemp !== undefined ? parseFloat(json.valueTemp) : null;
          } catch {
            return null;
          }
        })
      );
      setTemps(results);
    };
    fetchTemps();
    const interval = setInterval(fetchTemps, 10000);
    return () => clearInterval(interval);
  }, []);

  const data = temps.map((t, i) => [0, i, t !== null ? t : null]);

  const options = {
    chart: {
      type: 'heatmap',
      marginTop: 40,
      marginBottom: 40,
      plotBorderWidth: 2,
      height: 400,
      backgroundColor: '#fff',
    },
    title: {
      text: 'Soil Temperature (°C)',
      style: { fontSize: '1.25em', fontWeight: 'bold' } 

    },
    xAxis: {
      categories: ['Soil Sensors'],
      visible: false
    },
    yAxis: {
      categories: sensors.map(s => s.name),
      title: null,
      reversed: true,
      labels: {
        style: { fontWeight: 'bold', fontSize: '1em' }
      }
    },
    colorAxis: {
      min: 0,
      max: 40,
      minColor: '#00BFFF',
      maxColor: '#ff5900ff'
    },
    legend: {
      align: 'right',
      layout: 'vertical',
      margin: 0,
      verticalAlign: 'top',
      y: 20,
      symbolHeight: 320
    },
    tooltip: {
      formatter: function () {
        return `<b>${sensors[this.point.y].name}</b><br/>Temperature: <b>${this.point.value}°C</b>`;
      }
    },
    series: [{
      name: 'Soil Temperature',
      borderWidth: 1,
      borderColor: '#fff',
      data: data,
      dataLabels: {
        enabled: true,
        color: 'contrast',
        style: { fontSize: '1.25em', fontWeight: 'bold' }, 
        format: '{point.value:.1f}°C'
      }
    }],
    credits: { enabled: false },
    responsive: {
      rules: [{
        condition: { maxWidth: 500 },
        chartOptions: {
          yAxis: {
            labels: { format: '{substr value 0 6}' }
          }
        }
      }]
    }
  };

  return (
    <div className="w-full">
      <HighchartsReact highcharts={Highcharts} options={options} />
      {showInsights && (
        <ul className="mt-4 list-disc list-inside text-gray-700 text-sm">
          {getSoilInsights(temps).map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { getSoilInsights };