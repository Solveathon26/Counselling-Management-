import os
import hashlib
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, join_room, emit
from pymongo import MongoClient
from dotenv import load_dotenv

import joblib
import numpy as np

load_dotenv()

app = Flask(__name__)

# Load ML Model Dictionary
try:
    model_data = joblib.load(os.path.join(os.path.dirname(__file__), 'stress_model.pkl'))
    clf_model = model_data.get('clf_model')
    reg_model = model_data.get('reg_model')
    label_encoder = model_data.get('label_encoder')
    print("DEBUG ML: Model components loaded successfully.")
except Exception as e:
    clf_model = reg_model = label_encoder = None
    print(f"DEBUG ML: Model loading failed ({e}). Using dummy prediction mode.")

# Robust CORS configuration
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

@app.before_request
def log_request():
    print(f"DEBUG: {request.method} {request.path}")

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client.counselling_db

# students collection: one document per regno
# Document shape:
# {
#   regno: "42",
#   block: "Block A",
#   student_hash: sha256(regno),
#   student_entries:   [ { mood, stress, pulse_bpm, sleep_hours, social_life, ts } ],
#   parent_42:         [ { mood_obs, stress_obs, sleep_obs, ts } ],
#   friend_42:         [ { mood_obs, stress_obs, social_obs, ts } ],
# }

def hash_regno(regno):
    return hashlib.sha256(str(regno).strip().lower().encode()).hexdigest()

def safe_avg(entries, key):
    vals = [e[key] for e in entries if e.get(key) is not None]
    return round(sum(vals) / len(vals), 2) if vals else None

def recent(entries, days=7):
    cutoff = datetime.utcnow() - timedelta(days=days)
    return [e for e in entries if datetime.fromisoformat(e['ts']) >= cutoff]


# ─────────────────────────────────────────────
#  POST /api/wellbeing  — upsert single student doc
# ─────────────────────────────────────────────

@app.route('/api/wellbeing', methods=['POST'])
def log_wellbeing():
    data         = request.json
    regno        = str(data.get('regno') or data.get('student_id', '')).strip().lower()
    block        = data.get('block', '')
    submitted_by = data.get('submitted_by', 'student')   # student | parent | friend

    if not regno:
        return jsonify({"error": "regno is required"}), 400

    ts = datetime.utcnow().isoformat()

    if submitted_by == 'student':
        entry = {
            "mood":   data.get('mood_score'),
            "stress": data.get('stress_score'),
            "pulse":  data.get('pulse_bpm'),
            "sleep":  data.get('sleep_hours'),
            "social": data.get('social_life'),
            "meals_missed": data.get('meals_missed'),
            "ts":     ts
        }
        entry = {k: v for k, v in entry.items() if v is not None or k == 'ts'}

        # Calculate live ML prediction if model exists
        prediction = None
        if clf_model and label_encoder and reg_model:
            try:
                # Features: [mood, self_stress, sleep_hours, pulse, social_life, social_activity (friend avg), meals_missed]
                # Fallbacks to user's current values if no data exists
                doc = db.students.find_one({"regno": regno}) or {}
                f_entries = recent(doc.get(f"friend_{regno}", []))
                social_activity = safe_avg(f_entries, "social_obs") or data.get('social_life', 3)
                meals_missed = data.get('meals_missed', 0)
                
                features = np.array([[
                    data.get('mood_score', 3), 
                    data.get('stress_score', 2), 
                    data.get('sleep_hours', 7),
                    data.get('pulse_bpm', 72),
                    data.get('social_life', 3),
                    social_activity,
                    meals_missed
                ]])
                
                risk_lvl_idx = clf_model.predict(features)[0]
                risk_lvl = label_encoder.classes_[risk_lvl_idx] if hasattr(label_encoder, 'classes_') else str(risk_lvl_idx)
                risk_score = float(reg_model.predict(features)[0])
                
                prediction = {
                    "risk_level": risk_lvl,
                    "risk_score": round(risk_score, 2),
                    "ts": ts
                }
            except Exception as ml_err:
                print(f"ML Prediction Error: {ml_err}")

        update_fields = {"block": block, "student_hash": hash_regno(regno)}
        if prediction:
            update_fields["latest_prediction"] = prediction

        db.students.update_one(
            {"regno": regno},
            {
                "$set":  update_fields,
                "$push": {"student_entries": entry}
            },
            upsert=True
        )

    elif submitted_by == 'parent':
        entry = {
            "stress_obs": data.get('parent_stress_obs'),
            "ts":         ts
        }
        entry = {k: v for k, v in entry.items() if v is not None or k == 'ts'}

        db.students.update_one(
            {"regno": regno},
            {"$push": {f"parent_{regno}": entry}},
            upsert=True
        )

    elif submitted_by == 'friend':
        entry = {
            "stress_obs": data.get('friend_stress_obs'),
            "social_obs": data.get('friend_social_obs'),
            "ts":         ts
        }
        entry = {k: v for k, v in entry.items() if v is not None or k == 'ts'}

        db.students.update_one(
            {"regno": regno},
            {"$push": {f"friend_{regno}": entry}},
            upsert=True
        )

    else:
        return jsonify({"error": "Invalid submitted_by"}), 400

    return jsonify({"message": f"Data saved for regno {regno}."}), 201


