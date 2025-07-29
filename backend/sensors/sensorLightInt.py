from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timedelta, date, time
from flask_jwt_extended import jwt_required
from models import Sensor_light_int
from db import db

sensor_light_int_app = Blueprint('sensor_light_int_app', __name__)

current_date = date.today()

# This endpoint is used to get the latest value
@sensor_light_int_app.route('/api/sensors/sensor_light_int/latest', methods=['GET'])
@jwt_required()
def get_sensorLightInt():
    # utilise directement db.session.query(...)
    sensorLightIntLatestValue = db.session.query(Sensor_light_int).order_by(Sensor_light_int.id.desc()).first()
    if sensorLightIntLatestValue is not None:
        serialized_data = sensorLightIntLatestValue.serialize()
        del serialized_data['id']  # Exclure la clé 'id'
        return jsonify(serialized_data)
    else:
        return jsonify({'message': 'No data available'}), 404



# Nouveau endpoint pic-average pour Sensor_light_int

@sensor_light_int_app.route('/api/sensors/sensor_light_int/day/pic-average', methods=['GET'])
@jwt_required()
def get_sensorLightIntPicAverage():
    # utilise directement db.session.query(...)
    now = datetime.now()
    formatted_date = now.strftime('%Y-%m-%d')

    data_entries = db.session.query(Sensor_light_int).filter(Sensor_light_int.datetime.like(f'%{formatted_date}%')).all()

    max_day = None
    max_night = None

    for entry in data_entries:
        hour = entry.datetime.hour
        value = int(entry.value)

        if 6 <= hour < 20:
            if max_day is None or value > max_day:
                max_day = value
        else:
            if max_night is None or value > max_night:
                max_night = value

    # Sécurité au cas où il n'y a pas de données
    max_day = max_day if max_day is not None else 0
    max_night = max_night if max_night is not None else 0

    pic_average = round((max_day + max_night) / 2, 2)

    result = {
        'max_day': max_day,
        'max_night': max_night,
        'pic_average': pic_average
    }

    return jsonify(result)



# This endpoint is used to get an average by hour of the current day
@sensor_light_int_app.route('/api/sensors/sensor_light_int/day/average', methods=['GET'])
@jwt_required()
def get_sensorLightIntDayAverage():
    # utilise directement db.session.query(...)
    formatted_date = current_date.strftime('%Y-%m-%d')
    sensorLightIntDayAverageValues = db.session.query(Sensor_light_int).filter(Sensor_light_int.datetime.like(f'%{formatted_date}%')).all()

    hourly_avg_values = {}
    for entry in sensorLightIntDayAverageValues:
        time = entry.datetime.hour
        value = int(entry.value)
        if time in hourly_avg_values:
            hourly_avg_values[time]['values'].append(value)
        else:
            hourly_avg_values[time] = {'values': [value]}
    
    results = []
    for time, data in hourly_avg_values.items():
        avg_value = sum(data['values']) / len(data['values'])
        avg_value_rounded = round(avg_value, 2)
        results.append({'hour': time, 'average_value': avg_value_rounded})

    return jsonify(results)

# This endpoint is used to get all the values of the current day
@sensor_light_int_app.route('/api/sensors/sensor_light_int/day', methods=['GET'])
@jwt_required()
def get_sensorLightIntDay():
    # utilise directement db.session.query(...)
    formatted_date = current_date.strftime('%Y-%m-%d')
    sensors = db.session.query(Sensor_light_int).filter(Sensor_light_int.datetime.like(f'%{formatted_date}%')).all()
    return jsonify([sensor.serialize() for sensor in sensors])

# This endpoint is used to get an average per day of the values for a full week (Monday to Sunday)
@sensor_light_int_app.route('/api/sensors/sensor_light_int/week', methods=['GET'])
@jwt_required()
def get_sensorLightIntWeek():
    offset = int(request.args.get('offset', 0))
    today = datetime.now().date()
    monday = today - timedelta(days=today.weekday()) + timedelta(weeks=offset)
    sunday = monday + timedelta(days=6)
    start_date = datetime.combine(monday, datetime.min.time())
    end_date = datetime.combine(sunday, datetime.max.time())

    data_entries = db.session.query(Sensor_light_int).filter(
        Sensor_light_int.datetime >= start_date,
        Sensor_light_int.datetime <= end_date
    ).all()

    daily_data = {}
    for entry in data_entries:
        date_str = entry.datetime.strftime('%Y-%m-%d')
        if date_str not in daily_data:
            daily_data[date_str] = {'values': []}
        daily_data[date_str]['values'].append(int(entry.value))

    results = []
    for i in range(7):
        current_date = monday + timedelta(days=i)
        date_str = current_date.strftime('%Y-%m-%d')
        values = daily_data.get(date_str, {}).get('values', [])
        avg_value = round(sum(values) / len(values), 2) if values else 0
        results.append({'date': date_str, 'average_value': avg_value})

    return jsonify(results)

# This endpoint is used to get 6 averaged values per day for a month
@sensor_light_int_app.route('/api/sensors/sensor_light_int/month', methods=['GET'])
@jwt_required()
def get_sensorLightIntMonth():
    # utilise directement db.session.query(...)
    end_date_month = datetime.now()
    start_date_month = end_date_month - timedelta(days=30)

    sensorLightIntMonthValues = db.session.query(Sensor_light_int).filter(
        Sensor_light_int.datetime >= start_date_month.strftime('%Y-%m-%d %H:%M:%S'),
        Sensor_light_int.datetime <= end_date_month.strftime('%Y-%m-%d %H:%M:%S')
    ).all()

    daily_avg_values = {}
    for entry in sensorLightIntMonthValues:
        date = entry.datetime.date() 
        value = int(entry.value)
        if date in daily_avg_values:
            daily_avg_values[date]['values'].append(value)
        else:
            daily_avg_values[date] = {'values': [value]}

    # Intervals definition
    part_intervals = [(0, 3, 59, 59), (4, 7, 59, 59), (8, 11, 59, 59), (12, 15, 59, 59), (16, 19, 59, 59), (20, 23, 59, 59)]

    results = []
    for date, data in daily_avg_values.items():
        avg_parts = []

        for start_hour, end_hour, end_minute, end_second in part_intervals:
            part_values = [val for val in sensorLightIntMonthValues if start_hour <= val.datetime.hour <= end_hour and val.datetime.date() == date]
            part_values = [int(entry.value) for entry in part_values]
            if part_values:
                part_avg_value = sum(part_values) / len(part_values)
                part_date = datetime.combine(date, time(start_hour, end_minute, end_second))
                avg_parts.append({'date': part_date.strftime('%Y-%m-%d %H:%M:%S'), 'average_value': round(part_avg_value, 2)})

        results.extend(avg_parts)

    return jsonify(results)
