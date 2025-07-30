import React, { useRef } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

function HighchartsSection({
  type,
  period,
  mode,
  weekOffset,
  monthOffset,
  getChartOptions,
  getLastValueBlock,
  handlePeriodChange,
  handleOffsetChange,
  PeriodSelector,
  PeriodNav,
  getWeekLabel,
  getMonthLabel
}) {
  const chartRef = useRef(null);

  // Selection the offset according to the period
  const offset = period[type] === 'week'
    ? weekOffset[type]
    : period[type] === 'month'
      ? monthOffset[type]
      : 0;

  return (
    <div className="section-container">
      <div className="section-values">
        <div className="section-title">
          {type === 'light' ? 'Luminosity' : type === 'env' ? 'Environment' : 'Soil'}
        </div>
        {getLastValueBlock(type, offset)}
      </div>
      <div className="section-chart">
        <div className="chart-controls">
          <div>
            <PeriodSelector
              value={period[type]}
              onChange={v => handlePeriodChange(type, v)}
            />
          </div>
          {(period[type] === 'week' || period[type] === 'month') && (
            <PeriodNav
              periodType={period[type]}
              offset={offset}
              setOffset={newOffset => handleOffsetChange(type, period[type], newOffset)}
              label={
                period[type] === 'week'
                  ? getWeekLabel(offset)
                  : getMonthLabel(offset)
              }
            />
          )}
        </div>
        <div className="chart-title" style={{ fontWeight: 700, fontSize: 20, color: '#40513B', marginBottom: 12 }}>
          {getChartTitle(period[type])}
        </div>
        <HighchartsReact
          highcharts={Highcharts}
          options={getChartOptions(type, offset)}
          ref={chartRef}
        />
      </div>
    </div>
  );
}

function getChartTitle(period) {
  switch (period) {
    case 'full-day':
      return 'All the values of the current day';
    case 'day-average':
      return 'Average by hour of the current day';
    case 'week':
      return 'Average per day of the values for a full week';
    case 'month':
      return '6 averaged values per day for a month';
    case 'pic-average':
      return 'Day/Night Average Values';
    default:
      return '';
  }
}

export default HighchartsSection;