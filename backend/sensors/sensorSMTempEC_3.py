from flask import Blueprint, request, jsonify, current_app
import datetime
from flask_jwt_extended import jwt_required
from models import Sensor_SMTempEC_3

sensor_smtempec_3_app = Blueprint('sensor_smtempec_3_app', __name__)

current_date = datetime.date.today()

# This endpoint is used to get the latest value
@sensor_smtempec_3_app.route('/api/sensors/sensor_smtempec_3/latest', methods=['GET'])
@jwt_required()
def get_sensorSMTempEC3():
    db = current_app.db
    sensorSMTempEC3LatestValue = db.session.query(Sensor_SMTempEC_3).order_by(Sensor_SMTempEC_3.id.desc()).first()
    if sensorSMTempEC3LatestValue is not None:
        serialized_data = sensorSMTempEC3LatestValue.serialize()
        del serialized_data['id']
        return jsonify(serialized_data)
    else:
        return jsonify({'message': 'No data available'}), 404

# This endpoint is used to get an average by hour of the current day
@sensor_smtempec_3_app.route('/api/sensors/sensor_smtempec_3/day/average', methods=['GET'])
@jwt_required()
def get_sensorSMTempEC3DayAverage():
    db = current_app.db
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
    db = current_app.db
    formatted_date = current_date.strftime('%Y-%m-%d')
    sensors = db.session.query(Sensor_SMTempEC_3).filter(Sensor_SMTempEC_3.datetime.like(f'%{formatted_date}%')).all()
    return jsonify([sensor.serialize() for sensor in sensors])

# This endpoint is used to get an average by hour of the values for a week
@sensor_smtempec_3_app.route('/api/sensors/sensor_smtempec_3/week', methods=['GET'])
@jwt_required()
def get_sensorSMTempEC3Week():
    db = current_app.db
    current_date = datetime.datetime.now()
    start_date_week = current_date - datetime.timedelta(days=7)
    end_date_week = current_date

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
    db = current_app.db
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

