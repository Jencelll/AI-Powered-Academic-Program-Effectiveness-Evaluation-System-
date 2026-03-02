
from app import app, db, FacultyUpload
import json

with app.app_context():
    uploads = FacultyUpload.query.all()
    for u in uploads:
        try:
            meta = json.loads(u.file_paths or '{}')
            m = meta.get('metadata', {})
            current_sem = m.get('semester')
            if current_sem == '2nd':
                print(f"Updating Upload {u.id} semester from '2nd' to '2nd Semester'")
                m['semester'] = '2nd Semester'
                meta['metadata'] = m
                u.file_paths = json.dumps(meta)
        except Exception as e:
            print(f"Error updating upload {u.id}: {e}")
    
    db.session.commit()
    print("Update complete.")
