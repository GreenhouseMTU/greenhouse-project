from flask import Blueprint, request, jsonify, current_app
import datetime
from flask_jwt_extended import jwt_required
from models import Sensor_light_ext
from db import db

sensor_light_ext_app = Blueprint('sensor_light_ext_app', __name__)

current_date = datetime.date.today()


# This endpoint is used to get the latest value
@sensor_light_ext_app.route('/api/sensors/sensor_light_ext/latest', methods=['GET'])
@jwt_required()
def get_sensorLightExt():
    # utilise directement db.session.query(...)
    sensorLightExtLatestValue = db.session.query(Sensor_light_ext).order_by(Sensor_light_ext.id.desc()).first()
    if sensorLightExtLatestValue is not None:
        serialized_data = sensorLightExtLatestValue.serialize()
        del serialized_data['id']
        return jsonify(serialized_data)
    else:
        return jsonify({'message': 'No data available'}), 404
    

# Nouveau endpoint pic-average pour Sensor_light_ext

@sensor_light_ext_app.route('/api/sensors/sensor_light_ext/day/pic-average', methods=['GET'])
@jwt_required()
def get_sensorLightExtPicAverage():
    # utilise directement db.session.query(...)
    now = datetime.datetime.now()
    formatted_date = now.strftime('%Y-%m-%d')

    data_entries = db.session.query(Sensor_light_ext).filter(Sensor_light_ext.datetime.like(f'%{formatted_date}%')).all()

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

    # Sécurité : si aucune valeur n'a été trouvée pour la période
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
@sensor_light_ext_app.route('/api/sensors/sensor_light_ext/day/average', methods=['GET'])
@jwt_required()
def get_sensorLightExtDayAverage():
    # utilise directement db.session.query(...)
    formatted_date = current_date.strftime('%Y-%m-%d')
    sensorLightExtDayAverageValues = db.session.query(Sensor_light_ext).filter(Sensor_light_ext.datetime.like(f'%{formatted_date}%')).all()

    hourly_avg_values = {}
    for entry in sensorLightExtDayAverageValues:
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
@sensor_light_ext_app.route('/api/sensors/sensor_light_ext/day', methods=['GET'])
@jwt_required()
def get_sensorLightExtDay():
    # utilise directement db.session.query(...)
    formatted_date = current_date.strftime('%Y-%m-%d')
    sensors = db.session.query(Sensor_light_ext).filter(Sensor_light_ext.datetime.like(f'%{formatted_date}%')).all()
    return jsonify([sensor.serialize() for sensor in sensors])

# This endpoint is used to get an average by hour of the values for a week
@sensor_light_ext_app.route('/api/sensors/sensor_light_ext/week', methods=['GET'])
@jwt_required()
def get_sensorLightExtWeek():
    offset = int(request.args.get('offset', 0))
    now = datetime.datetime.now() + datetime.timedelta(days=offset * 7)
    start_date_week = now - datetime.timedelta(days=7)
    end_date_week = now

    sensorLightExtWeekValues = db.session.query(Sensor_light_ext).filter(
        Sensor_light_ext.datetime >= start_date_week.strftime('%Y-%m-%d %H:%M:%S'),
        Sensor_light_ext.datetime <= end_date_week.strftime('%Y-%m-%d %H:%M:%S')
    ).all()

    hourly_avg_values = {}  # Store hourly average values here

    for entry in sensorLightExtWeekValues:
        hour = entry.datetime.hour  # Get the hour of the data point
        value = int(entry.value)

        if hour in hourly_avg_values:
            hourly_avg_values[hour]['values'].append(value)
        else:
            hourly_avg_values[hour] = {'values': [value]}

    results = []

    for hour, data in hourly_avg_values.items():
        avg_value = sum(data['values']) / len(data['values'])
        avg_value_rounded = round(avg_value, 2)

        # Create a datetime object for the hour
        hour_datetime = datetime.datetime(end_date_week.year, end_date_week.month, end_date_week.day, hour)

        results.append({'hour': hour_datetime.strftime('%Y-%m-%d %H:%M:%S'), 'average_value': avg_value_rounded})

    return jsonify(results)

# This endpoint is used to get 6 averaged values per day for a month
@sensor_light_ext_app.route('/api/sensors/sensor_light_ext/month', methods=['GET'])
@jwt_required()
def get_sensorLightExtMonthAverage():
    # utilise directement db.session.query(...)
    end_date_month = datetime.datetime.now()
    start_date_month = end_date_month - datetime.timedelta(days=30)
    
    sensorLightExtMonthValues = db.session.query(Sensor_light_ext).filter(
        Sensor_light_ext.datetime >= start_date_month.strftime('%Y-%m-%d %H:%M:%S'),
        Sensor_light_ext.datetime <= end_date_month.strftime('%Y-%m-%d %H:%M:%S')
    ).all()

    daily_avg_values = {}
    for entry in sensorLightExtMonthValues:
        date = entry.datetime.date()  # Get only the date, not the time
        value = int(entry.value)
        if date in daily_avg_values:
            daily_avg_values[date]['values'].append(value)
        else:
            daily_avg_values[date] = {'values': [value]}

    # Define the hourly intervals (6 intervals per day)
    part_intervals = [(0, 3, 59, 59), (4, 7, 59, 59), (8, 11, 59, 59), (12, 15, 59, 59), (16, 19, 59, 59), (20, 23, 59, 59)]

    results = []
    for date, data in daily_avg_values.items():
        avg_parts = []

        for start_hour, end_hour, end_minute, end_second in part_intervals:
            part_values = [val for val in sensorLightExtMonthValues if start_hour <= val.datetime.hour <= end_hour and val.datetime.date() == date]
            part_values = [int(entry.value) for entry in part_values]
            if part_values:
                part_avg_value = sum(part_values) / len(part_values)
                part_date = datetime.datetime.combine(date, datetime.time(start_hour, end_minute, end_second))
                avg_parts.append({'date': part_date.strftime('%Y-%m-%d %H:%M:%S'), 'average_value': round(part_avg_value, 2)})

        results.extend(avg_parts)

    return jsonify(results)