# ─────────────────────────────────────────────
#  GET /api/students/all
# ─────────────────────────────────────────────
@app.route('/api/students/all', methods=['GET'])
def get_all_students():
    docs = list(db.students.find({}, {"regno": 1, "_id": 0}))
    return jsonify(list(set([d.get("regno") for d in docs if d.get("regno")]))), 200

# ─────────────────────────────────────────────
#  FRIENDSHIP MANAGEMENT
# ─────────────────────────────────────────────
@app.route('/api/friends/<regno>', methods=['GET'])
def get_friends(regno):
    regno = str(regno).strip().lower()
    doc = db.students.find_one({"regno": regno})
    if not doc:
        return jsonify({"friends": [], "pending_requests": []}), 200
    return jsonify({
        "friends": doc.get('friends', []),
        "pending_requests": doc.get('pending_requests', [])
    }), 200

@app.route('/api/friends/request', methods=['POST'])
def send_friend_request():
    data = request.json
    sender = str(data.get('sender', '')).strip().lower()
    target = str(data.get('target', '')).strip().lower()
    if not sender or not target or sender == target:
        return jsonify({"error": "Invalid regnos"}), 400
    db.students.update_one(
        {"regno": target},
        {"$addToSet": {"pending_requests": sender}},
        upsert=True
    )
    # socketio.emit('new_friend_request', {'sender': sender}, to=target)
    return jsonify({"message": "Request sent"}), 200

@app.route('/api/friends/approve', methods=['POST'])
def approve_friend():
    data = request.json
    user = str(data.get('user', '')).strip().lower()
    requester = str(data.get('requester', '')).strip().lower()
    if not user or not requester:
        return jsonify({"error": "Invalid regnos"}), 400
    db.students.update_one(
        {"regno": user},
        {
            "$pull": {"pending_requests": requester},
            "$addToSet": {"friends": requester}
        },
        upsert=True
    )
    db.students.update_one(
        {"regno": requester},
        {"$addToSet": {"friends": user}},
        upsert=True
    )
    # socketio.emit('friend_request_approved', {'user': user}, to=requester)
    return jsonify({"message": "Approved"}), 200

@app.route('/api/friends/reject', methods=['POST'])
def reject_friend():
    data = request.json
    user = str(data.get('user', '')).strip().lower()
    requester = str(data.get('requester', '')).strip().lower()
    db.students.update_one(
        {"regno": user},
        {"$pull": {"pending_requests": requester}}
    )
    return jsonify({"message": "Rejected"}), 200

@socketio.on('join')
def on_join(data):
    # Support both friend-based regnos and room-based video calls
    target = data.get('regno') or data.get('room')
    if target:
        join_room(target)
        print(f"DEBUG SOCKET: Joined room/user {target}")

# ─────────────────────────────────────────────
#  GET /api/wellbeing/summary/<regno>
# ─────────────────────────────────────────────

@app.route('/api/wellbeing/summary/<regno>', methods=['GET'])
def get_wellbeing_summary(regno):
    regno = str(regno).strip().lower()
    try:
        doc = db.students.find_one({"regno": regno})
        if not doc:
            return jsonify({"has_data": False}), 200

        s_entries = recent(doc.get("student_entries", []))
        p_entries = recent(doc.get(f"parent_{regno}", []))
        f_entries = recent(doc.get(f"friend_{regno}", []))

        avg_stress  = safe_avg(s_entries, 'stress')
        avg_mood    = safe_avg(s_entries, 'mood')
        is_alarming = (avg_mood is not None and avg_mood <= 2.5) or \
                    (avg_stress is not None and avg_stress >= 4.0)

        return jsonify({
            "has_data": True,
            "is_alarming": is_alarming,

            "student": {
                "count":      len(s_entries),
                "avg_mood":   avg_mood,
                "avg_stress": avg_stress,
                "avg_pulse":  safe_avg(s_entries, 'pulse'),
                "avg_sleep":  safe_avg(s_entries, 'sleep'),
                "avg_social": safe_avg(s_entries, 'social'),
            },
            "parent": {
                "count":          len(p_entries),
                "avg_mood_obs":   safe_avg(p_entries, 'mood_obs'),
                "avg_stress_obs": safe_avg(p_entries, 'stress_obs'),
                "avg_sleep_obs":  safe_avg(p_entries, 'sleep_obs'),
            },
            "friend": {
                "count":          len(f_entries),
                "avg_mood_obs":   safe_avg(f_entries, 'mood_obs'),
                "avg_stress_obs": safe_avg(f_entries, 'stress_obs'),
                "avg_social_obs": safe_avg(f_entries, 'social_obs'),
            },
            "prediction": doc.get('latest_prediction')
        }), 200
    except Exception as e:
        print(f"Error in summary for {regno}: {e}")
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
#  ANALYTICS — block level
# ─────────────────────────────────────────────
@app.route('/api/warden/alert', methods=['POST'])
def warden_alert():
    data = request.json
    db.alerts.insert_one({
        "regno": data.get('regno'),
        "message": data.get('message', 'Alert from parent'),
        "created_at": datetime.utcnow()
    })
    return jsonify({"message": "Alert sent to warden"}), 201

