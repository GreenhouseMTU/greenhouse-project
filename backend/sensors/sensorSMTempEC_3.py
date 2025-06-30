from flask import Blueprint, request, jsonify, current_app
import datetime
from flask_jwt_extended import jwt_required
from models import Sensor_SMTempEC_3
from db import db

sensor_smtempec_3_app = Blueprint('sensor_smtempec_3_app', __name__)

current_date = datetime.date.today()

# This endpoint is used to get the latest value
@sensor_smtempec_3_app.route('/api/sensors/sensor_smtempec_3/latest', methods=['GET'])
@jwt_required()
def get_sensorSMTempEC3():
    # utilise directement db.session.query(...)
    sensorSMTempEC3LatestValue = db.session.query(Sensor_SMTempEC_3).order_by(Sensor_SMTempEC_3.id.desc()).first()
    if sensorSMTempEC3LatestValue is not None:
        serialized_data = sensorSMTempEC3LatestValue.serialize()
        del serialized_data['id']
        return jsonify(serialized_data)
    else:
        return jsonify({'message': 'No data available'}), 404



# Nouveau endpoint pic-average pour Sensor_SMTempEC_3

@sensor_smtempec_3_app.route('/api/sensors/sensor_smtempec_3/day/pic-average', methods=['GET'])
@jwt_required()
def get_sensorSMTempEC3PicAverage():
    # utilise directement db.session.query(...)
    now = datetime.datetime.now()
    formatted_date = now.strftime('%Y-%m-%d')

    data_entries = db.session.query(Sensor_SMTempEC_3).filter(Sensor_SMTempEC_3.datetime.like(f'%{formatted_date}%')).all()

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
            max_day_SM = valueSM if max_day_SM is None or valueSM > max_day_SM else max_day_SM
            max_day_Temp = valueTemp if max_day_Temp is None or valueTemp > max_day_Temp else max_day_Temp
            max_day_EC = valueEC if max_day_EC is None or valueEC > max_day_EC else max_day_EC
        else:
            max_night_SM = valueSM if max_night_SM is None or valueSM > max_night_SM else max_night_SM
            max_night_Temp = valueTemp if max_night_Temp is None or valueTemp > max_night_Temp else max_night_Temp
            max_night_EC = valueEC if max_night_EC is None or valueEC > max_night_EC else max_night_EC

    max_day_SM = max_day_SM if max_day_SM is not None else 0
    max_night_SM = max_night_SM if max_night_SM is not None else 0
    max_day_Temp = max_day_Temp if max_day_Temp is not None else 0
    max_night_Temp = max_night_Temp if max_night_Temp is not None else 0
    max_day_EC = max_day_EC if max_day_EC is not None else 0
    max_night_EC = max_night_EC if max_night_EC is not None else 0

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
@sensor_smtempec_3_app.route('/api/sensors/sensor_smtempec_3/day/average', methods=['GET'])
@jwt_required()
def get_sensorSMTempEC3DayAverage():
    # utilise directement db.session.query(...)
    current_date = datetime.datetime.now()
    formatted_date = current_date.strftime('%Y-%m-%d')
    sensorSMTempEC3DayAverageValues = db.session.query(Sensor_SMTempEC_3).filter(Sensor_SMTempEC_3.datetime.like(f'%{formatted_date}%')).all()

    hourly_avg_values = {}
    for entry in sensorSMTempEC3DayAverageValues:
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
@sensor_smtempec_3_app.route('/api/sensors/sensor_smtempec_3/day', methods=['GET'])
@jwt_required()
def get_sensorSMTempEC3ExtDay():
    # utilise directement db.session.query(...)
    formatted_date = current_date.strftime('%Y-%m-%d')
    sensors = db.session.query(Sensor_SMTempEC_3).filter(Sensor_SMTempEC_3.datetime.like(f'%{formatted_date}%')).all()
    return jsonify([sensor.serialize() for sensor in sensors])

