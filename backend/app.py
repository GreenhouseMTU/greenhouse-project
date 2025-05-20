import json
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate

#init
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)

    # Database config
    app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:adminNIMBUS-1@db-greenhouse/greenhouse'
    app.config['JWT_SECRET_KEY'] = 'tHe_greeN_House_KEY'


    db.init_app(app)
    app.db = db
    migrate.init_app(app, db)
    jwt.init_app(app)

    from ttn import ttn_app
    app.register_blueprint(ttn_app)

    from auth import auth_app
    app.register_blueprint(auth_app)

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


