import React, { useContext } from 'react';
import Navbar from '../components/NavBar';
import Sidebar from '../components/Sidebar';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container">
        <div className="flex gap-6">
          <Sidebar />
          <main className="flex-1 py-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Admin</CardTitle>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
                  >
                    Logout
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Administrative tools and controls will appear here.</p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Admin;