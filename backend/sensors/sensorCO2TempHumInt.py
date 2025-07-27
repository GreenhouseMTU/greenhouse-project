from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timedelta, date, time
from flask_jwt_extended import jwt_required
from models import Sensor_CO2TempHum_int
from db import db
import subprocess
import json
import math


sensor_co2temphum_int_app = Blueprint('sensor_co2temphum_int_app', __name__)

current_date = date.today()

# This endpoint is used to get the latest values
@sensor_co2temphum_int_app.route('/api/sensors/sensor_co2temphum_int/latest', methods=['GET'])
@jwt_required()
def get_sensorCO2TempHumInt():
    # utilise directement db.session.query(...)
    sensorCO2TempHumIntLatestValue = db.session.query(Sensor_CO2TempHum_int).order_by(Sensor_CO2TempHum_int.id.desc()).first()
    if sensorCO2TempHumIntLatestValue is not None:
        serialized_data = sensorCO2TempHumIntLatestValue.serialize()
        del serialized_data['id']
        return jsonify(serialized_data)
    else:
        return jsonify({'message': 'No data available'}), 404



# Nouveau endpoint pic-average pour Sensor_CO2TempHum_int

@sensor_co2temphum_int_app.route('/api/sensors/sensor_co2temphum_int/day/pic-average', methods=['GET'])
@jwt_required()
def get_sensorCO2TempHumIntPicAverage():
    # utilise directement db.session.query(...)
    now = datetime.now()
    formatted_date = now.strftime('%Y-%m-%d')

    data_entries = db.session.query(Sensor_CO2TempHum_int).filter(Sensor_CO2TempHum_int.datetime.like(f'%{formatted_date}%')).all()

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
@sensor_co2temphum_int_app.route('/api/sensors/sensor_co2temphum_int/day/average', methods=['GET'])
@jwt_required()
def get_sensorCO2TempHumIntDayAverage():
    # utilise directement db.session.query(...)
    current_date = datetime.now()
    formatted_date = current_date.strftime('%Y-%m-%d')
    sensorCO2TempHumIntDayAverageValues = db.session.query(Sensor_CO2TempHum_int).filter(Sensor_CO2TempHum_int.datetime.like(f'%{formatted_date}%')).all()

    hourly_avg_values = {}
    for entry in sensorCO2TempHumIntDayAverageValues:
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
@sensor_co2temphum_int_app.route('/api/sensors/sensor_co2temphum_int/day', methods=['GET'])
@jwt_required()
def get_sensorCO2TempHumIntDay():
    # utilise directement db.session.query(...)
    formatted_date = current_date.strftime('%Y-%m-%d')
    sensors = db.session.query(Sensor_CO2TempHum_int).filter(Sensor_CO2TempHum_int.datetime.like(f'%{formatted_date}%')).all()
    return jsonify([sensor.serialize() for sensor in sensors])

# This endpoint is used to get an average per day of the values for a full week (Monday to Sunday)
@sensor_co2temphum_int_app.route('/api/sensors/sensor_co2temphum_int/week', methods=['GET'])
@jwt_required()
def get_sensorCO2TempHumIntWeek():
    offset = int(request.args.get('offset', 0))
    today = datetime.now().date() + timedelta(days=offset * 7)
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    start_date = datetime.combine(monday, datetime.min.time())
    end_date = datetime.combine(sunday, datetime.max.time())

    data_entries = db.session.query(Sensor_CO2TempHum_int).filter(
        Sensor_CO2TempHum_int.datetime >= start_date,
        Sensor_CO2TempHum_int.datetime <= end_date
    ).all()

    daily_data = {}
    for entry in data_entries:
        date_str = entry.datetime.strftime('%Y-%m-%d')
        if date_str not in daily_data:
            daily_data[date_str] = {'CO2': [], 'Temp': [], 'Hum': []}
        daily_data[date_str]['CO2'].append(int(entry.valueCO2))
        daily_data[date_str]['Temp'].append(int(entry.valueTemp))
        daily_data[date_str]['Hum'].append(int(entry.valueHum))

    results = []
    for i in range(7):
        current_date = monday + timedelta(days=i)
        date_str = current_date.strftime('%Y-%m-%d')
        values = daily_data.get(date_str, {'CO2': [], 'Temp': [], 'Hum': []})
        avg_CO2 = round(sum(values['CO2']) / len(values['CO2']), 2) if values['CO2'] else 0
        avg_Temp = round(sum(values['Temp']) / len(values['Temp']), 2) if values['Temp'] else 0
        avg_Hum = round(sum(values['Hum']) / len(values['Hum']), 2) if values['Hum'] else 0

        results.append({
            'date': date_str,
            'average_valueCO2': avg_CO2,
            'average_valueTemp': avg_Temp,
            'average_valueHum': avg_Hum
        })

    return jsonify(results)

