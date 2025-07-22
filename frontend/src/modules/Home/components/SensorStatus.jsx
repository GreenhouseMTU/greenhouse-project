import React, { useMemo } from 'react';

export default function SensorStatus({ sensors }) {
  // 1) Group all devices (ext/int for light & env, 1–4 for soil)
  const allDevices = useMemo(
    () => [
      ...sensors.light,
      ...sensors.env,
      ...sensors.soil,
    ],
    [sensors]
  );

  // 2) Determine if a device is online: last timestamp < 15 min
  const isOnline = (device) => {
    const arr = device.data;
    if (!Array.isArray(arr) || arr.length === 0) return false;
    const lastTs = new Date(arr[arr.length - 1].datetime).getTime();
    return lastTs >= Date.now() - 15 * 60 * 1000;
  };

  // 3) Calculate counts
  const total = allDevices.length;
  const online = allDevices.filter(isOnline).length;
  const offline = total - online;

  return (
    <div className="sensor-card h-full bg-gray-100 rounded-2xl p-6 flex flex-col justify-between relative">
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-xl font-semibold text-black">{total} Sensors</h2>
        <img src="sensor.png" alt="Sensor Icon" className="w-8 h-8 absolute top-6 right-6" />
      </div>
      <div className="flex flex-col gap-4 flex-1 justify-center">
        {/* Online */}
        <div className="flex items-center">
          <span className="text-4xl font-bold text-black mr-2">{online}</span>
          <span className="text-sm text-gray-600">Online</span>
        </div>
        {/* Offline */}
        <div className="flex items-center">
          <span className="text-4xl font-bold text-black mr-2">{offline}</span>
          <span className="text-sm text-gray-600">Offline</span>
        </div>
      </div>
    </div>
  );
}