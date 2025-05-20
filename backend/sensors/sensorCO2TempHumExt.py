from flask import Blueprint, request, jsonify, current_app
import datetime
from flask_jwt_extended import jwt_required
from models import Sensor_CO2TempHum_ext

sensor_co2temphum_ext_app = Blueprint('sensor_co2temphum_ext_app', __name__)

current_date = datetime.date.today()

#This endpoint is used to get the latest values
@sensor_co2temphum_ext_app.route('/api/sensors/sensor_co2temphum_ext/latest', methods=['GET'])
@jwt_required()
def get_sensorCO2TempHumExt():
    db = current_app.db
    sensorCO2TempHumExtLatestValue = db.session.query(Sensor_CO2TempHum_ext).order_by(Sensor_CO2TempHum_ext.id.desc()).first()
    if sensorCO2TempHumExtLatestValue is not None:
        serialized_data = sensorCO2TempHumExtLatestValue.serialize()
        del serialized_data['id']
        return jsonify(serialized_data)
    else:
        return jsonify({'message': 'No data available'}), 404

# This endpoint is used to get an average by hour of the current day
@sensor_co2temphum_ext_app.route('/api/sensors/sensor_co2temphum_ext/day/average', methods=['GET'])
@jwt_required()
def get_sensorCO2TempHumExtDayAverage():
    db = current_app.db
    current_date = datetime.datetime.now()
    formatted_date = current_date.strftime('%Y-%m-%d')
    sensorCO2TempHumExtDayAverageValues = db.session.query(Sensor_CO2TempHum_ext).filter(Sensor_CO2TempHum_ext.datetime.like(f'%{formatted_date}%')).all()

    hourly_avg_values = {}
    for entry in sensorCO2TempHumExtDayAverageValues:
        time = entry.datetime.hour
        valueCO2 = int(entry.valueCO2)
        valueTemp = int(entry.valueTemp)
        valueHum = int(entry.valueHum)
        if time in hourly_avg_values:
            hourly_avg_values[time]['valuesCO2'].append(valueCO2)
            hourly_avg_values[time]['valuesTemp'].append(valueTemp)
            hourly_avg_values[time]['valuesHum'].append(valueHum)
        else:
            hourly_avg_values[time] = {
                'valuesCO2': [valueCO2],
                'valuesTemp': [valueTemp],
                'valuesHum': [valueHum]
            }

    results = []
    for time, data in hourly_avg_values.items():
        avg_valueCO2 = sum(data['valuesCO2']) / len(data['valuesCO2'])
        avg_valueTemp = sum(data['valuesTemp']) / len(data['valuesTemp'])
        avg_valueHum = sum(data['valuesHum']) / len(data['valuesHum'])
        
        avg_valueCO2_rounded = round(avg_valueCO2, 2)
        avg_valueTemp_rounded = round(avg_valueTemp, 2)
        avg_valueHum_rounded = round(avg_valueHum, 2)
        
        results.append({
            'hour': time,
            'average_valueCO2': avg_valueCO2_rounded,
            'average_valueTemp': avg_valueTemp_rounded,
            'average_valueHum': avg_valueHum_rounded
        })

    return jsonify(results)

# This endpoint is used to get all the values of the current day
@sensor_co2temphum_ext_app.route('/api/sensors/sensor_co2temphum_ext/day', methods=['GET'])
@jwt_required()
def get_sensorCO2TempHumExtDay():
    db = current_app.db
    formatted_date = current_date.strftime('%Y-%m-%d')
    sensors = db.session.query(Sensor_CO2TempHum_ext).filter(Sensor_CO2TempHum_ext.datetime.like(f'%{formatted_date}%')).all()
    return jsonify([sensor.serialize() for sensor in sensors])