# This endpoint is used to get 6 averaged values per day for a month
@sensor_co2temphum_int_app.route('/api/sensors/sensor_co2temphum_int/month', methods=['GET'])
@jwt_required()
def get_sensorCO2TempHumIntMonth():
    current_date = datetime.now()
    start_date_month = current_date - timedelta(days=30)
    
    sensorCO2TempHumIntMonthValues = db.session.query(Sensor_CO2TempHum_int).filter(
        Sensor_CO2TempHum_int.datetime >= start_date_month,
        Sensor_CO2TempHum_int.datetime <= current_date
    ).all()

    daily_avg_values = {}
    for entry in sensorCO2TempHumIntMonthValues:
        entry_date = entry.datetime.date()
        if entry_date not in daily_avg_values:
            daily_avg_values[entry_date] = {
                'valuesCO2': [],
                'valuesTemp': [],
                'valuesHum': []
            }
        daily_avg_values[entry_date]['valuesCO2'].append(int(entry.valueCO2))
        daily_avg_values[entry_date]['valuesTemp'].append(int(entry.valueTemp))
        daily_avg_values[entry_date]['valuesHum'].append(int(entry.valueHum))

    # Intervals definition
    part_intervals = [(0, 3, 59, 59), (4, 7, 59, 59), (8, 11, 59, 59), (12, 15, 59, 59), (16, 19, 59, 59), (20, 23, 59, 59)]


    results = []
    for entry_date in daily_avg_values:
        for start_hour, end_hour, end_minute, end_second in part_intervals:
            start_time = time(start_hour, 0, 0)
            end_time = time(end_hour, end_minute, end_second)

            part_entries = [
                entry for entry in sensorCO2TempHumIntMonthValues
                if entry.datetime.date() == entry_date and start_time <= entry.datetime.time() <= end_time
            ]

            if part_entries:
                avg_CO2 = round(sum(int(e.valueCO2) for e in part_entries) / len(part_entries), 2)
                avg_Temp = round(sum(int(e.valueTemp) for e in part_entries) / len(part_entries), 2)
                avg_Hum = round(sum(int(e.valueHum) for e in part_entries) / len(part_entries), 2)

                part_date = datetime.combine(entry_date, start_time)

                results.append({
                    'date': part_date.strftime('%Y-%m-%d %H:%M:%S'),
                    'average_valueCO2': avg_CO2,
                    'average_valueTemp': avg_Temp,
                    'average_valueHum': avg_Hum
                })

    return jsonify(results)

# Récupérer les données des 3 derniers jours
@sensor_co2temphum_int_app.route('/api/sensors/sensor_co2temphum_int/last_3_days', methods=['GET'])
@jwt_required()
def get_sensorCO2TempHumIntLast3Days():
    current_date = datetime.now()
    start_date = current_date - timedelta(days=3)

    
    data_entries = db.session.query(Sensor_CO2TempHum_int).filter(
        Sensor_CO2TempHum_int.datetime >= start_date,
        Sensor_CO2TempHum_int.datetime <= current_date
    ).order_by(Sensor_CO2TempHum_int.datetime.asc()).all()

    # Sérialiser les données
    results = [
        {
            'datetime': entry.datetime.strftime('%Y-%m-%d %H:%M:%S'),
            'valueCO2': entry.valueCO2,
            'valueTemp': entry.valueTemp,
            'valueHum': entry.valueHum
        }
        for entry in data_entries
    ]

    return jsonify(results)

