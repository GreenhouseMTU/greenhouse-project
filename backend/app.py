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
    app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:adminNIMBUS-1@localhost:3306/greenhouse'
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

    # --- Gestion des tâches utilisateur ---
    from flask_jwt_extended import jwt_required, get_jwt_identity
    from models import Task

    tasks_app = Blueprint('tasks_app', __name__)

    @tasks_app.route('/api/tasks', methods=['GET'])
    @jwt_required()
    def get_tasks():
        user_id = get_jwt_identity()
        tasks = Task.query.filter_by(user_id=user_id).all()
        return jsonify([task.serialize() for task in tasks])

    @tasks_app.route('/api/tasks', methods=['POST'])
    @jwt_required()
    def add_task():
        user_id = get_jwt_identity()
        data = request.json
        task = Task(
            title=data['title'],
            description=data.get('description', ''),
            date=data['date'],
            time=data['time'],
            priority=data.get('priority', 'medium'),
            category=data.get('category', 'other'),
            color=data.get('color', 'purple'),
            user_id=user_id
        )
        db.session.add(task)
        db.session.commit()
        return jsonify(task.serialize()), 201

    @tasks_app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
    @jwt_required()
    def delete_task(task_id):
        user_id = get_jwt_identity()
        task = Task.query.filter_by(id=task_id, user_id=user_id).first()
        if not task:
            return jsonify({'error': 'Task not found'}), 404
        db.session.delete(task)
        db.session.commit()
        return jsonify({'result': 'deleted'})

    app.register_blueprint(tasks_app)

    return app

if __name__ == '__main__':
    app = create_app()
    if app:
        app.run(host="0.0.0.0", port=8080)
    else:
        print("Application have not be initialized due to a configuration issue.")