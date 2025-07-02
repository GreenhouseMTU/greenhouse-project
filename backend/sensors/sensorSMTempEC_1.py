from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timedelta, date, time
from flask_jwt_extended import jwt_required
from models import Sensor_SMTempEC_1
from db import db

sensor_smtempec_1_app = Blueprint('sensor_smtempec_1_app', __name__)

current_date = date.today()

# This endpoint is used to get the latest value
@sensor_smtempec_1_app.route('/api/sensors/sensor_smtempec_1/latest', methods=['GET'])
@jwt_required()
def get_sensorSMTempEC1():
    # utilise directement db.session.query(...)
    sensorSMTempEC1LatestValue = db.session.query(Sensor_SMTempEC_1).order_by(Sensor_SMTempEC_1.id.desc()).first()
    if sensorSMTempEC1LatestValue is not None:
        serialized_data = sensorSMTempEC1LatestValue.serialize()
        del serialized_data['id']
        return jsonify(serialized_data)
    else:
        return jsonify({'message': 'No data available'}), 404




# Nouveau endpoint pic-average pour Sensor_SMTempEC_1

@sensor_smtempec_1_app.route('/api/sensors/sensor_smtempec_1/day/pic-average', methods=['GET'])
@jwt_required()
def get_sensorSMTempEC1PicAverage():
    # utilise directement db.session.query(...)
    now = datetime.now()
    formatted_date = now.strftime('%Y-%m-%d')

    data_entries = db.session.query(Sensor_SMTempEC_1).filter(Sensor_SMTempEC_1.datetime.like(f'%{formatted_date}%')).all()

    max_day_SM = None
    max_night_SM = None

    max_day_Temp = None
    max_night_Temp = None

    max_day_EC = None
    max_night_EC = None

    for entry in data_entries:
        hour = entry.datetime.hour
        valueSM = int(entry.valueSM)
        valueTemp = int(entry.valueTemp)
        valueEC = int(entry.valueEC)

        if 6 <= hour < 20:
            # Jour
            max_day_SM = valueSM if max_day_SM is None or valueSM > max_day_SM else max_day_SM
            max_day_Temp = valueTemp if max_day_Temp is None or valueTemp > max_day_Temp else max_day_Temp
            max_day_EC = valueEC if max_day_EC is None or valueEC > max_day_EC else max_day_EC
        else:
            # Nuit
            max_night_SM = valueSM if max_night_SM is None or valueSM > max_night_SM else max_night_SM
            max_night_Temp = valueTemp if max_night_Temp is None or valueTemp > max_night_Temp else max_night_Temp
            max_night_EC = valueEC if max_night_EC is None or valueEC > max_night_EC else max_night_EC

    # Gestion des valeurs None (si pas de mesures sur une période)
    max_day_SM = max_day_SM if max_day_SM is not None else 0
    max_night_SM = max_night_SM if max_night_SM is not None else 0
    max_day_Temp = max_day_Temp if max_day_Temp is not None else 0
    max_night_Temp = max_night_Temp if max_night_Temp is not None else 0
    max_day_EC = max_day_EC if max_day_EC is not None else 0
    max_night_EC = max_night_EC if max_night_EC is not None else 0

    # Calcul des moyennes pic-average
    pic_average_SM = round((max_day_SM + max_night_SM) / 2, 2)
    pic_average_Temp = round((max_day_Temp + max_night_Temp) / 2, 2)
    pic_average_EC = round((max_day_EC + max_night_EC) / 2, 2)

    result = {
        'max_day_SM': max_day_SM,
        'max_night_SM': max_night_SM,
        'pic_average_SM': pic_average_SM,

        'max_day_Temp': max_day_Temp,
        'max_night_Temp': max_night_Temp,
        'pic_average_Temp': pic_average_Temp,

        'max_day_EC': max_day_EC,
        'max_night_EC': max_night_EC,
        'pic_average_EC': pic_average_EC
    }

    return jsonify(result)




# This endpoint is used to get an average by hour of the current day
@sensor_smtempec_1_app.route('/api/sensors/sensor_smtempec_1/day/average', methods=['GET'])
@jwt_required()
def get_sensorSMTempEC1DayAverage():
    # utilise directement db.session.query(...)
    current_date = datetime.now()
    formatted_date = current_date.strftime('%Y-%m-%d')
    sensorSMTempEC1DayAverageValues = db.session.query(Sensor_SMTempEC_1).filter(Sensor_SMTempEC_1.datetime.like(f'%{formatted_date}%')).all()

    hourly_avg_values = {}
    for entry in sensorSMTempEC1DayAverageValues:
        time = entry.datetime.hour
        valueSM = int(entry.valueSM)
        valueTemp = int(entry.valueTemp)
        valueEC = int(entry.valueEC)
        if time in hourly_avg_values:
            hourly_avg_values[time]['valuesSM'].append(valueSM)
            hourly_avg_values[time]['valuesTemp'].append(valueTemp)
            hourly_avg_values[time]['valuesEC'].append(valueEC)
        else:
            hourly_avg_values[time] = {
                'valuesSM': [valueSM],
                'valuesTemp': [valueTemp],
                'valuesEC': [valueEC]
            }

    results = []
    for time, data in hourly_avg_values.items():
        avg_valueSM = sum(data['valuesSM']) / len(data['valuesSM'])
        avg_valueTemp = sum(data['valuesTemp']) / len(data['valuesTemp'])
        avg_valueEC = sum(data['valuesEC']) / len(data['valuesEC'])
        
        avg_valueSM_rounded = round(avg_valueSM, 2)
        avg_valueTemp_rounded = round(avg_valueTemp, 2)
        avg_valueEC_rounded = round(avg_valueEC, 2)
        
        results.append({
            'hour': time,
            'average_valueSM': avg_valueSM_rounded,
            'average_valueTemp': avg_valueTemp_rounded,
            'average_valueEC': avg_valueEC_rounded
        })

    return jsonify(results)

