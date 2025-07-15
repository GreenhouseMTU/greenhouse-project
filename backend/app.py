import json
from flask import Flask, Blueprint, jsonify, request
from db import db  # <-- change ici
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_cors import CORS
import logging
from datetime import timedelta

# Configurer le logging
logging.basicConfig(level=logging.DEBUG)

migrate = Migrate()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    app.db = db

    # Configuration détaillée de CORS
    CORS(app, resources={r"/api/*": {"origins": "http://localhost:8079"}})

    # Database config
    app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:adminNIMBUS-1@db:3306/greenhouse'
    app.config['JWT_SECRET_KEY'] = 'tHe_greeN_House_KEY'
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=6)

    # Initialiser db avec l'application
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # Importer les modèles après l'init de db
    with app.app_context():
        import models
        from models import (
            Sensor_light_ext, Sensor_light_int,
            Sensor_CO2TempHum_ext, Sensor_CO2TempHum_int,
            Sensor_SMTempEC_1, Sensor_SMTempEC_2, Sensor_SMTempEC_3, Sensor_SMTempEC_4
        )

    # Blueprint pour les données des capteurs
    sensor_data_app = Blueprint('sensor_data_app', __name__)

    def get_sensor_data_internal():
        # Récupérer les données de chaque type de capteur
        light_ext = Sensor_light_ext.query.all()
        light_int = Sensor_light_int.query.all()
        co2_temp_hum_ext = Sensor_CO2TempHum_ext.query.all()
        co2_temp_hum_int = Sensor_CO2TempHum_int.query.all()
        sm_temp_ec_1 = Sensor_SMTempEC_1.query.all()
        sm_temp_ec_2 = Sensor_SMTempEC_2.query.all()
        sm_temp_ec_3 = Sensor_SMTempEC_3.query.all()
        sm_temp_ec_4 = Sensor_SMTempEC_4.query.all()

        # Convertir en format sérialisé
        sensors = {
            'light': [sensor.serialize() for sensor in light_ext + light_int],
            'env': [sensor.serialize() for sensor in co2_temp_hum_ext + co2_temp_hum_int],
            'soil': [sensor.serialize() for sensor in sm_temp_ec_1 + sm_temp_ec_2 + sm_temp_ec_3 + sm_temp_ec_4]
        }

        return sensors

    @sensor_data_app.route('/sensor-data', methods=['GET', 'OPTIONS'])
    def get_sensor_data():
        if request.method == 'OPTIONS':
            response = app.make_response('')
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8079')
            response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
            response.headers.add('Access-Control-Allow-Headers', 'Authorization, Content-Type')
            return response

        try:
            sensors = get_sensor_data_internal()
            response = jsonify(sensors)
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8079')
            return response
        except Exception as e:
            logging.error(f"Erreur dans get_sensor_data: {str(e)}")
            response = jsonify({'error': 'Une erreur est survenue côté serveur', 'details': str(e)})
            response.status_code = 500
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8079')
            return response

    # Enregistrer le blueprint avec l'application
    app.register_blueprint(sensor_data_app, url_prefix='/api')

    # Importer et enregistrer les autres blueprints dans le contexte
    with app.app_context():
        from ttn import ttn_app
        app.register_blueprint(ttn_app)

        from auth import auth_app
        app.register_blueprint(auth_app, url_prefix='/api')


        from sensors.sensorLightExt import sensor_light_ext_app
        app.register_blueprint(sensor_light_ext_app)

        from sensors.sensorLightInt import sensor_light_int_app
        app.register_blueprint(sensor_light_int_app)

        from sensors.sensorCO2TempHumExt import sensor_co2temphum_ext_app
        app.register_blueprint(sensor_co2temphum_ext_app)

        from sensors.sensorCO2TempHumInt import sensor_co2temphum_int_app
        app.register_blueprint(sensor_co2temphum_int_app)

        from sensors.sensorSMTempEC_1 import sensor_smtempec_1_app
        app.register_blueprint(sensor_smtempec_1_app)

        from sensors.sensorSMTempEC_2 import sensor_smtempec_2_app
        app.register_blueprint(sensor_smtempec_2_app)

        from sensors.sensorSMTempEC_3 import sensor_smtempec_3_app
        app.register_blueprint(sensor_smtempec_3_app)

        from sensors.sensorSMTempEC_4 import sensor_smtempec_4_app
        app.register_blueprint(sensor_smtempec_4_app)

    return app

if __name__ == '__main__':
    app = create_app()
    if app:
        app.run(host="0.0.0.0", port=8080)
    else:
        print("Application have not be initialized due to a configuration issue.")