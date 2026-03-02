
from app import app, db, FacultyUpload
with app.app_context():
    uploads = FacultyUpload.query.order_by(FacultyUpload.id.desc()).limit(5).all()
    print("--- Last 5 Uploads ---")
    for u in uploads:
        print(f"ID: {u.id}, Name: {u.faculty_name}, Year: {u.academic_year}, Date: {u.analysis_date}")
