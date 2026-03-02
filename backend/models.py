from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone, timedelta

MANILA_TZ = timezone(timedelta(hours=8))
UTC_TZ = timezone.utc

def to_manila_iso(dt: datetime):
    if dt is None:
        return datetime.now(MANILA_TZ).isoformat()
    base = dt
    if base.tzinfo is None:
        base = base.replace(tzinfo=UTC_TZ)
    return base.astimezone(MANILA_TZ).isoformat()

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(120), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'Admin' | 'Faculty' | 'Student'
    password_hash = db.Column(db.String(255), nullable=False)
    active = db.Column(db.Boolean, default=True)
    # Profile fields
    full_name = db.Column(db.String(255))
    faculty_id = db.Column(db.String(64), unique=True)
    student_id = db.Column(db.String(64), unique=True)
    program = db.Column(db.String(120))  # e.g., BSIT / BSCS
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_public(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'active': self.active,
            'created_at': self.created_at.isoformat(),
            'full_name': self.full_name,
            'faculty_id': self.faculty_id,
            'student_id': self.student_id,
            'program': self.program,
        }

    def __repr__(self):
        return f'<User {self.username} ({self.role})>'

class FacultyUpload(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    faculty_name = db.Column(db.String(200), nullable=False)
    analysis_date = db.Column(db.DateTime, default=datetime.utcnow)
    file_paths = db.Column(db.Text)  # Store as JSON string if needed
    academic_year = db.Column(db.String(20)) # Explicit column for academic year

    # Relationship to SubjectAnalysis
    subjects = db.relationship('SubjectAnalysis', backref='upload', lazy=True)

    def to_dict(self):
        try:
            import json as _json
            meta = _json.loads(self.file_paths or '{}')
            m = (meta.get('metadata') or {})
            program = m.get('program')
            semester = m.get('semester')
            academic_year = self.academic_year or m.get('academic_year')
        except Exception:
            program = None
            semester = None
            academic_year = self.academic_year
        return {
            'id': self.id,
            'faculty_name': self.faculty_name,
            'analysis_date': to_manila_iso(self.analysis_date),
            'program': program,
            'semester': semester,
            'academic_year': academic_year,
        }

    def __repr__(self):
        return f'<FacultyUpload {self.faculty_name} - {self.analysis_date}>'


class IdempotencyKey(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(128), unique=True, nullable=False)
    upload_id = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<IdempotencyKey {self.key} -> {self.upload_id}>'

class SubjectAnalysis(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    upload_id = db.Column(db.Integer, db.ForeignKey('faculty_upload.id'), nullable=False)
    course = db.Column(db.String(200), nullable=False)
    program = db.Column(db.String(200)) # e.g., BSIT IIA
    enrolled = db.Column(db.Integer, nullable=False)
    passed = db.Column(db.Integer, nullable=False)
    failed = db.Column(db.Integer, nullable=False)
    pass_rate = db.Column(db.Float, nullable=False)
    num_def = db.Column(db.Integer, default=0)
    recommendation = db.Column(db.Text)

    # New relationship for accomplishment details
    internal_reviews = db.relationship('SubjectAccomplishment', backref='analysis', lazy=True)
    analysis_date = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'upload_id': self.upload_id,
            'course': self.course,
            'program': self.program,
            'enrolled': self.enrolled,
            'passed': self.passed,
            'failed': self.failed,
            'pass_rate': self.pass_rate,
            'num_def': self.num_def,
            'recommendation': self.recommendation,
            'analysis_date': to_manila_iso(self.analysis_date),
            'internal_reviews': [r.to_dict() for r in self.internal_reviews] if self.internal_reviews else []
        }

    def __repr__(self):
        return f'<SubjectAnalysis {self.course} - {self.upload_id}>'

class SubjectAccomplishment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # Link to SubjectAnalysis if available, otherwise loose coupling via subject code
    subject_analysis_id = db.Column(db.Integer, db.ForeignKey('subject_analysis.id'), nullable=True)
    
    # Store the extracted fields
    subject_code = db.Column(db.String(200), nullable=True) # Extracted subject code/name
    weakness = db.Column(db.Text, nullable=True)
    action_taken = db.Column(db.Text, nullable=True)
    recommendation = db.Column(db.Text, nullable=True)
    
    # Metadata
    upload_id = db.Column(db.Integer, nullable=True) # Link to FacultyUpload if needed
    academic_year = db.Column(db.String(20)) # Added for filtering
    semester = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'subject_code': self.subject_code,
            'weakness': self.weakness,
            'action_taken': self.action_taken,
            'recommendation': self.recommendation,
            'academic_year': self.academic_year,
            'semester': self.semester,
            'created_at': to_manila_iso(self.created_at)
        }

# Optional: Model for storing analytics data if needed separately
class AnalyticsData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    upload_id = db.Column(db.Integer, db.ForeignKey('faculty_upload.id'), nullable=False)
    data_type = db.Column(db.String(200), nullable=False) # e.g., 'gender_analysis', 'precision_score'
    data_content = db.Column(db.Text, nullable=False) # Store as JSON string
    analysis_date = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'upload_id': self.upload_id,
            'data_type': self.data_type,
            'data_content': self.data_content,
            'analysis_date': to_manila_iso(self.analysis_date)
        }

    def __repr__(self):
        return f'<AnalyticsData {self.data_type} - {self.upload_id}>'

