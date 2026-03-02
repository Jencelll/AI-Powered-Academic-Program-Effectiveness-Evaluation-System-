
import sys
import os
import json
from datetime import datetime
from app import app, db, FacultyUpload, SubjectAnalysis, AnalyticsData

def test_limit():
    with app.app_context():
        # Clear existing for clean test? No, let's just add 6 new unique ones.
        print(f"Initial count: {FacultyUpload.query.count()}")

        base_name = f"TestFaculty_{int(datetime.now().timestamp())}"
        
        created_ids = []
        for i in range(1, 7): # Create 6 uploads
            f_name = f"{base_name}_{i}"
            print(f"Creating upload for {f_name}")
            
            # Create FacultyUpload
            upload = FacultyUpload(
                faculty_name=f_name,
                file_paths=json.dumps({
                    'metadata': {
                        'program': 'BSIT', 
                        'semester': '1st Semester',
                        'year': '2024-2025',
                        'idempotency_key': f"key_{i}" # Unique keys
                    }
                }),
                academic_year='2024-2025',
                analysis_date=datetime.now()
            )
            db.session.add(upload)
            db.session.commit()
            created_ids.append(upload.id)
            
            # Create dummy SubjectAnalysis (needed for some filters?)
            sa = SubjectAnalysis(
                upload_id=upload.id,
                course=f"IT {i}01",
                # section=f"BSIT {i}A", # Removed invalid field
                enrolled=30,
                passed=25,
                failed=5,
                pass_rate=83.33,
                program=f"BSIT {i}A" # Use program as section
            )
            db.session.add(sa)
            
            # Create dummy AnalyticsData
            ad = AnalyticsData(
                upload_id=upload.id,
                data_type='detailed_analytics_output',
                data_content="Dummy content",
                analysis_date=datetime.now()
            )
            db.session.add(ad)
            db.session.commit()

        print(f"Post-insert count: {FacultyUpload.query.count()}")

        # Now call the function logic (or hit the endpoint via test client)
        with app.test_client() as client:
            resp = client.get('/api/analysis/by-faculty')
            data = resp.get_json()
            
            faculties = data.get('faculties', [])
            print(f"API returned {len(faculties)} faculties")
            
            # Check if our test faculties are there
            found_count = 0
            for f in faculties:
                if base_name in f['faculty_name']:
                    found_count += 1
            
            print(f"Found {found_count} of our test faculties")
            
            if found_count == 6:
                print("SUCCESS: No limit detected in Backend.")
            else:
                print(f"FAILURE: Expected 6, found {found_count}.")

            # 2. Check Dashboard Data (recent_uploads limit)
            print("\nTesting /api/dashboard limit...")
            res = client.get('/api/dashboard')
            if res.status_code == 200:
                data = res.get_json()
                recent = data.get('recent_uploads', [])
                print(f"Dashboard returned {len(recent)} recent uploads")
                if len(recent) >= 6:
                    print("✅ Dashboard limit verified (>= 6)")
                else:
                    print(f"❌ Dashboard limit might be too low (got {len(recent)}, expected >= 6)")
            else:
                print(f"❌ Failed to fetch dashboard: {res.status_code}")

        print("\nTest Complete.")

        # Cleanup
        for uid in created_ids:
            FacultyUpload.query.filter_by(id=uid).delete()
            SubjectAnalysis.query.filter_by(upload_id=uid).delete()
            AnalyticsData.query.filter_by(upload_id=uid).delete()
        db.session.commit()
        print("Cleanup done.")

if __name__ == "__main__":
    test_limit()