# This endpoint is used to get all the values of the current day
@sensor_smtempec_1_app.route('/api/sensors/sensor_smtempec_1/day', methods=['GET'])
@jwt_required()
def get_sensorSMTempEC1Day():
    # utilise directement db.session.query(...)
    formatted_date = current_date.strftime('%Y-%m-%d')
    sensors = db.session.query(Sensor_SMTempEC_1).filter(Sensor_SMTempEC_1.datetime.like(f'%{formatted_date}%')).all()
    return jsonify([sensor.serialize() for sensor in sensors])

# This endpoint is used to get an average per day of the values for a full week (Monday to Sunday)
@sensor_smtempec_1_app.route('/api/sensors/sensor_smtempec_1/week', methods=['GET'])
@jwt_required()
def get_sensorSMTempEC1Week():
    offset = int(request.args.get('offset', 0))
    today = datetime.now().date() + timedelta(days=offset * 7)
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    start_date = datetime.combine(monday, datetime.min.time())
    end_date = datetime.combine(sunday, datetime.max.time())

    data_entries = db.session.query(Sensor_SMTempEC_1).filter(
        Sensor_SMTempEC_1.datetime >= start_date,
        Sensor_SMTempEC_1.datetime <= end_date
    ).all()

    daily_data = {}
    for entry in data_entries:
        date_str = entry.datetime.strftime('%Y-%m-%d')
        if date_str not in daily_data:
            daily_data[date_str] = {'SM': [], 'Temp': [], 'EC': []}
        daily_data[date_str]['SM'].append(int(entry.valueSM))
        daily_data[date_str]['Temp'].append(int(entry.valueTemp))
        daily_data[date_str]['EC'].append(int(entry.valueEC))

    results = []
    for i in range(7):
        current_date = monday + timedelta(days=i)
        date_str = current_date.strftime('%Y-%m-%d')
        values = daily_data.get(date_str, {'SM': [], 'Temp': [], 'EC': []})
        avg_SM = round(sum(values['SM']) / len(values['SM']), 2) if values['SM'] else 0
        avg_Temp = round(sum(values['Temp']) / len(values['Temp']), 2) if values['Temp'] else 0
        avg_EC = round(sum(values['EC']) / len(values['EC']), 2) if values['EC'] else 0

        results.append({
            'date': date_str,
            'average_valueSM': avg_SM,
            'average_valueTemp': avg_Temp,
            'average_valueEC': avg_EC
        })

    return jsonify(results)

# This endpoint is used to get 6 averaged values per day for a month
@sensor_smtempec_1_app.route('/api/sensors/sensor_smtempec_1/month', methods=['GET'])
@jwt_required()
def get_sensorSMTempEC1Month():
    # utilise directement db.session.query(...)
    current_date = datetime.now()
    start_date_month = current_date - timedelta(days=30)
    
    sensorSMTempEC1MonthValues = db.session.query(Sensor_SMTempEC_1).filter(
        Sensor_SMTempEC_1.datetime >= start_date_month.strftime('%Y-%m-%d %H:%M:%S'),
        Sensor_SMTempEC_1.datetime <= current_date.strftime('%Y-%m-%d %H:%M:%S')
    ).all()

    daily_avg_values = {}
    for entry in sensorSMTempEC1MonthValues:
        date = entry.datetime.date() 
        valueSM = int(entry.valueSM)
        valueTemp = int(entry.valueTemp)
        valueEC = int(entry.valueEC)
        if date in daily_avg_values:
            daily_avg_values[date]['valuesSM'].append(valueSM)
            daily_avg_values[date]['valuesTemp'].append(valueTemp)
            daily_avg_values[date]['valuesEC'].append(valueEC)
        else:
            daily_avg_values[date] = {
                'valuesSM': [valueSM],
                'valuesTemp': [valueTemp],
                'valuesEC': [valueEC]
            }

    # Intervals definition
    part_intervals = [(0, 3, 59, 59), (4, 7, 59, 59), (8, 11, 59, 59), (12, 15, 59, 59), (16, 19, 59, 59), (20, 23, 59, 59)]

    results = []
    for date, data in daily_avg_values.items():
        avg_parts = []

        for start_hour, end_hour, end_minute, end_second in part_intervals:
            part_values = [val for val in sensorSMTempEC1MonthValues if start_hour <= val.datetime.hour <= end_hour and val.datetime.date() == date]
            part_values = [int(entry.valueSM) for entry in part_values]
            if part_values:
                part_avg_value = sum(part_values) / len(part_values)
                part_date = datetime.combine(date, time(start_hour, end_minute, end_second))
                avg_parts.append({'date': part_date.strftime('%Y-%m-%d %H:%M:%S'), 'average_valueSM': round(part_avg_value, 2)})

                part_valuesTemp = [int(entry.valueTemp) for entry in part_values]
                part_avg_valueTemp = sum(part_valuesTemp) / len(part_valuesTemp)
                avg_parts[-1]['average_valueTemp'] = round(part_avg_valueTemp, 2)

                part_valuesEC = [int(entry.valueEC) for entry in part_values]
                part_avg_valueEC = sum(part_valuesEC) / len(part_valuesEC)
                avg_parts[-1]['average_valueEC'] = round(part_avg_valueEC, 2)

        results.extend(avg_parts)

    return jsonify(results)

