import React, { useEffect, useState } from 'react';
import Highcharts from 'highcharts';
import 'highcharts/highcharts-more';
import 'highcharts/modules/solid-gauge';
import HighchartsReact from 'highcharts-react-official';

// Font
Highcharts.setOptions({
  chart: {
    style: {
      fontFamily: `"League Spartan", sans-serif`,
      color: '#151515'
    }
  }
});

// Icônes centrées sur le graphique
function renderIcons() {
  const chart = this;
  const iconSize = 30;
  const offsetX = 10;
  const offsetY = 10;

  chart.series.forEach(series => {
    const point = series.points[0];
    if (!point || !point.graphic) return;

    const bbox = point.graphic.element.getBBox();
    const x = bbox.x + (bbox.width - iconSize) / 2 + offsetX;
    const y = bbox.y + (bbox.height - iconSize) / 2 + offsetY;

    if (!series.iconEl) {
      series.iconEl = chart.renderer
        .image(
          series.options.custom.iconUrl,
          x, y,
          iconSize, iconSize
        )
        .attr({ zIndex: 5 })
        .css({ filter: 'brightness(0) invert(1)' }) // <-- Applique un filtre CSS pour rendre l'icône blanche
        .add(chart.seriesGroup);
    } else {
      series.iconEl.attr({ x, y });
    }
  });
}

const soilLatestEndpoints = {
  1: '/api/sensors/sensor_smtempec_1/latest',
  2: '/api/sensors/sensor_smtempec_2/latest',
  3: '/api/sensors/sensor_smtempec_3/latest',
  4: '/api/sensors/sensor_smtempec_4/latest',
};
const soilNames = {
  1: 'Soil 1',
  2: 'Soil 2',
  3: 'Soil 3',
  4: 'Soil 4',
};

function getColor(val) {
  if (val == null) return '#bbbbbb';
  if (val < 15) return '#ea1515ff';
  if (val < 30) return '#DDDF0D';
  return '#55BF3B';
}

const gaugeBaseOptions = {
  chart: {
    type: 'solidgauge',
    height: '100%', // Augmenté de 65% à 80% pour une taille plus grande
    events: { render: renderIcons }
  },
  title: null,
  tooltip: {
    backgroundColor: 'none',
    fixed: false, 
    pointFormat:
      '{series.name}<br>' +
      '<span style="font-size:2em; color:{point.color}; font-weight:bold">{point.y}</span>',
    positioner: function (labelWidth, labelHeight, point) {
      const chart = this.chart;
      const plotLeft = chart.plotLeft;
      const plotTop = chart.plotTop;
      const plotWidth = chart.plotWidth;
      const plotHeight = chart.plotHeight;

      // Positionner le tooltip près du pointeur de la souris, avec ajustement pour rester dans les limites
      let x = Math.max(plotLeft, Math.min(point.plotX + plotLeft - labelWidth / 2, plotLeft + plotWidth - labelWidth));
      let y = Math.max(plotTop, Math.min(point.plotY + plotTop - labelHeight - 10, plotTop + plotHeight - labelHeight));

      return { x, y };
    },
    style: { fontSize: '0.95em', textAlign: 'center', boxShadow: 'none' }
  },
  pane: {
    center: ['50%', '38%'],
    startAngle: 0,
    endAngle: 360,
    background: [
      {
        outerRadius: '87%',
        innerRadius: '63%',
        backgroundColor: Highcharts.getOptions()
          .colors.map(c => `color-mix(in srgb, ${c} 30%, transparent)`)[0],
        borderWidth: 0
      },
      {
        outerRadius: '62%',
        innerRadius: '38%',
        backgroundColor: Highcharts.getOptions()
          .colors.map(c => `color-mix(in srgb, ${c} 30%, transparent)`)[1],
        borderWidth: 0
      }
    ]
  },
  yAxis: { min: 0, max: 100, lineWidth: 0, tickPositions: [] },
  plotOptions: {
    solidgauge: {
      dataLabels: { enabled: false },
      linecap: 'round',
      stickyTracking: false,
      rounded: true
    }
  }
};

