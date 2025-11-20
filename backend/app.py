from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
import os
from werkzeug.security import generate_password_hash, check_password_hash
import cv2
import numpy as np
from datetime import datetime, timedelta
from functools import wraps
from jose import jwt
import tempfile

app = Flask(__name__)
CORS(app)

# Configuration
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///proctoring.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'your-jwt-secret-key'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['UPLOAD_FOLDER'] = tempfile.gettempdir()

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)

# Models
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    is_student = db.Column(db.Boolean, default=True)
    tests = db.relationship('Test', backref='student', lazy=True)

class Test(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime)
    status = db.Column(db.String(20), default='in_progress')
    suspicious_activities = db.Column(db.Integer, default=0)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.get(data['user_id'])
        except:
            return jsonify({'message': 'Token is invalid'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated

# Routes
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    is_student = data.get('is_student', True)

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400

    user = User(
        username=username,
        password_hash=generate_password_hash(password),
        is_student=is_student
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({'message': 'User created successfully'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()

    if user and check_password_hash(user.password_hash, data.get('password')):
        token = jwt.encode({
            'user_id': user.id,
            'exp': datetime.utcnow() + app.config['JWT_ACCESS_TOKEN_EXPIRES']
        }, app.config['JWT_SECRET_KEY'], algorithm='HS256')
        
        return jsonify({
            'message': 'Logged in successfully',
            'token': token
        }), 200

    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/tests', methods=['GET'])
@token_required
def get_tests(current_user):
    tests = Test.query.filter_by(student_id=current_user.id).all()
    return jsonify([{
        'id': test.id,
        'start_time': test.start_time.isoformat(),
        'end_time': test.end_time.isoformat() if test.end_time else None,
        'status': test.status,
        'suspicious_activities': test.suspicious_activities
    } for test in tests])

@app.route('/api/start-test', methods=['POST'])
@token_required
def start_test(current_user):
    if not current_user.is_student:
        return jsonify({'error': 'Only students can start tests'}), 403

    test = Test(
        student_id=current_user.id,
        start_time=datetime.utcnow()
    )
    db.session.add(test)
    db.session.commit()

    return jsonify({'test_id': test.id}), 201

@app.route('/api/end-test/<int:test_id>', methods=['POST'])
@token_required
def end_test(current_user, test_id):
    test = Test.query.filter_by(id=test_id, student_id=current_user.id).first()
    if not test:
        return jsonify({'error': 'Test not found'}), 404

    test.end_time = datetime.utcnow()
    test.status = 'completed'
    db.session.commit()

    return jsonify({'message': 'Test ended successfully'}), 200

@app.route('/api/process-image', methods=['POST'])
@token_required
def process_image(current_user):
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    try:
        # Save the uploaded image temporarily
        image_file = request.files['image']
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], 'temp_image.jpg')
        image_file.save(temp_path)

        # Process the image
        image = cv2.imread(temp_path)
        if image is None:
            return jsonify({'error': 'Unable to load image'}), 400

        # Resize the image to 640x480
        resized_image = cv2.resize(image, (640, 480))
        
        # Convert to grayscale
        grayscale_image = cv2.cvtColor(resized_image, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur for noise reduction
        noise_reduced_image = cv2.GaussianBlur(grayscale_image, (5, 5), 0)
        
        # Apply Canny edge detection
        edges = cv2.Canny(noise_reduced_image, 50, 150)

        # Detect faces
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        face_cascade = cv2.CascadeClassifier(cascade_path)
        if face_cascade.empty():
            raise RuntimeError(f"Unable to load face cascade from {cascade_path}")
        faces = face_cascade.detectMultiScale(
            grayscale_image,
            scaleFactor=1.1,
            minNeighbors=7,
            minSize=(40, 40)
        )

        def filter_faces(face_list, frame_shape):
            height, width = frame_shape[:2]
            frame_area = float(width * height)
            min_area_ratio = 0.02
            max_area_ratio = 0.45
            min_aspect_ratio = 0.75
            max_aspect_ratio = 1.35

            filtered = []
            for (x, y, w, h) in face_list:
                area_ratio = (w * h) / frame_area
                aspect_ratio = w / float(h)
                if not (min_area_ratio <= area_ratio <= max_area_ratio):
                    continue
                if not (min_aspect_ratio <= aspect_ratio <= max_aspect_ratio):
                    continue
                if y < 10 or x < 10:
                    # likely noisy detections along the border
                    continue
                filtered.append((x, y, w, h))
            return filtered

        filtered_faces = filter_faces(faces, resized_image.shape)

        # Analyze the edges for suspicious activity
        # Here we're using a simple heuristic: if there are too many edges, it might indicate movement
        edge_density = np.sum(edges > 0) / (edges.shape[0] * edges.shape[1])
        movement_threshold = 0.3
        suspicious_activity = edge_density > movement_threshold  # Adjust this threshold as needed
        activity_confidence = min(edge_density / movement_threshold, 1.0)

        # Update test record if suspicious activity is detected
        if suspicious_activity:
            test = Test.query.filter_by(student_id=current_user.id, status='in_progress').first()
            if test:
                test.suspicious_activities += 1
                db.session.commit()

        # Clean up temporary file
        os.remove(temp_path)

        return jsonify({
            'edge_density': float(edge_density),
            'suspicious_activity': bool(suspicious_activity),
            'activity_confidence': float(activity_confidence),
            'faces_detected': len(filtered_faces),
            'face_boxes': [{'x': int(x), 'y': int(y), 'w': int(w), 'h': int(h)} for (x, y, w, h) in filtered_faces],
            'processed_at': datetime.utcnow().isoformat() + 'Z'
        }), 200

    except Exception as e:
        return jsonify({'error': f'Error processing image: {str(e)}'}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True) 