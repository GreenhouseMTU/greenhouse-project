from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token
from models import User
from db import db

auth_app = Blueprint('auth_app', __name__)

# Register
@auth_app.route('/users', methods=['POST', 'OPTIONS'])
def add_user():
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'CORS preflight successful'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8079')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Authorization, Content-Type')
        return response

    new_user_data = request.json
    username = new_user_data.get('username')
    password = new_user_data.get('password')

    if not username or not password:
        return jsonify({'message': 'Username and password are required'}), 400

    existing_user = db.session.query(User).filter_by(username=username).first()
    if existing_user:
        return jsonify({'message': 'Username already exists'}), 409

    new_user = User(username=username)
    new_user.set_password(password)
    
    db.session.add(new_user)
    db.session.commit()

    response = jsonify({'message': 'User added successfully'})
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8079')
    return response, 201


@auth_app.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'CORS preflight successful'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8079')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Authorization, Content-Type')
        return response

    username = request.json.get('username')
    password = request.json.get('password')

    user = db.session.query(User).filter_by(username=username).first()

    if user and user.check_password(password):
        access_token = create_access_token(identity=user.id)
        response = jsonify({'access_token': access_token})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8079')
        return response
    else:
        response = jsonify({'message': 'Invalid credentials'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8079')
        return response, 401
