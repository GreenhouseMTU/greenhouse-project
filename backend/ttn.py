from flask import Flask, request, Blueprint,jsonify, current_app
from datetime import datetime
from models import Sensor_light_ext, Sensor_light_int, Sensor_CO2TempHum_ext, Sensor_CO2TempHum_int, Sensor_SMTempEC_1, Sensor_SMTempEC_2, Sensor_SMTempEC_3, Sensor_SMTempEC_4
import logging

ttn_app = Blueprint('ttn_app', __name__)

# This endpoint receive the data coming from the TTN, they are filtered by their device_id and then stored in the right table of the DB
@ttn_app.route('/api/ttn/data', methods=['POST'])
def ttn_webhook():
    db = current_app.db
    try:
        data = request.get_json()

        device_id = data.get("end_device_ids", {}).get("device_id", "")
        received_at = data.get("received_at", "")
        received_at = received_at[:10] + " " + received_at[11:19]

        if device_id == "eui-2cf7f1c04430094f":          
            measurement_value = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [{}])[0].get("measurementValue", "")
            new_data = Sensor_light_ext(
                datetime=received_at,
                value=measurement_value
            )
        elif device_id == "eui-2cf7f1c044300975":          
            measurement_value = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [{}])[0].get("measurementValue", "")
            new_data = Sensor_light_int(
                datetime=received_at,
                value=measurement_value
            )
        elif device_id == "eui-2cf7f1c044300436":
            measurement_valueCO2 = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [{}])[0].get("measurementValue", "")
            measurement_valueTemp = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [{}])[1].get("measurementValue", "")
            measurement_valueHum = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [{}])[2].get("measurementValue", "")
            new_data = Sensor_CO2TempHum_ext(
                datetime=received_at,
                valueCO2=measurement_valueCO2,
                valueTemp=measurement_valueTemp,
                valueHum=measurement_valueHum
            )
        elif device_id == "eui-2cf7f1c0443004b1":
            measurement_valueCO2 = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [{}])[0].get("measurementValue", "")
            measurement_valueTemp = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [{}])[1].get("measurementValue", "")
            measurement_valueHum = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [{}])[2].get("measurementValue", "")
            new_data = Sensor_CO2TempHum_int(
                datetime=received_at,
                valueCO2=measurement_valueCO2,
                valueTemp=measurement_valueTemp,
                valueHum=measurement_valueHum
            )
        elif device_id == "eui-2cf7f1c0435006c8":
            measurement_valueTemp = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [{}])[0].get("measurementValue", "")
            measurement_valueSM = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [{}])[1].get("measurementValue", "")
            measurement_valueEC = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [{}])[2].get("measurementValue", "")
            new_data = Sensor_SMTempEC_1(
                datetime=received_at,
                valueTemp=measurement_valueTemp,
                valueSM=measurement_valueSM,
                valueEC=measurement_valueEC
            )
        elif device_id == "eui-2cf7f1c043500707":
            measurement_valueTemp = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [{}])[0].get("measurementValue", "")
            measurement_valueSM = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [{}])[1].get("measurementValue", "")
            measurement_valueEC = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [{}])[2].get("measurementValue", "")
            new_data = Sensor_SMTempEC_2(
                datetime=received_at,
                valueTemp=measurement_valueTemp,
                valueSM=measurement_valueSM,
                valueEC=measurement_valueEC
            )
        elif device_id == "eui-2cf7f1c043500681":
            measurement_valueTemp = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [{}])[0].get("measurementValue", "")
            measurement_valueSM = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [{}])[1].get("measurementValue", "")
            measurement_valueEC = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [{}])[2].get("measurementValue", "")
            new_data = Sensor_SMTempEC_3(
                datetime=received_at,
                valueTemp=measurement_valueTemp,
                valueSM=measurement_valueSM,
                valueEC=measurement_valueEC
            )
        elif device_id == "eui-2cf7f1c0435005e6":
            measurement_valueTemp = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [{}])[0].get("measurementValue", "")
            measurement_valueSM = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [{}])[1].get("measurementValue", "")
            measurement_valueEC = data.get("uplink_message", {}).get("decoded_payload", {}).get("messages", [{}])[2].get("measurementValue", "")
            new_data = Sensor_SMTempEC_4(
                datetime=received_at,
                valueTemp=measurement_valueTemp,
                valueSM=measurement_valueSM,
                valueEC=measurement_valueEC
            )

        db.session.add(new_data)
        db.session.commit()

        return jsonify({"message": "Data added successfully"}), 200


    except Exception as e:
        print(data)
        return jsonify({"error": str(e)}), 500
