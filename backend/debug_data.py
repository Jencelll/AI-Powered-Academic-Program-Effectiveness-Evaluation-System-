
from app import app, db, FacultyUpload, SubjectAnalysis
import json

with app.app_context():
    uploads = FacultyUpload.query.all()
    print(f"Total uploads: {len(uploads)}")
    for u in uploads:
        print(f"Upload ID: {u.id}, Faculty: {u.faculty_name}")
        print(f"  File Paths: {u.file_paths}")
        try:
            meta = json.loads(u.file_paths or '{}')
            m = meta.get('metadata', {})
            print(f"  Parsed Metadata: Year={m.get('academic_year') or m.get('year')}, Sem={m.get('semester')}")
        except Exception as e:
            print(f"  Metadata parse error: {e}")
        
        subjects = SubjectAnalysis.query.filter_by(upload_id=u.id).all()
        print(f"  Linked Subjects: {len(subjects)}")
        if subjects:
            print(f"  Sample Subject: {subjects[0].course} (Enrolled: {subjects[0].enrolled})")