# This endpoint is used to get an average by hour of the values for a week
@sensor_smtempec_3_app.route('/api/sensors/sensor_smtempec_3/week', methods=['GET'])
@jwt_required()
def get_sensorSMTempEC3Week():
    offset = int(request.args.get('offset', 0))
    now = datetime.datetime.now() + datetime.timedelta(days=offset * 7)
    start_date_week = now - datetime.timedelta(days=7)
    end_date_week = now

    sensorSMTempEC3WeekValues = db.session.query(Sensor_SMTempEC_3).filter(
        Sensor_SMTempEC_3.datetime >= start_date_week.strftime('%Y-%m-%d %H:%M:%S'),
        Sensor_SMTempEC_3.datetime <= end_date_week.strftime('%Y-%m-%d %H:%M:%S')
    ).all()

    hourly_avg_values = {}
    for entry in sensorSMTempEC3WeekValues:
        date = entry.datetime.strftime('%Y-%m-%d %H')  
        valueSM = int(entry.valueSM)
        valueTemp = int(entry.valueTemp)
        valueEC = int(entry.valueEC)
        if date in hourly_avg_values:
            hourly_avg_values[date]['valuesSM'].append(valueSM)
            hourly_avg_values[date]['valuesTemp'].append(valueTemp)
            hourly_avg_values[date]['valuesEC'].append(valueEC)
        else:
            hourly_avg_values[date] = {
                'valuesSM': [valueSM],
                'valuesTemp': [valueTemp],
                'valuesEC': [valueEC]
            }

    results = []
    for date, data in hourly_avg_values.items():
        avg_valueSM = sum(data['valuesSM']) / len(data['valuesSM'])
        avg_valueTemp = sum(data['valuesTemp']) / len(data['valuesTemp'])
        avg_valueEC = sum(data['valuesEC']) / len(data['valuesEC'])
        
        results.append({
            'date': date,
            'average_valueSM': round(avg_valueSM, 2),
            'average_valueTemp': round(avg_valueTemp, 2),
            'average_valueEC': round(avg_valueEC, 2)
        })

    return jsonify(results)

# This endpoint is used to get 6 averaged values per day for a month
@sensor_smtempec_3_app.route('/api/sensors/sensor_smtempec_3/month', methods=['GET'])
@jwt_required()
def get_sensorSMTempEC3Month():
    # utilise directement db.session.query(...)
    current_date = datetime.datetime.now()
    start_date_month = current_date - datetime.timedelta(days=30)
    
    sensorSMTempEC3MonthValues = db.session.query(Sensor_SMTempEC_3).filter(
        Sensor_SMTempEC_3.datetime >= start_date_month.strftime('%Y-%m-%d %H:%M:%S'),
        Sensor_SMTempEC_3.datetime <= current_date.strftime('%Y-%m-%d %H:%M:%S')
    ).all()

    daily_avg_values = {}
    for entry in sensorSMTempEC3MonthValues:
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
            part_values = [val for val in sensorSMTempEC3MonthValues if start_hour <= val.datetime.hour <= end_hour and val.datetime.date() == date]
            part_values = [int(entry.valueSM) for entry in part_values]
            if part_values:
                part_avg_value = sum(part_values) / len(part_values)
                part_date = datetime.datetime.combine(date, datetime.time(start_hour, end_minute, end_second))
                avg_parts.append({'date': part_date.strftime('%Y-%m-%d %H:%M:%S'), 'average_valueSM': round(part_avg_value, 2)})

                part_valuesTemp = [int(entry.valueTemp) for entry in part_values]
                part_avg_valueTemp = sum(part_valuesTemp) / len(part_valuesTemp)
                avg_parts[-1]['average_valueTemp'] = round(part_avg_valueTemp, 2)

                part_valuesEC = [int(entry.valueEC) for entry in part_values]
                part_avg_valueEC = sum(part_valuesEC) / len(part_valuesEC)
                avg_parts[-1]['average_valueEC'] = round(part_avg_valueEC, 2)

        results.extend(avg_parts)

    return jsonify(results)

