
from app import app, db, FacultyUpload, SubjectAnalysis
import json

with app.app_context():
    uploads = FacultyUpload.query.all()
    for u in uploads:
        print(f"Upload ID: {u.id}")
        subjects = SubjectAnalysis.query.filter_by(upload_id=u.id).all()
        for s in subjects:
            print(f"  Subject: {s.course}, Program: '{s.program}', Enrolled: {s.enrolled}, Passed: {s.passed}")
