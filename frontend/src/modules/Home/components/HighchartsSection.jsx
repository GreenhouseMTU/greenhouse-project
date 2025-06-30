import React from 'react';
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
  // Sélectionne l'offset selon la période
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
        {getLastValueBlock(type)}
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
        <HighchartsReact
          highcharts={Highcharts}
          options={getChartOptions(
            type,
            offset
          )}
        />
      </div>
    </div>
  );
}

export default HighchartsSection;