# analyser les tendances des données extraites
def analyze_trends(data):
    trends = {}
    temps = [entry['valueTemp'] for entry in data]
    hums = [entry['valueHum'] for entry in data]
    co2s = [entry['valueCO2'] for entry in data]

    # Calculer les moyennes quotidiennes
    daily_data = {}
    for entry in data:
        date_str = entry['datetime'].split(' ')[0]
        if date_str not in daily_data:
            daily_data[date_str] = {'temps': [], 'hums': [], 'co2s': []}
        daily_data[date_str]['temps'].append(entry['valueTemp'])
        daily_data[date_str]['hums'].append(entry['valueHum'])
        daily_data[date_str]['co2s'].append(entry['valueCO2'])

    daily_averages = {}
    for date, values in daily_data.items():
        daily_averages[date] = {
            'average_temp': round(sum(values['temps']) / len(values['temps']), 2),
            'average_hum': round(sum(values['hums']) / len(values['hums']), 2),
            'average_co2': round(sum(values['co2s']) / len(values['co2s']), 2)
        }

    # Calculer les moyennes des 3 derniers jours
    sorted_dates = sorted(daily_averages.keys())[-3:]  # Les 3 derniers jours
    three_day_temps = [daily_averages[date]['average_temp'] for date in sorted_dates]
    three_day_hums = [daily_averages[date]['average_hum'] for date in sorted_dates]
    three_day_co2s = [daily_averages[date]['average_co2'] for date in sorted_dates]

    def compute_stats(values):
        if not values:
            return {"average": 0, "variability": "±0.00"}
        average = round(sum(values) / len(values), 2)
        variance = sum((x - average) ** 2 for x in values) / len(values)
        std_dev = round(math.sqrt(variance), 2)
        return {
            "average": average,
            "variability": f"±{std_dev}"
        }

    # Détecter les tendances
    def detect_trend(metric, values):
        start = values[0]
        end = values[-1]
        stats = compute_stats(values)
        trend = "stable"
        if end > start:
            trend = "rising"
        elif end < start:
            trend = "falling"
        return {
            "trend": trend,
            "start": start,
            "end": end,
            "overall_average": stats["average"],
            "variability": stats["variability"]
        }

    trends['temperature'] = detect_trend('Temp', three_day_temps)
    trends['humidity'] = detect_trend('Hum', three_day_hums)
    trends['co2'] = detect_trend('CO2', three_day_co2s)

    # Ajouter les moyennes quotidiennes pour référence
    trends['daily_averages'] = daily_averages
    return trends


def generate_summary(trends):
    trends_json = json.dumps(trends)  # Convertit les tendances en JSON
    print(f"JSON passed to Node.js: {trends_json}")  # Log pour vérifier les données

    try:
        result = subprocess.run(
            ['node', 'generateSummary.js'],
            input=trends_json,  # Passe le JSON en entrée standard (stdin)
            capture_output=True,
            text=True,
            encoding='utf-8',  # Force l'encodage UTF-8
            cwd=r'd:\malea\Bureau\Clone\greenhouse-master\backend'  # Chemin absolu vers le script
        )
        if result.returncode == 0:
            return json.loads(result.stdout.strip())  # Parse le tableau JSON renvoyé par Node.js
        else:
            print(f"Node.js script error: {result.stderr}")
            raise Exception(f"Node.js script error: {result.stderr}")
    except Exception as e:
        print(f"Error generating summary: {e}")
        return ["Error generating summary."]


@sensor_co2temphum_int_app.route('/api/sensors/sensor_co2temphum_int/insights', methods=['GET'])
@jwt_required()
def get_sensorCO2TempHumIntInsights():
    # Extraire les données des 3 derniers jours
    current_date = datetime.now()
    start_date = current_date - timedelta(days=3)

    data_entries = db.session.query(Sensor_CO2TempHum_int).filter(
        Sensor_CO2TempHum_int.datetime >= start_date,
        Sensor_CO2TempHum_int.datetime <= current_date
    ).order_by(Sensor_CO2TempHum_int.datetime.asc()).all()

    # Sérialiser les données
    data = [
        {
            'datetime': entry.datetime.strftime('%Y-%m-%d %H:%M:%S'),
            'valueCO2': entry.valueCO2,
            'valueTemp': entry.valueTemp,
            'valueHum': entry.valueHum
        }
        for entry in data_entries
    ]

    # Analyser les tendances
    trends = analyze_trends(data)

    # Récupérer les moyennes quotidiennes via l'endpoint week
    weekly_data = get_sensorCO2TempHumIntWeek().json
    trends['daily_averages'] = weekly_data

    # Générer le résumé
    summary = generate_summary(trends)

    return jsonify({
        'summary': summary,
        'trends': trends
    })