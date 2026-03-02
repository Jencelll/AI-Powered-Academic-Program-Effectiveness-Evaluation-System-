import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Subjects from './pages/Subject';
import Analysis from './pages/Analysis';
import Upload from './pages/Upload';
import Admin from './pages/Admin';
import AdminSettings from './pages/AdminSettings';
import Reports from './pages/Reports';
import Metrics from './pages/Metrics';
import SummaryOverview from './pages/SummaryOverview';
import { AcademicYearProvider } from './context/AcademicYearContext';
import { AuthProvider, AuthContext } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import FacultyDashboard from './pages/FacultyDashboard';
import StudentDashboard from './pages/StudentDashboard';
import AccessDenied from './pages/AccessDenied';
import CreateAccount from './pages/CreateAccount';
import RiskTrackingUpload from './pages/RiskTrackingUpload';
import RiskTrackingOverview from './pages/RiskTrackingOverview';
import StudentProfileView from './pages/StudentProfileView';
import StudentRisk from './pages/StudentRisk';
import StudentRiskDashboard from './pages/StudentRiskDashboard';
import * as RadixTooltip from '@radix-ui/react-tooltip';

function App() {
  const RootRoute = () => {
    const { user } = useContext(AuthContext);
    if (user) {
      return <Home />;
    }
    return <Login />;
  };
  return (
    <Router>
      <AuthProvider>
        <AcademicYearProvider>
          <RadixTooltip.Provider>
          <div className="App">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/create-account" element={<CreateAccount />} />
              <Route path="/access-denied" element={<AccessDenied />} />

              {/* Default route: if authenticated show Home, else show Login */}
              <Route path="/" element={<RootRoute />} />

              <Route path="/subjects" element={<ProtectedRoute roles={["admin","faculty"]} element={<Subjects />} />} />
              <Route path="/analysis" element={<ProtectedRoute roles={["admin","faculty"]} element={<Analysis />} />} />
              <Route path="/upload" element={<ProtectedRoute roles={["admin","faculty"]} element={<Upload />} />} />
              <Route path="/admin" element={<ProtectedRoute roles={["admin"]} element={<Admin />} />} />
              <Route path="/admin/settings" element={<ProtectedRoute roles={["admin"]} element={<AdminSettings />} />} />
              <Route path="/reports" element={<ProtectedRoute roles={["admin","faculty"]} element={<Reports />} />} />
              <Route path="/metrics" element={<ProtectedRoute roles={["admin","faculty"]} element={<Metrics />} />} />
              <Route path="/summary" element={<ProtectedRoute roles={["admin"]} element={<SummaryOverview />} />} />

              <Route path="/risk-tracking/upload" element={<ProtectedRoute roles={["admin","faculty"]} element={<RiskTrackingUpload />} />} />
              <Route path="/risk-tracking/overview" element={<ProtectedRoute roles={["admin","faculty"]} element={<RiskTrackingOverview />} />} />
              <Route path="/risk-tracking/profile/:name" element={<ProtectedRoute roles={["admin","faculty"]} element={<StudentProfileView />} />} />
              <Route path="/student-risk" element={<ProtectedRoute roles={["admin","faculty"]} element={<StudentRisk />} />} />
              <Route path="/risk-dashboard" element={<ProtectedRoute roles={["admin","faculty"]} element={<StudentRiskDashboard />} />} />

              {/* Dashboards */}
              <Route path="/dashboard/admin" element={<ProtectedRoute roles={["admin"]} element={<Admin />} />} />
              <Route path="/dashboard/faculty" element={<ProtectedRoute roles={["faculty"]} element={<FacultyDashboard />} />} />
              <Route path="/dashboard/student" element={<ProtectedRoute roles={["student"]} element={<StudentDashboard />} />} />
            </Routes>
          </div>
          </RadixTooltip.Provider>
        </AcademicYearProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