# This endpoint is used to get an average by hour of the values for a week
@sensor_co2temphum_ext_app.route('/api/sensors/sensor_co2temphum_ext/week', methods=['GET'])
@jwt_required()
def get_sensorCO2TempHumExtWeek():
    db = current_app.db
    current_date = datetime.datetime.now()
    start_date_week = current_date - datetime.timedelta(days=7)
    end_date_week = current_date

    sensorCO2TempHumExtWeekValues = db.session.query(Sensor_CO2TempHum_ext).filter(
        Sensor_CO2TempHum_ext.datetime >= start_date_week.strftime('%Y-%m-%d %H:%M:%S'),
        Sensor_CO2TempHum_ext.datetime <= end_date_week.strftime('%Y-%m-%d %H:%M:%S')
    ).all()

    hourly_avg_values = {}
    for entry in sensorCO2TempHumExtWeekValues:
        date = entry.datetime.strftime('%Y-%m-%d %H')  # Obtenir la date et l'heure au format 'YYYY-MM-DD HH'
        valueCO2 = int(entry.valueCO2)
        valueTemp = int(entry.valueTemp)
        valueHum = int(entry.valueHum)
        if date in hourly_avg_values:
            hourly_avg_values[date]['valuesCO2'].append(valueCO2)
            hourly_avg_values[date]['valuesTemp'].append(valueTemp)
            hourly_avg_values[date]['valuesHum'].append(valueHum)
        else:
            hourly_avg_values[date] = {
                'valuesCO2': [valueCO2],
                'valuesTemp': [valueTemp],
                'valuesHum': [valueHum]
            }

    results = []
    for date, data in hourly_avg_values.items():
        avg_valueCO2 = sum(data['valuesCO2']) / len(data['valuesCO2'])
        avg_valueTemp = sum(data['valuesTemp']) / len(data['valuesTemp'])
        avg_valueHum = sum(data['valuesHum']) / len(data['valuesHum'])
        
        results.append({
            'date': date,
            'average_valueCO2': round(avg_valueCO2, 2),
            'average_valueTemp': round(avg_valueTemp, 2),
            'average_valueHum': round(avg_valueHum, 2)
        })

    return jsonify(results)

# This endpoint is used to get 6 averaged values per day for a month
@sensor_co2temphum_ext_app.route('/api/sensors/sensor_co2temphum_ext/month', methods=['GET'])
@jwt_required()
def get_sensorCO2TempHumExtMonth():
    db = current_app.db
    current_date = datetime.datetime.now()
    start_date_month = current_date - datetime.timedelta(days=30)
    
    sensorCO2TempHumExtMonthValues = db.session.query(Sensor_CO2TempHum_ext).filter(
        Sensor_CO2TempHum_ext.datetime >= start_date_month.strftime('%Y-%m-%d %H:%M:%S'),
        Sensor_CO2TempHum_ext.datetime <= current_date.strftime('%Y-%m-%d %H:%M:%S')
    ).all()

    daily_avg_values = {}
    for entry in sensorCO2TempHumExtMonthValues:
        date = entry.datetime.date()  
        valueCO2 = int(entry.valueCO2)
        valueTemp = int(entry.valueTemp)
        valueHum = int(entry.valueHum)
        if date in daily_avg_values:
            daily_avg_values[date]['valuesCO2'].append(valueCO2)
            daily_avg_values[date]['valuesTemp'].append(valueTemp)
            daily_avg_values[date]['valuesHum'].append(valueHum)
        else:
            daily_avg_values[date] = {
                'valuesCO2': [valueCO2],
                'valuesTemp': [valueTemp],
                'valuesHum': [valueHum]
            }

    # Intervals definition
    part_intervals = [(0, 3, 59, 59), (4, 7, 59, 59), (8, 11, 59, 59), (12, 15, 59, 59), (16, 19, 59, 59), (20, 23, 59, 59)]

    results = []
    for date, data in daily_avg_values.items():
        avg_parts = []

        for start_hour, end_hour, end_minute, end_second in part_intervals:
            part_values = [val for val in sensorCO2TempHumExtMonthValues if start_hour <= val.datetime.hour <= end_hour and val.datetime.date() == date]
            part_values = [int(entry.valueCO2) for entry in part_values]
            if part_values:
                part_avg_value = sum(part_values) / len(part_values)
                part_date = datetime.datetime.combine(date, datetime.time(start_hour, end_minute, end_second))
                avg_parts.append({'date': part_date.strftime('%Y-%m-%d %H:%M:%S'), 'average_valueCO2': round(part_avg_value, 2)})

                part_valuesTemp = [int(entry.valueTemp) for entry in part_values]
                part_avg_valueTemp = sum(part_valuesTemp) / len(part_valuesTemp)
                avg_parts[-1]['average_valueTemp'] = round(part_avg_valueTemp, 2)

                part_valuesHum = [int(entry.valueHum) for entry in part_values]
                part_avg_valueHum = sum(part_valuesHum) / len(part_valuesHum)
                avg_parts[-1]['average_valueHum'] = round(part_avg_valueHum, 2)

        results.extend(avg_parts)

    return jsonify(results)



