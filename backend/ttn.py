from flask import Blueprint, request, jsonify, current_app
from datetime import datetime as dt
from models import (
    Sensor_light_ext,
    Sensor_light_int,
    Sensor_CO2TempHum_ext,
    Sensor_CO2TempHum_int,
    Sensor_SMTempEC_1,
    Sensor_SMTempEC_2,
    Sensor_SMTempEC_3,
    Sensor_SMTempEC_4
)
import logging
import traceback
import re
import pytz

# Blueprint pour les hooks TTN
ttn_app = Blueprint('ttn_app', __name__)

@ttn_app.route('/api/ttn/data', methods=['POST'])
def ttn_webhook():
    db = current_app.db
    try:
        data = request.get_json()
        print("TTN data received:", data)
        print("Messages payload:", data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", []))

        # Lecture du device_id
        device_id = data.get("end_device_ids", {}).get("device_id", "")
        # Normalisation de received_at en ISO (6 chiffres microsec)
        received_at_str = data.get("received_at", "")
        # Remplace 'Z' par '+00:00'
        if received_at_str.endswith("Z"):
            received_at_str = received_at_str[:-1] + "+00:00"
        # Tronque les nanosecondes (>6 chiffres) si présentes
        match = re.match(
            r"^(?P<prefix>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6})\d*(?P<tz>[+-]\d{2}:\d{2})$",
            received_at_str
        )
        if match:
            received_at_str = match.group("prefix") + match.group("tz")
        # Conversion en datetime Python (UTC)
        received_at_utc = dt.fromisoformat(received_at_str)
        # Conversion en heure locale (Europe/Dublin)
        local_tz = pytz.timezone("Europe/Dublin")
        received_at = received_at_utc.astimezone(local_tz)

        # --- Capteurs Light ---
        if device_id == "eui-2cf7f1c04430094f":  # extérieur light
            msgs = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [])
            val = msgs[0].get("measurementValue", "") if msgs else ""
            new_data = Sensor_light_ext(datetime=received_at, value=val)

        elif device_id == "eui-2cf7f1c044300975":  # intérieur light
            msgs = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [])
            val = msgs[0].get("measurementValue", "") if msgs else ""
            new_data = Sensor_light_int(datetime=received_at, value=val)

        # --- Capteurs CO2, Temp, Hum ---
        elif device_id in ("eui-2cf7f1c044300436", "eui-2cf7f1c0443004b1"):
            msgs = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [])
            # IDs de mesure
            ID_TEMP = 4097
            ID_HUM  = 4098
            ID_CO2  = 4100
            # Mapping id->valeur
            measurements = { m.get("measurementId"): m.get("measurementValue", "")
                             for m in msgs if "measurementId" in m }
            # Choix du modèle selon device_id
            if device_id == "eui-2cf7f1c044300436":
                Model = Sensor_CO2TempHum_ext
            else:
                Model = Sensor_CO2TempHum_int
            new_data = Model(
                datetime=received_at,
                valueCO2=measurements.get(ID_CO2, ""),
                valueTemp=measurements.get(ID_TEMP, ""),
                valueHum=measurements.get(ID_HUM, "")
            )

        # --- Capteurs sol (SM, Temp, EC) ---
        elif device_id == "eui-2cf7f1c0435006c8":
            msgs = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [])
            measurement_valueTemp = msgs[0].get("measurementValue", "") if msgs else ""
            measurement_valueSM   = msgs[1].get("measurementValue", "") if len(msgs) > 1 else ""
            measurement_valueEC   = msgs[2].get("measurementValue", "") if len(msgs) > 2 else ""
            new_data = Sensor_SMTempEC_1(
                datetime=received_at,
                valueTemp=measurement_valueTemp,
                valueSM=measurement_valueSM,
                valueEC=measurement_valueEC
            )

        elif device_id == "eui-2cf7f1c043500707":
            msgs = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [])
            measurement_valueTemp = msgs[0].get("measurementValue", "") if msgs else ""
            measurement_valueSM   = msgs[1].get("measurementValue", "") if len(msgs) > 1 else ""
            measurement_valueEC   = msgs[2].get("measurementValue", "") if len(msgs) > 2 else ""
            new_data = Sensor_SMTempEC_2(
                datetime=received_at,
                valueTemp=measurement_valueTemp,
                valueSM=measurement_valueSM,
                valueEC=measurement_valueEC
            )

        elif device_id == "eui-2cf7f1c043500681":
            msgs = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [])
            measurement_valueTemp = msgs[0].get("measurementValue", "") if msgs else ""
            measurement_valueSM   = msgs[1].get("measurementValue", "") if len(msgs) > 1 else ""
            measurement_valueEC   = msgs[2].get("measurementValue", "") if len(msgs) > 2 else ""
            new_data = Sensor_SMTempEC_3(
                datetime=received_at,
                valueTemp=measurement_valueTemp,
                valueSM=measurement_valueSM,
                valueEC=measurement_valueEC
            )

        elif device_id == "eui-2cf7f1c0435005e6":
            msgs = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [])
            measurement_valueTemp = msgs[0].get("measurementValue", "") if msgs else ""
            measurement_valueSM   = msgs[1].get("measurementValue", "") if len(msgs) > 1 else ""
            measurement_valueEC   = msgs[2].get("measurementValue", "") if len(msgs) > 2 else ""
            new_data = Sensor_SMTempEC_4(
                datetime=received_at,
                valueTemp=measurement_valueTemp,
                valueSM=measurement_valueSM,
                valueEC=measurement_valueEC
            )

        else:
            # Device non pris en charge
            return jsonify({"error": f"Unknown device_id: {device_id}"}), 400

        # Enregistrement en base
        db.session.add(new_data)
        db.session.commit()
        return jsonify({"message": "Data added successfully"}), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
