import React, { useState } from 'react';
import Navbar from '../components/NavBar';
import { uploadRiskTracking } from '../services/api';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';

const RiskTrackingUpload = () => {
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    academicYear: '',
    semester: '',
    section: '',
    subject: '',
    facultyName: ''
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setIsUploading(true);
    try {
      if (!file) throw new Error('Select an Excel file');
      if (!formData.academicYear) throw new Error('Academic Year is required');
      
      const name = (file.name || '').toLowerCase();
      if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) throw new Error('Only Excel files are accepted');
      
      const labels = {
        academic_year: formData.academicYear,
        semester: formData.semester,
        section: formData.section,
        subject: formData.subject,
        faculty_name: formData.facultyName
      };

      const r = await uploadRiskTracking(file, labels);
      setResult(r);
    } catch (err) {
      setError(err?.message || 'Upload failed');
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-4 dark:text-white">Student Risk Upload</h1>
        <form onSubmit={onSubmit} className="space-y-6 bg-white dark:bg-gray-800 rounded-2xl p-6 border dark:border-gray-700 shadow-sm">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="academicYear">Academic Year <span className="text-red-500">*</span></Label>
                    <select
                        id="academicYear"
                        value={formData.academicYear}
                        onChange={(e) => setFormData({...formData, academicYear: e.target.value})}
                        required
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    >
                        <option value="">Select Academic Year</option>
                        {["2020-2021", "2021-2022", "2022-2023", "2023-2024", "2024-2025", "2025-2026", "2026-2027", "2027-2028", "2028-2029", "2029-2030"].map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="semester">Semester</Label>
                    <select
                        id="semester"
                        value={formData.semester}
                        onChange={(e) => setFormData({...formData, semester: e.target.value})}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    >
                        <option value="">Select Semester</option>
                        <option value="1st Semester">1st Semester</option>
                        <option value="2nd Semester">2nd Semester</option>
                        <option value="Summer">Summer</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="subject">Subject (Optional Override)</Label>
                    <Input 
                        id="subject" 
                        value={formData.subject} 
                        onChange={(e) => setFormData({...formData, subject: e.target.value})}
                        placeholder="e.g. ITST 301"
                        className="dark:bg-gray-700 dark:text-white"
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="section">Section</Label>
                    <Input 
                        id="section" 
                        value={formData.section} 
                        onChange={(e) => setFormData({...formData, section: e.target.value})}
                        placeholder="e.g. A"
                        className="dark:bg-gray-700 dark:text-white"
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="facultyName">Faculty Name</Label>
                    <Input 
                        id="facultyName" 
                        value={formData.facultyName} 
                        onChange={(e) => setFormData({...formData, facultyName: e.target.value})}
                        placeholder="e.g. John Doe"
                        className="dark:bg-gray-700 dark:text-white"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="file">Risk Data File (Excel) <span className="text-red-500">*</span></Label>
                <Input 
                    id="file"
                    type="file" 
                    accept=".xlsx,.xls" 
                    onChange={(e) => setFile(e.target.files?.[0] || null)} 
                    required
                    className="cursor-pointer dark:bg-gray-700 dark:text-white"
                />
            </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isUploading || !file || !formData.academicYear} className="bg-indigo-600 text-white w-full md:w-auto">
                {isUploading ? 'Uploading...' : 'Upload Risk Data'}
            </Button>
          </div>
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">{error}</div>}
          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md text-sm text-gray-700 dark:text-gray-800 space-y-1">
              <div className="font-semibold text-green-800">Upload Successful!</div>
              <div>Upload ID: {result.upload_id}</div>
              <div>Subject: {result.subject}</div>
              <div>Year Level: {result.year_level || 'N/A'}</div>
              <div>Records Created: {result.records_created}</div>
            </div>
          )}
        </form>
      </main>
    </div>
  );
};

export default RiskTrackingUpload;
