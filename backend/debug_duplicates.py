
from app import app, db
from models import SubjectAccomplishment, SubjectAnalysis

with app.app_context():
    # Check SubjectAccomplishment directly
    all_acc = SubjectAccomplishment.query.all()
    print(f"Total SubjectAccomplishment records (raw): {len(all_acc)}")
    for acc in all_acc:
        print(f"  ID: {acc.id}, SubjCode: {acc.subject_code}, AnalysisID: {acc.subject_analysis_id}")
        print(f"    Weakness: {acc.weakness[:20] if acc.weakness else 'None'}")

    # Check SubjectAnalysis records
    courses = SubjectAnalysis.query.all()
    print(f"Total SubjectAnalysis records: {len(courses)}")
    for c in courses:
        print(f"  ID: {c.id}, Course: {c.course}, Program: {c.program}, Reviews: {len(c.internal_reviews)}")
