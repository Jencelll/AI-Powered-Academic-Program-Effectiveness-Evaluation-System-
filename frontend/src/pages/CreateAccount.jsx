import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { register as apiRegister } from '../services/api';

const CreateAccount = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('Faculty');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [program, setProgram] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validateStrength = (pwd) => {
    if (!pwd || pwd.length < 8) return false;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasDigit = /\d/.test(pwd);
    return hasUpper && hasLower && hasDigit;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Password and confirmation do not match');
      return;
    }
    if (!validateStrength(password)) {
      setError('Password must be at least 8 chars and include upper, lower, digit');
      return;
    }

    try {
      const payload = {
        role,
        fullName,
        email,
        password,
        confirmPassword,
        facultyId: role === 'Faculty' ? facultyId : undefined,
        studentId: role === 'Student' ? studentId : undefined,
        program: role === 'Student' ? program : undefined,
      };
      await apiRegister(payload);
      setSuccess('Registration successful. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1000);
    } catch (err) {
      setError(err?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 via-violet-50 to-gray-100 dark:from-gray-900 dark:via-indigo-900/30 dark:to-gray-800 px-4">
      <Card className="w-full max-w-2xl rounded-2xl shadow-xl bg-white border border-indigo-200/50 dark:bg-gray-800 dark:border-indigo-400/30">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-indigo-900 dark:text-white text-center">Create Account</CardTitle>
          <CardDescription className="text-center text-gray-700 dark:text-gray-300">Select role and fill in the required fields</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="role" className="text-sm font-medium text-gray-700 dark:text-gray-300">Role</Label>
              <select id="role" value={role} onChange={(e) => setRole(e.target.value)} className="h-11 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3">
                <option value="Faculty">Faculty</option>
                <option value="Student">Student</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Admin accounts cannot be created here.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName" className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="h-11 rounded-xl shadow-inner focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400" />
              </div>
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 rounded-xl shadow-inner focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400" />
              </div>
            </div>

            {role === 'Faculty' && (
              <div>
                <Label htmlFor="facultyId" className="text-sm font-medium text-gray-700 dark:text-gray-300">Faculty ID</Label>
                <Input id="facultyId" value={facultyId} onChange={(e) => setFacultyId(e.target.value)} required className="h-11 rounded-xl shadow-inner focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400" />
                <p className="text-xs text-gray-500 mt-1">Must be unique.</p>
              </div>
            )}
            {role === 'Student' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="studentId" className="text-sm font-medium text-gray-700 dark:text-gray-300">Student ID</Label>
                  <Input id="studentId" value={studentId} onChange={(e) => setStudentId(e.target.value)} required className="h-11 rounded-xl shadow-inner focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400" />
                  <p className="text-xs text-gray-500 mt-1">Must be unique.</p>
                </div>
                <div>
                  <Label htmlFor="program" className="text-sm font-medium text-gray-700 dark:text-gray-300">Program</Label>
                  <Input id="program" value={program} onChange={(e) => setProgram(e.target.value)} required className="h-11 rounded-xl shadow-inner focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400" />
                  <p className="text-xs text-gray-500 mt-1">E.g., BSIT, BSCS</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</Label>
                <div className="flex items-center gap-2">
                  <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11 rounded-xl shadow-inner focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 flex-1" />
                  <Button type="button" variant="outline" className="whitespace-nowrap" onClick={() => setShowPassword((s) => !s)}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Min 8 chars, include upper, lower, number.</p>
              </div>
              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</Label>
                <Input id="confirmPassword" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="h-11 rounded-xl shadow-inner focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400" />
              </div>
            </div>

            {error && <div className="p-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>}
            {success && <div className="p-2 rounded-md border border-green-200 bg-green-50 text-green-700 text-sm">{success}</div>}
          </CardContent>
          <CardFooter>
            <div className="flex items-center w-full gap-3">
              <Button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md hover:shadow-lg active:scale-95 py-3 px-6 font-semibold">Create Account</Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/login')}>Back to Login</Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default CreateAccount;