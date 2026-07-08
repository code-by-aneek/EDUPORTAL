/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, BookOpen, Bell, Award, ShieldAlert, LogOut, 
  User as UserIcon, Menu, X, ArrowLeft, Heart, ShieldCheck 
} from 'lucide-react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CoursesPage from './pages/CoursesPage';
import CourseDetailsPage from './pages/CourseDetailsPage';
import AdminPage from './pages/AdminPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import AIChatBot from './components/AIChatBot';
import CertificateViewer from './components/CertificateViewer';
import { User, Certificate } from './types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  // Navigation: 'dashboard' | 'courses' | 'course-details' | 'announcements' | 'admin-settings' | 'certificates'
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Certificates list & Active viewing modal
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [activeCertificate, setActiveCertificate] = useState<Certificate | null>(null);

  // Restore session from localStorage on startup
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    if (savedUser && savedToken) {
      setCurrentUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  }, []);

  // Fetch certificates of achievement for students
  const loadStudentCertificates = async () => {
    if (!currentUser || currentUser.role !== 'student') return;
    try {
      const res = await fetch('/api/certificates/my', {
        headers: {
          'x-user-email': currentUser.email,
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (res.ok) {
        setCertificates(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadStudentCertificates();
    }
  }, [currentUser]);

  const handleLoginSuccess = (user: User, jwtToken: string) => {
    setCurrentUser(user);
    setToken(jwtToken);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('userEmail', user.email);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.clear();
    setCurrentView('dashboard');
    setSelectedCourseId(null);
  };

  const handleNavigate = (view: string, courseId?: string) => {
    setCurrentView(view);
    if (courseId) {
      setSelectedCourseId(courseId);
    }
    setMobileMenuOpen(false);
  };

  // Quick evaluation simulation trigger: Generate Certificate manually
  const simulateEarnCertificate = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/courses');
      if (!res.ok) return;
      const courses = await res.json();
      const firstCourse = courses[0]; // Artificial Intelligence course

      const claimRes = await fetch('/api/certificates/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email
        },
        body: JSON.stringify({
          courseId: firstCourse.id,
          courseName: firstCourse.title
        })
      });

      if (claimRes.ok) {
        alert('Academic achievement evaluated! Coursework certificate successfully conferred. 📜');
        loadStudentCertificates();
        setCurrentView('certificates');
      } else {
        const errData = await claimRes.json();
        alert(`Evaluation Unresolved: ${errData.error || 'Please complete all syllabus watches and assignments first.'}`);
      }
    } catch (err) {
      alert('Failed communicating with verified ledgers.');
    }
  };

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#F8F5EE] flex text-gray-800 font-sans antialiased">
      
      {/* SIDEBAR NAVIGATION (Desktop) */}
      <aside className="hidden lg:flex flex-col justify-between w-64 bg-[#1F315D] text-white p-6 border-r-4 border-[#D4A017] shrink-0 select-none">
        <div className="space-y-8">
          
          {/* Logo Insignia */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-[#D4A017]/35">
              <GraduationCap className="w-5 h-5 text-[#D4A017]" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold tracking-wide leading-none uppercase">EDUPORTAL</h1>
              <span className="text-[9px] text-[#D4A017] uppercase tracking-widest font-semibold block mt-1">Nexus Academic LMS</span>
            </div>
          </div>

          {/* Navigation Links list */}
          <nav className="space-y-2 text-xs uppercase font-semibold tracking-wider">
            <button
              onClick={() => handleNavigate('dashboard')}
              className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 transition-colors ${currentView === 'dashboard' ? 'bg-[#D4A017] text-[#1F315D]' : 'hover:bg-white/5 text-gray-300 hover:text-white'}`}
            >
              <Menu className="w-4 h-4 shrink-0" />
              <span>Workspace Hub</span>
            </button>

            <button
              onClick={() => handleNavigate('courses')}
              className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 transition-colors ${currentView === 'courses' || currentView === 'course-details' ? 'bg-[#D4A017] text-[#1F315D]' : 'hover:bg-white/5 text-gray-300 hover:text-white'}`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Syllabus Classes</span>
            </button>

            <button
              onClick={() => handleNavigate('announcements')}
              className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 transition-colors ${currentView === 'announcements' ? 'bg-[#D4A017] text-[#1F315D]' : 'hover:bg-white/5 text-gray-300 hover:text-white'}`}
            >
              <Bell className="w-4 h-4 shrink-0" />
              <span>Notice Bulletins</span>
            </button>

            {currentUser.role === 'student' && (
              <button
                onClick={() => handleNavigate('certificates')}
                className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 transition-colors ${currentView === 'certificates' ? 'bg-[#D4A017] text-[#1F315D]' : 'hover:bg-white/5 text-gray-300 hover:text-white'}`}
              >
                <Award className="w-4 h-4 shrink-0" />
                <span>My Achievements</span>
              </button>
            )}

            {currentUser.role === 'admin' && (
              <button
                onClick={() => handleNavigate('admin-settings')}
                className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 transition-colors ${currentView === 'admin-settings' ? 'bg-[#D4A017] text-[#1F315D]' : 'hover:bg-white/5 text-gray-300 hover:text-white'}`}
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Administration</span>
              </button>
            )}
          </nav>
        </div>

        {/* Sidebar Footer User Details */}
        <div className="border-t border-white/10 pt-4 space-y-4">
          <div className="flex items-center gap-3">
            <img 
              src={currentUser.avatar} 
              alt={currentUser.name} 
              className="w-10 h-10 rounded-xl object-cover border border-[#D4A017]/30" 
            />
            <div className="min-w-0">
              <span className="block text-xs font-bold text-white truncate">{currentUser.name}</span>
              <span className="block text-[10px] text-gray-400 capitalize truncate">{currentUser.role} Account</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-[#D4A017]/10 hover:bg-[#D4A017]/20 text-[#D4A017] py-2.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border border-[#D4A017]/20"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER BAR */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#1F315D] text-white px-4 border-b-2 border-[#D4A017] flex items-center justify-between z-30 select-none shadow-md">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-[#D4A017]" />
          <span className="font-serif font-bold text-sm tracking-wide uppercase">EDUPORTAL</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 text-[#D4A017] hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* MOBILE DRAWER OVERLAY */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-[#1F315D] z-20 flex flex-col justify-between p-6 pt-24 text-white text-sm uppercase font-semibold tracking-wider">
          <nav className="space-y-4">
            <button
              onClick={() => handleNavigate('dashboard')}
              className="w-full text-left py-3 border-b border-white/5 flex items-center gap-3"
            >
              <Menu className="w-4 h-4 text-[#D4A017]" /> Workspace Hub
            </button>
            <button
              onClick={() => handleNavigate('courses')}
              className="w-full text-left py-3 border-b border-white/5 flex items-center gap-3"
            >
              <BookOpen className="w-4 h-4 text-[#D4A017]" /> Syllabus Classes
            </button>
            <button
              onClick={() => handleNavigate('announcements')}
              className="w-full text-left py-3 border-b border-white/5 flex items-center gap-3"
            >
              <Bell className="w-4 h-4 text-[#D4A017]" /> Notice Bulletins
            </button>
            {currentUser.role === 'student' && (
              <button
                onClick={() => handleNavigate('certificates')}
                className="w-full text-left py-3 border-b border-white/5 flex items-center gap-3"
              >
                <Award className="w-4 h-4 text-[#D4A017]" /> My Achievements
              </button>
            )}
            {currentUser.role === 'admin' && (
              <button
                onClick={() => handleNavigate('admin-settings')}
                className="w-full text-left py-3 border-b border-white/5 flex items-center gap-3"
              >
                <ShieldAlert className="w-4 h-4 text-[#D4A017]" /> Administration
              </button>
            )}
          </nav>

          <button
            onClick={handleLogout}
            className="w-full bg-[#D4A017] text-[#1F315D] py-3 rounded-xl font-bold uppercase"
          >
            Sign Out
          </button>
        </div>
      )}

      {/* MAIN CONTENT WRAPPER */}
      <main className="flex-1 flex flex-col min-w-0 pt-16 lg:pt-0">
        
        {/* Top Header Panel (desktop/mobile stats line) */}
        <header className="hidden lg:flex h-16 bg-white border-b border-gray-100 px-8 items-center justify-between shrink-0 shadow-3xs select-none">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-4.5 h-4.5 text-[#D4A017]" />
            <span className="text-[11px] uppercase tracking-widest text-gray-400 font-bold">Institution Secured • Nexus Academic Trust Grid</span>
          </div>

          {/* Quick evaluation manual bypass for student */}
          {currentUser.role === 'student' && (
            <button
              onClick={simulateEarnCertificate}
              className="bg-[#1F315D]/5 text-[#1F315D] hover:bg-[#1F315D]/10 border border-[#1F315D]/10 py-1.5 px-3.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
            >
              Evaluate Graduation Criteria
            </button>
          )}
        </header>

        {/* Content Body Layout */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-6xl w-full mx-auto pb-24">
          
          {/* VIEW: DASHBOARD */}
          {currentView === 'dashboard' && (
            <DashboardPage 
              user={currentUser} 
              onNavigate={handleNavigate} 
              onShowCertificate={(cert) => setActiveCertificate(cert)} 
            />
          )}

          {/* VIEW: COURSES INDEX */}
          {currentView === 'courses' && (
            <CoursesPage 
              user={currentUser} 
              onNavigate={handleNavigate} 
            />
          )}

          {/* VIEW: COURSE DETAIL WORKSPACE */}
          {currentView === 'course-details' && selectedCourseId && (
            <CourseDetailsPage 
              courseId={selectedCourseId} 
              user={currentUser} 
              onNavigateBack={() => handleNavigate('courses')} 
              onShowCertificate={(cert) => setActiveCertificate(cert)} 
            />
          )}

          {/* VIEW: ANNOUNCEMENTS PUBLICATION */}
          {currentView === 'announcements' && (
            <AnnouncementsPage user={currentUser} />
          )}

          {/* VIEW: ADMIN PANEL SERVICES */}
          {currentView === 'admin-settings' && currentUser.role === 'admin' && (
            <AdminPage currentUser={currentUser} />
          )}

          {/* VIEW: STUDENT MY CERTIFICATES LIST */}
          {currentView === 'certificates' && currentUser.role === 'student' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-serif font-bold text-[#1F315D] tracking-wide">Academic Credentials Vault</h1>
                <p className="text-xs text-gray-400 mt-1">Conferred digital certificates matching coursework syllabuses passing marks.</p>
              </div>

              {certificates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
                  {certificates.map(cert => (
                    <div 
                      key={cert.id} 
                      className="bg-white rounded-2xl border border-gray-100 p-5 shadow-3xs flex flex-col justify-between hover:shadow transition-all relative overflow-hidden group"
                    >
                      <div className="absolute top-0 left-0 w-1 bg-[#D4A017] h-full"></div>
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Verified Degree</span>
                          <span className="text-[9px] text-gray-400 font-mono">{cert.certificateId}</span>
                        </div>
                        <h3 className="font-serif font-bold text-[#1F315D] text-base mt-3 leading-snug">{cert.courseName}</h3>
                        <p className="text-[11px] text-gray-400 mt-1">Lead instructor: {cert.instructorName}</p>
                      </div>

                      <div className="border-t border-gray-50 pt-3 mt-4 flex justify-between items-center text-xs">
                        <span className="text-gray-400">Issued: {cert.issueDate}</span>
                        <button
                          onClick={() => setActiveCertificate(cert)}
                          className="text-[#1F315D] hover:text-[#4F46E5] font-bold flex items-center gap-0.5 group"
                        >
                          View Certificate &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-[#D4A017]/20 p-8 text-center max-w-sm mx-auto space-y-4 shadow-3xs">
                  <Award className="w-12 h-12 text-[#D4A017] mx-auto animate-bounce" />
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#1F315D]">No Conferred Degrees Yet</h3>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Complete lectures watched, submit draft project assignments, and score passing marks on the coursework final exams to unlock official certificates.
                    </p>
                  </div>
                  <button
                    onClick={simulateEarnCertificate}
                    className="bg-[#1F315D] text-white hover:bg-[#2A427D] py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wide"
                  >
                    Assess Graduation Status
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* FLOAT ACADEMIC AI STUDY BOT (Only active for authenticated accounts) */}
      <AIChatBot courseCode={selectedCourseId || undefined} />

      {/* MODAL VIEWING ACTIVE CERTIFICATE */}
      {activeCertificate && (
        <CertificateViewer 
          certificate={activeCertificate} 
          onClose={() => setActiveCertificate(null)} 
        />
      )}

    </div>
  );
}
