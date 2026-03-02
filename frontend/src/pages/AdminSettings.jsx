import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/NavBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Eye, EyeOff, ShieldCheck, Mail, Lock } from 'lucide-react';

const AdminSettings = () => {
    const { user, token, logout } = useContext(AuthContext);
    const [isEmailSectionOpen, setIsEmailSectionOpen] = useState(false);
    const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false);
    
    // Email State
    const [emailForm, setEmailForm] = useState({
        currentPassword: '',
        newEmail: '',
        confirmEmail: ''
    });
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailMessage, setEmailMessage] = useState({ type: '', text: '' });

    // Password State
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });

    const backendOrigin = (() => {
        const base = (process.env.REACT_APP_API_BASE_URL || '/api').trim();
        if (/^https?:\/\//.test(base)) {
          return base.replace(/\/?api$/, '');
        }
        return '';
    })();

    // Email Handlers
    const handleEmailChange = (e) => {
        const { name, value } = e.target;
        setEmailForm(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateEmail = async (e) => {
        e.preventDefault();
        setEmailMessage({ type: '', text: '' });

        if (emailForm.newEmail !== emailForm.confirmEmail) {
            setEmailMessage({ type: 'error', text: 'New emails do not match.' });
            return;
        }

        setEmailLoading(true);
        try {
            const response = await fetch(`${backendOrigin}/api/admin/update-email`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    current_password: emailForm.currentPassword,
                    new_email: emailForm.newEmail
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update email');
            }

            setEmailMessage({ type: 'success', text: 'Email updated successfully.' });
            setEmailForm({ currentPassword: '', newEmail: '', confirmEmail: '' });
            setIsEmailSectionOpen(false);
        } catch (error) {
            setEmailMessage({ type: 'error', text: error.message });
        } finally {
            setEmailLoading(false);
        }
    };

    // Password Handlers
    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordForm(prev => ({ ...prev, [name]: value }));
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const validatePassword = (password) => {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[\W_]/.test(password);

        return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        setPasswordMessage({ type: '', text: '' });

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }

        if (!validatePassword(passwordForm.newPassword)) {
            setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters, include uppercase, lowercase, number, and special character.' });
            return;
        }

        setPasswordLoading(true);
        try {
            const response = await fetch(`${backendOrigin}/api/admin/update-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    current_password: passwordForm.currentPassword,
                    new_password: passwordForm.newPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update password');
            }

            setPasswordMessage({ type: 'success', text: 'Password updated successfully. Please log in again.' });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setIsPasswordSectionOpen(false);
            
            // Force logout after password change for security
            setTimeout(() => {
                logout();
            }, 2000);

        } catch (error) {
            setPasswordMessage({ type: 'error', text: error.message });
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar />
            <main className="max-w-4xl mx-auto px-6 py-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <ShieldCheck className="h-8 w-8 text-indigo-600" />
                        Admin Settings
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Manage your account security and preferences.
                    </p>
                </div>

                <div className="space-y-6">
                    {/* Account Information */}
                    <Card className="dark:bg-gray-800 border-l-4 border-l-indigo-500 shadow-md">
                        <CardHeader>
                            <CardTitle>Account Information</CardTitle>
                            <CardDescription>Your current administrative details.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-gray-500">Role</Label>
                                    <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-green-500" />
                                        {user?.role || 'Admin'}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-gray-500">Current Email</Label>
                                    <div className="font-semibold text-gray-900 dark:text-white">{user?.email}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Change Email Section */}
                    <Card className="dark:bg-gray-800 shadow-md">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Mail className="w-5 h-5 text-indigo-500" />
                                        Change Email
                                    </CardTitle>
                                    <CardDescription>Update your registered administrator email address.</CardDescription>
                                </div>
                                <Button 
                                    variant="outline" 
                                    onClick={() => setIsEmailSectionOpen(!isEmailSectionOpen)}
                                >
                                    {isEmailSectionOpen ? 'Cancel' : 'Edit Email'}
                                </Button>
                            </div>
                        </CardHeader>
                        {isEmailSectionOpen && (
                            <form onSubmit={handleUpdateEmail}>
                                <CardContent className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="space-y-2">
                                        <Label htmlFor="emailCurrentPass">Current Password</Label>
                                        <Input
                                            id="emailCurrentPass"
                                            name="currentPassword"
                                            type="password"
                                            value={emailForm.currentPassword}
                                            onChange={handleEmailChange}
                                            required
                                            className="dark:bg-gray-700"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="newEmail">New Email</Label>
                                            <Input
                                                id="newEmail"
                                                name="newEmail"
                                                type="email"
                                                value={emailForm.newEmail}
                                                onChange={handleEmailChange}
                                                required
                                                className="dark:bg-gray-700"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirmEmail">Confirm New Email</Label>
                                            <Input
                                                id="confirmEmail"
                                                name="confirmEmail"
                                                type="email"
                                                value={emailForm.confirmEmail}
                                                onChange={handleEmailChange}
                                                required
                                                className="dark:bg-gray-700"
                                            />
                                        </div>
                                    </div>

                                    {emailMessage.text && (
                                        <div className={`p-3 rounded-md text-sm ${emailMessage.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                            {emailMessage.text}
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="bg-gray-50 dark:bg-gray-800/50 flex justify-end">
                                    <Button type="submit" disabled={emailLoading} className="bg-indigo-600 hover:bg-indigo-700">
                                        {emailLoading ? 'Updating...' : 'Update Email'}
                                    </Button>
                                </CardFooter>
                            </form>
                        )}
                    </Card>

                    {/* Change Password Section */}
                    <Card className="dark:bg-gray-800 shadow-md">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Lock className="w-5 h-5 text-indigo-500" />
                                        Change Password
                                    </CardTitle>
                                    <CardDescription>Update your account password securely.</CardDescription>
                                </div>
                                <Button 
                                    variant="outline" 
                                    onClick={() => setIsPasswordSectionOpen(!isPasswordSectionOpen)}
                                >
                                    {isPasswordSectionOpen ? 'Cancel' : 'Change Password'}
                                </Button>
                            </div>
                        </CardHeader>
                        {isPasswordSectionOpen && (
                            <form onSubmit={handleUpdatePassword}>
                                <CardContent className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="space-y-2">
                                        <Label htmlFor="passCurrent">Current Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="passCurrent"
                                                name="currentPassword"
                                                type={showPasswords.current ? "text" : "password"}
                                                value={passwordForm.currentPassword}
                                                onChange={handlePasswordChange}
                                                required
                                                className="dark:bg-gray-700 pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => togglePasswordVisibility('current')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                            >
                                                {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="passNew">New Password</Label>
                                            <div className="relative">
                                                <Input
                                                    id="passNew"
                                                    name="newPassword"
                                                    type={showPasswords.new ? "text" : "password"}
                                                    value={passwordForm.newPassword}
                                                    onChange={handlePasswordChange}
                                                    required
                                                    className="dark:bg-gray-700 pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => togglePasswordVisibility('new')}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                >
                                                    {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-500">Min 8 chars, uppercase, lowercase, number, special char.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="passConfirm">Confirm New Password</Label>
                                            <div className="relative">
                                                <Input
                                                    id="passConfirm"
                                                    name="confirmPassword"
                                                    type={showPasswords.confirm ? "text" : "password"}
                                                    value={passwordForm.confirmPassword}
                                                    onChange={handlePasswordChange}
                                                    required
                                                    className="dark:bg-gray-700 pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => togglePasswordVisibility('confirm')}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                >
                                                    {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {passwordMessage.text && (
                                        <div className={`p-3 rounded-md text-sm ${passwordMessage.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                            {passwordMessage.text}
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="bg-gray-50 dark:bg-gray-800/50 flex justify-end">
                                    <Button type="submit" disabled={passwordLoading} className="bg-indigo-600 hover:bg-indigo-700">
                                        {passwordLoading ? 'Updating...' : 'Update Password'}
                                    </Button>
                                </CardFooter>
                            </form>
                        )}
                    </Card>
                </div>
            </main>
        </div>
    );
};

export default AdminSettings;