# New: Per-student risk assessment results
class StudentRiskAssessment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    upload_id = db.Column(db.Integer, db.ForeignKey('faculty_upload.id'), nullable=False)
    student_name = db.Column(db.String(255), nullable=False)
    average_grade = db.Column(db.Float, nullable=False)
    passed_count = db.Column(db.Integer, default=0)
    failed_count = db.Column(db.Integer, default=0)
    incomplete_count = db.Column(db.Integer, default=0)
    lowest_subject = db.Column(db.String(200))
    lowest_grade = db.Column(db.Float)
    highest_subject = db.Column(db.String(200))
    highest_grade = db.Column(db.Float)
    grade_variance = db.Column(db.Float)
    consistency_score = db.Column(db.Float)
    risk_level = db.Column(db.String(32))
    recommendation = db.Column(db.Text)
    breakdown_json = db.Column(db.Text)  # JSON: [{subject, grade, status}]
    analysis_date = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'upload_id': self.upload_id,
            'student_name': self.student_name,
            'average_grade': self.average_grade,
            'passed_count': self.passed_count,
            'failed_count': self.failed_count,
            'incomplete_count': self.incomplete_count,
            'lowest_subject': self.lowest_subject,
            'lowest_grade': self.lowest_grade,
            'highest_subject': self.highest_subject,
            'highest_grade': self.highest_grade,
            'grade_variance': self.grade_variance,
            'consistency_score': self.consistency_score,
            'risk_level': self.risk_level,
            'recommendation': self.recommendation,
            'breakdown': self.breakdown_json,
            'analysis_date': to_manila_iso(self.analysis_date),
        }

    def __repr__(self):
        return f'<StudentRiskAssessment {self.student_name} {self.risk_level}>'

# New: Risk Tracking module models
class StudentRiskUpload(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    uploader_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    file_name = db.Column(db.String(512), nullable=False)
    subject = db.Column(db.String(200), nullable=False)
    course = db.Column(db.String(200))
    year_level = db.Column(db.String(32))
    semester = db.Column(db.String(64))
    section = db.Column(db.String(64))
    faculty_name = db.Column(db.String(255))
    academic_year = db.Column(db.String(20))
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'uploader_id': self.uploader_id,
            'file_name': self.file_name,
            'subject': self.subject,
            'course': self.course,
            'year_level': self.year_level,
            'semester': self.semester,
            'section': self.section,
            'faculty_name': self.faculty_name,
            'academic_year': self.academic_year,
            'uploaded_at': to_manila_iso(self.uploaded_at),
        }

class StudentSubjectRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    upload_id = db.Column(db.Integer, db.ForeignKey('student_risk_upload.id'), nullable=False)
    student_id = db.Column(db.String(64))
    student_name = db.Column(db.String(255), nullable=False)
    subject = db.Column(db.String(200), nullable=False)
    year_level = db.Column(db.String(32))
    grade = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(32))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'upload_id': self.upload_id,
            'student_id': self.student_id,
            'student_name': self.student_name,
            'subject': self.subject,
            'year_level': self.year_level,
            'grade': self.grade,
            'status': self.status,
            'created_at': to_manila_iso(self.created_at),
        }

class StudentAcademicProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(64))
    student_name = db.Column(db.String(255), nullable=False)
    year_level = db.Column(db.String(32))
    total_subjects = db.Column(db.Integer, default=0)
    total_grades = db.Column(db.Float, default=0.0)
    average_grade = db.Column(db.Float, default=0.0)
    failed_count = db.Column(db.Integer, default=0)
    passed_count = db.Column(db.Integer, default=0)
    risk_level = db.Column(db.String(32))
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'student_name': self.student_name,
            'year_level': self.year_level,
            'total_subjects': self.total_subjects,
            'total_grades': self.total_grades,
            'average_grade': self.average_grade,
            'failed_count': self.failed_count,
            'passed_count': self.passed_count,
            'risk_level': self.risk_level,
            'updated_at': to_manila_iso(self.updated_at),
        }

# New: Log for universal uploads (any file types)
class UniversalUploadLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(512), nullable=False)
    mime_type = db.Column(db.String(256))
    size_bytes = db.Column(db.Integer)
    storage_path = db.Column(db.String(1024))
    status = db.Column(db.String(64), default='uploaded')  # uploaded|processed|error
    error_message = db.Column(db.Text)
    extracted_text_snippet = db.Column(db.Text)  # optional previewable text
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'mime_type': self.mime_type,
            'size': self.size_bytes,
            'storage_path': self.storage_path,
            'status': self.status,
            'error_message': self.error_message,
            'extracted_text_snippet': (self.extracted_text_snippet[:500] if self.extracted_text_snippet else None),
            'created_at': to_manila_iso(self.created_at)
        }

    def __repr__(self):
        return f'<UniversalUploadLog {self.filename} {self.status}>'

class AuditLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    action = db.Column(db.String(64), nullable=False)
    details = db.Column(db.Text) # JSON string
    ip_address = db.Column(db.String(64))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'action': self.action,
            'details': self.details,
            'ip_address': self.ip_address,
            'timestamp': to_manila_iso(self.timestamp)
        }
