from flask import Blueprint, request, jsonify, current_app
import datetime
from flask_jwt_extended import jwt_required
from models import Sensor_CO2TempHum_ext
from db import db

sensor_co2temphum_ext_app = Blueprint('sensor_co2temphum_ext_app', __name__)

current_date = datetime.date.today()

#This endpoint is used to get the latest values
@sensor_co2temphum_ext_app.route('/api/sensors/sensor_co2temphum_ext/latest', methods=['GET'])
@jwt_required()
def get_sensorCO2TempHumExt():
    sensorCO2TempHumExtLatestValue = db.session.query(Sensor_CO2TempHum_ext).order_by(Sensor_CO2TempHum_ext.id.desc()).first()
    if sensorCO2TempHumExtLatestValue is not None:
        serialized_data = sensorCO2TempHumExtLatestValue.serialize()
        del serialized_data['id']
        return jsonify(serialized_data)
    else:
        return jsonify({'message': 'No data available'}), 404



# Nouveau endpoint pic-average pour Sensor_CO2TempHum_ext

@sensor_co2temphum_ext_app.route('/api/sensors/sensor_co2temphum_ext/day/pic-average', methods=['GET'])
@jwt_required()
def get_sensorCO2TempHumExtPicAverage():
    now = datetime.datetime.now()
    formatted_date = now.strftime('%Y-%m-%d')

    data_entries = db.session.query(Sensor_CO2TempHum_ext).filter(Sensor_CO2TempHum_ext.datetime.like(f'%{formatted_date}%')).all()

    # Initialisation
    max_day = {'CO2': None, 'Temp': None, 'Hum': None}
    max_night = {'CO2': None, 'Temp': None, 'Hum': None}

    for entry in data_entries:
        hour = entry.datetime.hour

        # jour ou nuit
        period = 'day' if 6 <= hour < 20 else 'night'

        # Récupère les valeurs du capteur
        val_CO2 = int(entry.valueCO2)
        val_Temp = int(entry.valueTemp)
        val_Hum = int(entry.valueHum)

        # Fonction de comparaison
        def update_max(val, current_max):
            return val if current_max is None or val > current_max else current_max

        if period == 'day':
            max_day['CO2'] = update_max(val_CO2, max_day['CO2'])
            max_day['Temp'] = update_max(val_Temp, max_day['Temp'])
            max_day['Hum'] = update_max(val_Hum, max_day['Hum'])
        else:
            max_night['CO2'] = update_max(val_CO2, max_night['CO2'])
            max_night['Temp'] = update_max(val_Temp, max_night['Temp'])
            max_night['Hum'] = update_max(val_Hum, max_night['Hum'])

    # On calcule les pic-averages
    result = {}

    for key in ['CO2', 'Temp', 'Hum']:
        day_max = max_day[key] if max_day[key] is not None else 0
        night_max = max_night[key] if max_night[key] is not None else 0
        pic_avg = round((day_max + night_max) / 2, 2)
        result[f'max_day_{key}'] = day_max
        result[f'max_night_{key}'] = night_max
        result[f'pic_average_{key}'] = pic_avg

    return jsonify(result)


# This endpoint is used to get an average by hour of the current day
@sensor_co2temphum_ext_app.route('/api/sensors/sensor_co2temphum_ext/day/average', methods=['GET'])
@jwt_required()
def get_sensorCO2TempHumExtDayAverage():
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
    formatted_date = current_date.strftime('%Y-%m-%d')
    sensors = db.session.query(Sensor_CO2TempHum_ext).filter(Sensor_CO2TempHum_ext.datetime.like(f'%{formatted_date}%')).all()
    return jsonify([sensor.serialize() for sensor in sensors])

# This endpoint is used to get an average by hour of the values for a week
@sensor_co2temphum_ext_app.route('/api/sensors/sensor_co2temphum_ext/week', methods=['GET'])
@jwt_required()
def get_sensorCO2TempHumExtWeek():
    offset = int(request.args.get('offset', 0))
    now = datetime.datetime.now() + datetime.timedelta(days=offset * 7)
    start_date_week = now - datetime.timedelta(days=7)
    end_date_week = now

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



