
from app import app, db, FacultyUpload, SubjectAnalysis, AnalyticsData
import json
from datetime import datetime
import pytz

def test_year_logic():
    with app.app_context():
        # 1. Create a test upload with explicit academic_year
        print("--- Creating Test Upload ---")
        u = FacultyUpload(
            faculty_name="Test Faculty Year",
            file_paths=json.dumps({'metadata': {'program': 'BSIT'}}),
            academic_year="2024-2025"
        )
        db.session.add(u)
        db.session.commit()
        print(f"Created Upload ID: {u.id}, Year: {u.academic_year}")

        # 2. Verify persistence
        fetched = FacultyUpload.query.get(u.id)
        print(f"Fetched Year: {fetched.academic_year}")

        # 3. Test get_analysis_by_faculty logic
        print("--- Testing Display Logic ---")
        display_year = fetched.academic_year
        if not display_year:
            print("Fallback 1: Metadata")
            # ...
        
        print(f"Display Year (Raw): {display_year}")
        
        # Cleanup
        db.session.delete(u)
        db.session.commit()
        print("--- Cleanup Done ---")

if __name__ == "__main__":
    test_year_logic()
