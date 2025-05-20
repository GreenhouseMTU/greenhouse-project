from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token
from models import User

auth_app = Blueprint('auth_app', __name__)

# Register
@auth_app.route('/api/users', methods=['POST'])
def add_user():
    db = current_app.db
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

    return jsonify({'message': 'User added successfully'}), 201

# Login
@auth_app.route('/api/login', methods=['POST'])
def login():
    db = current_app.db
    username = request.json.get('username')
    password = request.json.get('password')

    user = db.session.query(User).filter_by(username=username).first()

    if user and user.check_password(password):
        access_token = create_access_token(identity=user.username)
        return jsonify({'access_token': access_token}), 200
    else:
        return jsonify({'message': 'Invalid credentials'}), 401