@app.route('/api/analytics/blocks', methods=['GET'])
def block_analytics():
    docs = list(db.students.find({}))
    blocks = {}

    for doc in docs:
        blk = doc.get('block', 'Unknown')
        entries = recent(doc.get('student_entries', []))
        if not entries:
            continue
        if blk not in blocks:
            blocks[blk] = {'moods': [], 'stresses': [], 'count': 0}
        for e in entries:
            if e.get('mood')   is not None: blocks[blk]['moods'].append(e['mood'])
            if e.get('stress') is not None: blocks[blk]['stresses'].append(e['stress'])
        blocks[blk]['count'] += len(entries)

    result = []
    for blk, data in blocks.items():
        result.append({
            "block":      blk,
            "avg_mood":   round(sum(data['moods'])/len(data['moods']), 2) if data['moods'] else 0,
            "avg_stress": round(sum(data['stresses'])/len(data['stresses']), 2) if data['stresses'] else 0,
            "total_logs": data['count']
        })
    return jsonify(result), 200


@app.route('/api/analytics/students/<block>', methods=['GET'])
def student_details_by_block(block):
    docs = list(db.students.find({"block": block}))
    result = []

    for doc in docs:
        regno    = doc.get('regno')
        entries  = recent(doc.get('student_entries', []))
        if not entries:
            continue

        avg_mood   = safe_avg(entries, 'mood')
        avg_stress = safe_avg(entries, 'stress')
        result.append({
            "regno":      regno,
            "short_id":   doc.get('student_hash', '')[:10],
            "avg_mood":   avg_mood,
            "avg_stress": avg_stress,
            "avg_pulse":  safe_avg(entries, 'pulse'),
            "avg_sleep":  safe_avg(entries, 'sleep'),
            "avg_social": safe_avg(entries, 'social'),
            "logs_count": len(entries),
            "is_alarming": (avg_mood is not None and avg_mood <= 2.5) or
                        (avg_stress is not None and avg_stress >= 4.0)
        })

    result.sort(key=lambda x: (x.get('avg_stress') or 0), reverse=True)
    return jsonify(result), 200


# ─────────────────────────────────────────────
#  COUNSELLING
# ─────────────────────────────────────────────

@app.route('/api/counselling/book', methods=['POST'])
def book_counselling():
    data   = request.json
    regno  = str(data.get('student_id') or data.get('regno')).strip().lower()
    date   = data.get('date')
    is_sos = data.get('is_sos', False)
    c_name = data.get('counsellor_name', 'System Assigned')
    db.appointments.insert_one({
        "regno":           regno,
        "date":            date,
        "is_sos":          is_sos,
        "counsellor_name": c_name,
        "status":          "pending",
        "created_at":      datetime.utcnow()
    })
    return jsonify({"message": "Appointment booked"}), 201


@app.route('/api/counselling/appointments', methods=['GET'])
def get_appointments():
    appointments = list(db.appointments.find({}, {"_id": 0}))
    return jsonify(appointments), 200

