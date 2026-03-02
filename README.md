# AI-Powered Academic Program Effectiveness Evaluation System

An integrated recommendation engine for evaluating and improving BSIT and BSCS program effectiveness using AI-driven analysis and actionable insights.

## Features

- **AI-Powered Analysis**: Automatic evaluation of academic program effectiveness
- **Student Risk Assessment**: Identify at-risk students and provide targeted interventions
- **Employment Outcome Tracking**: Monitor graduate employment and career progression
- **Interactive Dashboard**: Real-time analytics and visualizations
- **Comprehensive Reporting**: Detailed reports for program improvement
- **Faculty Insights**: Data-driven recommendations for educators

## Project Structure

```
ai-cqi-web-system/
├── backend/              # Flask API server
│   ├── app.py           # Main Flask application
│   ├── models.py        # Database models
│   ├── ai_processor.py  # AI processing engine
│   ├── requirements.txt # Python dependencies
│   └── instance/        # Database directory
├── frontend/            # React web application
│   ├── src/            # React components and pages
│   ├── package.json    # Node.js dependencies
│   ├── public/         # Static assets
│   └── build/          # Production build
└── README.md
```

## Technology Stack

### Backend
- Flask 3.0.3
- Flask-SQLAlchemy 3.1.1
- Pandas 2.2.2
- Scikit-learn 1.5.0
- Python 3.10+

### Frontend
- React 16.13+
- React Router
- Radix UI Components
- Tailwind CSS
- Plotly for charts

## Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/Scripts/activate  # On Windows
# or
source venv/bin/activate  # On macOS/Linux
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the Flask server:
```bash
python app.py
```

The backend will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will be available at `http://localhost:3001`

## Usage

1. Ensure both backend and frontend servers are running
2. Open your browser and navigate to `http://localhost:3001`
3. Login with your faculty or student credentials
4. Access the dashboard to view analytics and recommendations

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/user` - Get current user info

### Data Management
- `POST /api/upload` - Upload student data
- `GET /api/analytics` - Get analytics data
- `GET /api/reports` - Generate reports

### AI Processing
- `POST /api/analyze` - Run AI analysis
- `GET /api/recommendations` - Get AI recommendations

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions, please open an issue on the GitHub repository.

## Authors

- Thesis Team - LSPU CCS
