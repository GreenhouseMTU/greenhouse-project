from db import db
from werkzeug.security import generate_password_hash, check_password_hash

# This file contain all the class of the projects who are also used to create the database

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(128), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Sensor_light_ext(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    datetime = db.Column(db.DateTime, nullable=False)
    value = db.Column(db.Integer, nullable=False)

    def serialize(self):
        return {
            'id': self.id,
            'datetime': self.datetime.strftime('%Y-%m-%d %H:%M:%S'),
            'value': self.value,
        }
    
class Sensor_light_int(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    datetime = db.Column(db.DateTime, nullable=False)
    value = db.Column(db.Integer, nullable=False)

    def serialize(self):
        return {
            'id': self.id,
            'datetime': self.datetime.strftime('%Y-%m-%d %H:%M:%S'),
            'value': self.value,
        }

class Sensor_CO2TempHum_ext(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    datetime = db.Column(db.DateTime, nullable=False)
    valueCO2 = db.Column(db.Integer, nullable=False)
    valueTemp = db.Column(db.Double, nullable=False)
    valueHum = db.Column(db.Double, nullable=False)

    def serialize(self):
        return {
            'id': self.id,
            'datetime': self.datetime.strftime('%Y-%m-%d %H:%M:%S'),
            'valueCO2': self.valueCO2,
            'valueTemp': self.valueTemp,
            'valueHum': self.valueHum,
        }
    
class Sensor_CO2TempHum_int(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    datetime = db.Column(db.DateTime, nullable=False)
    valueCO2 = db.Column(db.Integer, nullable=False)
    valueTemp = db.Column(db.Double, nullable=False)
    valueHum = db.Column(db.Double, nullable=False)

    def serialize(self):
        return {
            'id': self.id,
            'datetime': self.datetime.strftime('%Y-%m-%d %H:%M:%S'),
            'valueCO2': self.valueCO2,
            'valueTemp': self.valueTemp,
            'valueHum': self.valueHum,
        }
    
class Sensor_SMTempEC_1(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    datetime = db.Column(db.DateTime, nullable=False)
    valueSM = db.Column(db.Double, nullable=False)
    valueTemp = db.Column(db.Double, nullable=False)
    valueEC = db.Column(db.Double, nullable=False)

    def serialize(self):
        return {
            'id': self.id,
            'datetime': self.datetime.strftime('%Y-%m-%d %H:%M:%S'),  # <-- conversion ici
            'valueSM': self.valueSM,
            'valueTemp': self.valueTemp,
            'valueEC': self.valueEC
        }
    
class Sensor_SMTempEC_2(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    datetime = db.Column(db.DateTime, nullable=False)
    valueSM = db.Column(db.Double, nullable=False)
    valueTemp = db.Column(db.Double, nullable=False)
    valueEC = db.Column(db.Double, nullable=False)

    def serialize(self):
        return {
            'id': self.id,
            'datetime': self.datetime.strftime('%Y-%m-%d %H:%M:%S'),  # <-- conversion ici
            'valueSM': self.valueSM,
            'valueTemp': self.valueTemp,
            'valueEC': self.valueEC
        }
    
class Sensor_SMTempEC_3(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    datetime = db.Column(db.DateTime, nullable=False)
    valueSM = db.Column(db.Double, nullable=False)
    valueTemp = db.Column(db.Double, nullable=False)
    valueEC = db.Column(db.Double, nullable=False)

    def serialize(self):
        return {
            'id': self.id,
            'datetime': self.datetime.strftime('%Y-%m-%d %H:%M:%S'),  # <-- conversion ici
            'valueSM': self.valueSM,
            'valueTemp': self.valueTemp,
            'valueEC': self.valueEC
        }
    
class Sensor_SMTempEC_4(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    datetime = db.Column(db.DateTime, nullable=False)
    valueSM = db.Column(db.Double, nullable=False)
    valueTemp = db.Column(db.Double, nullable=False)
    valueEC = db.Column(db.Double, nullable=False)

    def serialize(self):
        return {
            'id': self.id,
            'datetime': self.datetime.strftime('%Y-%m-%d %H:%M:%S'),  # <-- conversion ici
            'valueSM': self.valueSM,
            'valueTemp': self.valueTemp,
            'valueEC': self.valueEC
        }

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    date = db.Column(db.Date, nullable=False)
    time = db.Column(db.String(20), nullable=False)
    priority = db.Column(db.String(20))
    category = db.Column(db.String(50))
    color = db.Column(db.String(20))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

    def serialize(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'date': self.date.isoformat(),
            'time': self.time,
            'priority': self.priority,
            'category': self.category,
            'color': self.color,
            'user_id': self.user_id
        }