@app.route('/api/counselling/my_students/<counsellor_name>', methods=['GET'])
def get_my_students(counsellor_name):
    from urllib.parse import unquote
    counsellor_name = unquote(counsellor_name)
    try:
        apts = list(db.appointments.find({"counsellor_name": counsellor_name}))
        regnos = list(set([a['regno'] for a in apts]))
        
        result = []
        for regno in regnos:
            doc = db.students.find_one({"regno": regno})
            if not doc:
                continue
            entries = recent(doc.get('student_entries', []))
            avg_mood = safe_avg(entries, 'mood')
            avg_stress = safe_avg(entries, 'stress')
            p_entries = recent(doc.get(f"parent_{regno}", []))
            pred = doc.get('latest_prediction', {})
            result.append({
                "regno": regno,
                "avg_mood": avg_mood,
                "avg_stress": avg_stress,
                "parent_stress": safe_avg(p_entries, 'stress_obs'),
                "is_alarming": (avg_mood is not None and avg_mood <= 2.5) or (avg_stress is not None and avg_stress >= 4.0),
                "ml_risk": pred.get('risk_level', 'N/A'),
                "ml_score": pred.get('risk_score', 'N/A'),
                "meals_missed": safe_avg(entries, 'meals_missed') or 0,
                "classes_skipped": 0, # Placeholder for future feature
                "parents_contact": f"parent_{regno}@university.edu"
            })
        return jsonify(result), 200
    except Exception as e:
        print(f"Error yielding students for {counsellor_name}: {e}")
        return jsonify([]), 200 # Fallback to empty list instead of crashing


# ─────────────────────────────────────────────
#  COUNSELLOR PROFILES
# ─────────────────────────────────────────────

@app.route('/api/counsellors/profile', methods=['POST'])
def update_counsellor_profile():
    data = request.json
    clerk_id = data.get('clerk_id')
    name = data.get('name', 'Anonymous Counsellor')
    spec = data.get('specialization', 'General Support')
    role = data.get('role', 'counsellor')
    
    if not clerk_id:
        return jsonify({"error": "clerk_id is required"}), 400

    db.counsellors.update_one(
        {"clerk_id": clerk_id},
        {"$set": {"clerk_id": clerk_id, "name": name, "specialization": spec, "role": role, "updated_at": datetime.utcnow()}},
        upsert=True
    )
    return jsonify({"message": "Profile updated"}), 200


@app.route('/api/counsellors', methods=['GET'])
def list_counsellors():
    counsellors = list(db.counsellors.find({"role": "counsellor"}, {"_id": 0}))
    return jsonify(counsellors), 200

# ─────────────────────────────────────────────
#  USER LINKAGE (Student/Parent Mapping)
# ─────────────────────────────────────────────

@app.route('/api/users/link', methods=['POST'])
def link_user():
    data = request.json
    clerk_id = data.get('clerk_id')
    role = data.get('role')
    linked_regno = data.get('linked_regno')

    if not clerk_id or not role:
        return jsonify({"error": "clerk_id and role are required"}), 400

    db.user_links.update_one(
        {"clerk_id": clerk_id},
        {"$set": {"clerk_id": clerk_id, "role": role, "linked_regno": linked_regno}},
        upsert=True
    )
    return jsonify({"message": "User linked successfully"}), 200

@app.route('/api/users/meta/<clerk_id>', methods=['GET'])
def get_user_meta(clerk_id):
    link = db.user_links.find_one({"clerk_id": clerk_id}, {"_id": 0})
    if not link:
        return jsonify({"role": "student"}), 200 # Default
    return jsonify(link), 200


# ─────────────────────────────────────────────
#  ML PLACEHOLDER
# ─────────────────────────────────────────────

@app.route('/api/ml/predict', methods=['GET'])
def predict_stress():
    try:
        students = list(db.students.find({"latest_prediction": {"$exists": True}}))
        results = []
        for s in students:
            pred = s['latest_prediction']
            results.append({
                "regno": s['regno'],
                "student_hash": s['student_hash'],
                "risk_level": pred['risk_level'],
                "risk_score": pred['risk_score'],
                "reason": f"Predicted based on last check-in at {pred['ts'][:10]}"
            })
    except Exception as e:
        print(f"Error fetching ML predictions: {e}")
        results = []

    # Add dummy if no data (to keep UI occupied)
    if not results:
        results = [
            {"regno": "demo-01", "student_hash": hash_regno("demo-01"), "risk_level": "High",   "reason": "Wait for student check-ins for real-time data."}
        ]
    return jsonify(results), 200


# ─────────────────────────────────────────────
#  COMPLAINTS (Anonymous)
# ─────────────────────────────────────────────

@app.route('/api/complaints', methods=['POST'])
def submit_complaint():
    data = request.json
    block = data.get('block', 'Unknown')
    message = data.get('message', '').strip()
    
    if not message:
        return jsonify({"error": "Message is required"}), 400

    db.complaints.insert_one({
        "block": block,
        "message": message,
        "created_at": datetime.utcnow().isoformat()
    })
    return jsonify({"message": "Complaint submitted anonymously"}), 201

@app.route('/api/complaints', methods=['GET'])
def get_complaints():
    complaints = list(db.complaints.find({}, {"_id": 0}))
    complaints.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return jsonify(complaints), 200

if __name__ == '__main__':
    socketio.run(app, port=5000, debug=True, use_reloader=True, allow_unsafe_werkzeug=True)
