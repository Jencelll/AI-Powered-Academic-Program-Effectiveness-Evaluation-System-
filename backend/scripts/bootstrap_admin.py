import sys
from pathlib import Path
import sys as _sys

# Ensure backend root is on sys.path so we can import app and models
BACKEND_ROOT = Path(__file__).resolve().parents[1]
_sys.path.insert(0, str(BACKEND_ROOT))

from app import app, db
from models import User
from werkzeug.security import generate_password_hash


def main():
    with app.app_context():
        existing = (
            User.query.filter_by(email='admin@example.com').first()
            or User.query.filter_by(username='admin').first()
        )
        if existing:
            print('Admin user already exists')
            return 0
        u = User(
            username='admin',
            email='admin@example.com',
            role='Admin',
            password_hash=generate_password_hash('Admin@123'),
            active=True,
        )
        db.session.add(u)
        db.session.commit()
        print('Admin created with email=admin@example.com, password=Admin@123')
        return 0


if __name__ == '__main__':
    sys.exit(main())