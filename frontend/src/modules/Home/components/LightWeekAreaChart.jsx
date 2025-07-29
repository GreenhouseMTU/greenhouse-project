import React, { useEffect, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { MapContainer, TileLayer, Marker, Popup, Rectangle } from 'react-leaflet';

const center = [51.8856, -8.5360];
const delta = 0.00010;
const greenhouseBounds = [
  [center[0] + delta, center[1] - delta],
  [center[0] - delta, center[1] + delta],
];

function getInsight(extData, intData) {
  // Filtrer pour ne garder que les jours où il y a des vraies valeurs (≠ 0)
  const validExt = extData.filter(v => v && v > 0);
  const validInt = intData.filter(v => v && v > 0);

  if (!validExt.length || !validInt.length) {
    return (
      <>
        <span className="font-semibold text-red-600">No data available for analysis.</span>
      </>
    );
  }
  const avgExt = validExt.reduce((a, b) => a + b, 0) / validExt.length;
  const avgInt = validInt.reduce((a, b) => a + b, 0) / validInt.length;
  const ratio = avgExt > 0 ? avgInt / avgExt : 0;
  const ratioPercent = Math.round(ratio * 100);

  // Qualité du ratio
  const lightStatus = ratioPercent > 70 ? 'High'
                    : ratioPercent > 50 ? 'Medium'
                    : 'Low';

  let status = "";
  let advice = "";

  // Cas spécial : extérieur faible mais intérieur bon
  if (avgExt < 2000 && avgInt > 7000) {
    status = "💡 Good greenhouse performance despite cloudy weather.";
    advice = "Your greenhouse maintains good light for plants even with low outdoor light.";
  } else if (avgExt < 2000) {
    status = "🌥️ Cloudy weather this week.";
    advice = "Check if your plants need more light.";
  } else if (ratio < 0.4) {
    status = "🌫️ Low light transmission.";
    advice = "Risk of slowed growth. Consider cleaning greenhouse windows or adjusting shade.";
  } else if (avgInt > 10000) {
    status = "🌞 Good light in the greenhouse.";
    advice = "All clear.";
  } else {
    status = "⚠️ Moderate light conditions.";
    advice = "Monitor your plants, supplemental lighting may be needed.";
  }

  return (
    <div>
      <div className="mb-1">
        <span className="font-semibold">Average outdoor light:</span> {Math.round(avgExt)} Lux<br />
        <span className="font-semibold">Average indoor light:</span> {Math.round(avgInt)} Lux<br />
        <span className="font-semibold">Transmission:</span> {ratioPercent}% <span className="italic text-xs">({lightStatus})</span>
      </div>
      <div className="mt-2">
        <span>{status}</span>
        <br />
        <span>{advice}</span>
      </div>
    </div>
  );
}

export default function LightWeekAreaChart() {
  const [categories, setCategories] = useState([]);
  const [extData, setExtData] = useState([]);
  const [intData, setIntData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };
      const [extRes, intRes] = await Promise.all([
        fetch('http://localhost:8080/api/sensors/sensor_light_ext/week', { headers }),
        fetch('http://localhost:8080/api/sensors/sensor_light_int/week', { headers }),
      ]);
      const extJson = await extRes.json();
      const intJson = await intRes.json();

      const cats = extJson.map(d => d.date);
      setCategories(cats);
      setExtData(extJson.map(d => d.average_value));
      setIntData(intJson.map(d => d.average_value));
      setLoading(false);
    }
    fetchData();
  }, []);

  const options = {
    chart: { type: 'area', height: 390, backgroundColor: 'transparent' },
    title: { text: 'Indoor vs Outdoor Light (Current Week)', style: { fontSize: '18px' } },
    legend: {
      enabled: true,
      floating: true,
      layout: 'horizontal',
      align: 'right',         // ou 'left' pour l'autre côté
      verticalAlign: 'top',
      x: -10,                 // ajuste la position horizontale      
      itemStyle: { fontWeight: '500', fontSize: '15px' }
    },
    xAxis: {
      categories,
      type: 'datetime',
      labels: {
        formatter: function () {
          const date = new Date(this.value);
          return date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: '2-digit' });
        },
        style: { fontSize: '13px' }
      },
      tickmarkPlacement: 'on',
      title: { text: 'Day' }
    },
    yAxis: {
      title: { text: 'Light (Lux)' },
      min: 0
    },
    tooltip: {
      shared: true,
      valueSuffix: ' Lux'
    },
    plotOptions: {
      area: {
        stacking: 'normal',
        marker: { enabled: false }
      }
    },
    series: [
      {
        name: 'Outdoor',
        data: extData,
        color: '#ebee08ff',
        fillOpacity: 0.3
      },
      {
        name: 'Indoor',
        data: intData,
        color: '#FFD600',
        fillOpacity: 0.5
      }
    ],
    credits: { enabled: false }
  };

    return (
    <div className="flex flex-col md:flex-row items-stretch gap-6 h-full w-full">
    {/* Graphe avec largeur fixe */}
    <div className="w-[70%] bg-white rounded-xl p-2 flex items-center justify-center h-full min-w-0">
        {loading ? (
        <div className="text-gray-500 text-center w-full">Loading chart...</div>
        ) : (
        <div style={{ width: '100%', minWidth: 0, maxWidth: '100%' }}>
            <HighchartsReact
            highcharts={Highcharts}
            options={options}
            containerProps={{ style: { width: '100%', minWidth: 0, height: '100%' } }}
            />
        </div>
        )}
    </div>

    {/* Carte à droite, plus grande */}
    <div className="w-[34%] h-full">
        <MapContainer
        center={center}
        zoom={30}
        scrollWheelZoom={false}
        style={{ width: '100%', height: '100%', borderRadius: '0.75rem' }}
        className="rounded-xl h-full w-full"
        attributionControl={false}
        >
        <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution=""
        />
        <Marker position={center}>
            <Popup>Greenhouse MTU</Popup>
        </Marker>
        <Rectangle bounds={greenhouseBounds} pathOptions={{ color: '#ff0800ff', weight: 1 }} />
        </MapContainer>
    </div>
    </div>
    );

}

export { getInsight };