// PETITE BOX D'ALERTE A GAUCHE DU GRAPHE
function getAlertBox(valueSM, valueEC) {
  if (valueSM == null || valueEC == null) return null;

  let alertStyle = '';
  let alertText = '';
  if (valueSM < 20 && valueEC < 0.5) {
    alertStyle = "bg-red-100 border border-red-400 text-red-700";
    alertText = "🌵💧 Soil too dry and low conductivity: remember to water and add nutrients!";
  } else if (valueSM > 60 && valueEC > 1.5) {
    alertStyle = "bg-yellow-100 border border-yellow-400 text-yellow-700";
    alertText = "🌧️🧂 Soil too wet and high conductivity: risk of waterlogging, reduce watering!";
  } else {
    alertStyle = "bg-green-100 border border-green-400 text-green-700";
    alertText = "🌱✅ Soil OK! Parameters correct.";
  }

  return (
    <div className={`w-72 p-3 rounded shadow-sm mr-2 text-sm whitespace-pre-line ${alertStyle}`}>
      {alertText}
    </div>
  );
}

export default function SMGauges() {
  const [selectedSensor, setSelectedSensor] = useState(1);
  const [soilData, setSoilData] = useState({
    1: { valueSM: null, valueEC: null },
    2: { valueSM: null, valueEC: null },
    3: { valueSM: null, valueEC: null },
    4: { valueSM: null, valueEC: null }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSoil() {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      const promises = Object.keys(soilLatestEndpoints).map(async id => {
        const res = await fetch('http://localhost:8080' + soilLatestEndpoints[id], { headers });
        const json = await res.json();
        return { id, valueSM: json.valueSM ?? null, valueEC: json.valueEC ?? null };
      });
      const datas = await Promise.all(promises);
      const obj = {};
      datas.forEach(({ id, valueSM, valueEC }) => {
        obj[id] = { valueSM, valueEC };
      });
      setSoilData(obj);
      setLoading(false);
    }
    fetchSoil();
  }, []);

  if (loading) return <div>Chargement…</div>;

  return (
    <div className="w-full h-full">
      <div className="sensor-selector flex mb-4">
        {Object.entries(soilNames).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setSelectedSensor(Number(id))}
            className={`px-3 py-1 mr-2 rounded ${
              selectedSensor === Number(id)
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Layout FLEX : BOX alerte à gauche, jauge à droite */}
      {[selectedSensor].map(id => {
        const { valueSM, valueEC } = soilData[id];
        const soilColor = getColor(valueSM);
        const ecColor = getColor(valueEC);

        const options = {
          ...gaugeBaseOptions,
          chart: { ...gaugeBaseOptions.chart, height: '80%', backgroundColor: 'none' },
          credits: { enabled: false },
          tooltip: { ...gaugeBaseOptions.tooltip, useHTML: true, borderWidth: 0, backgroundColor: 'transparent', shadow: false,  
            style: { fontSize: '0.95em', textAlign: 'center', boxShadow: 'none' },
            positioner(labelW, labelH) {
              const ch = this.chart;
              return { x: ch.plotLeft + ch.plotWidth/2 - labelW/2, y: ch.plotTop + ch.plotHeight/2 - labelH/2 - 50 };
            },
            formatter() {
              const y = this.point.y;
              const unit = this.series.name === 'Soil Moisture' ? '%' : ' dS/m';
              return `<div style="text-align:center;">
                <span style="font-size:0.85em;">${this.series.name} ${id}</span><br/>
                <span style="font-size:1.1em;color:${this.color};font-weight:bold;">${y.toFixed( this.series.name==='Soil Moisture'?1:2 )}${unit}</span>
              </div>`;
            }
          },
          series: [
            {
              name: 'Soil Moisture',
              data: [{ color: soilColor, radius: '87%', innerRadius: '63%', y: valueSM ?? 0 }],
              custom: { iconUrl: '/moisture.png', iconColor: soilColor }
            },
            {
              name: 'Conductivity',
              data: [{ color: ecColor, radius: '62%', innerRadius: '38%', y: valueEC != null ? valueEC * 50 : 0 }],
              custom: { iconUrl: '/conductivity.png', iconColor: ecColor }
            }
          ]
        };

        return (
          <div key={id} className="w-full h-full flex items-center">
            <div className="p-2 flex items-center justify-center" style={{ width: '220px', transform: 'translate(20px, -20px)' }}>
              {getAlertBox(valueSM, valueEC)}
            </div>
            <div className="w-4/5 h-4/5">
              <HighchartsReact highcharts={Highcharts} options={options}
                containerProps={{ style: { height: '100%', width: '100%' } }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}