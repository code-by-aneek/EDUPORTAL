/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Award, FileCheck, CheckCircle2, AlertCircle, Clock, Calendar, 
  Search, ArrowUpRight, UploadCloud, Users, Layers, Activity, ShieldAlert,
  ClipboardList, Bell, ShieldCheck, Heart, UserX, UserCheck
} from 'lucide-react';
import { Course, Announcement, User } from '../types';

interface DashboardPageProps {
  user: User;
  onNavigate: (view: string, targetId?: string) => void;
  onShowCertificate: (cert: any) => void;
}

export default function DashboardPage({ user, onNavigate, onShowCertificate }: DashboardPageProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [studentProgress, setStudentProgress] = useState<{ [courseId: string]: number }>({});
  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Load appropriate data based on role
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const emailHeaders = { 'x-user-email': user.email };
      
      // All users need courses and announcements
      const [coursesRes, annRes] = await Promise.all([
        fetch('/api/courses'),
        fetch('/api/announcements')
      ]);

      if (coursesRes.ok) {
        const cData = await coursesRes.json();
        // Filter by student semester/department or teacher courses
        if (user.role === 'student') {
          setCourses(cData.filter((c: Course) => c.department === user.department && c.semester === user.semester));
        } else if (user.role === 'teacher') {
          setCourses(cData.filter((c: Course) => c.teacherId === user.id));
        } else {
          setCourses(cData);
        }
      }
      
      if (annRes.ok) {
        setAnnouncements(await annRes.json());
      }

      // Role specific loading
      if (user.role === 'admin') {
        const [analRes, logsRes, usersRes] = await Promise.all([
          fetch('/api/admin/analytics'),
          fetch('/api/admin/logs'),
          fetch('/api/admin/users')
        ]);
        if (analRes.ok) setAnalytics(await analRes.json());
        if (logsRes.ok) setRecentLogs((await logsRes.json()).slice(0, 5));
        if (usersRes.ok) setUsers(await usersRes.json());
      } else if (user.role === 'teacher') {
        // Find pending grading assignments for the teacher's courses
        const submissionsRes = await fetch('/api/courses');
        if (submissionsRes.ok) {
          const coursesList = await submissionsRes.json();
          const teacherCourses = coursesList.filter((c: Course) => c.teacherId === user.id);
          const pendingGrading: any[] = [];
          for (const tc of teacherCourses) {
            const subRes = await fetch(`/api/courses/${tc.id}/submissions`);
            if (subRes.ok) {
              const subs = await subRes.json();
              pendingGrading.push(...subs.filter((s: any) => s.status === 'pending'));
            }
          }
          setPendingSubmissions(pendingGrading);
        }
      } else if (user.role === 'student') {
        // Load student specific lecture watches / quiz attempts / certificates to populate cards
        const certRes = await fetch('/api/certificates/my', { headers: emailHeaders });
        if (certRes.ok) {
          const certs = await certRes.json();
          setAnalytics(certs); // Use as certificate list
        }
        
        // Quick progress calculation
        const progressRes = await fetch('/api/courses');
        if (progressRes.ok) {
          const allCourses = await progressRes.json();
          const studentCourses = allCourses.filter((c: Course) => c.department === user.department && c.semester === user.semester);
          const mockProgress: { [courseId: string]: number } = {};
          studentCourses.forEach((c: Course) => {
            // Simulated calculation for student dashboard progress rings
            mockProgress[c.id] = c.id === 'course-ai-301' ? 33 : 0;
          });
          setStudentProgress(mockProgress);
        }
      }
    } catch (err) {
      console.error('Error loading dashboard datasets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  // Admin user approvals
  const handleApproveTeacher = async (teacherId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${teacherId}/approve`, {
        method: 'POST',
        headers: { 'x-user-email': user.email }
      });
      if (res.ok) {
        alert('Teacher successfully approved and activated.');
        loadDashboardData();
      }
    } catch (err) {
      alert('Verification node unreachable.');
    }
  };

  const handleRejectTeacher = async (teacherId: string) => {
    if (!confirm('Are you sure you want to reject and delete this registration?')) return;
    try {
      const res = await fetch(`/api/admin/users/${teacherId}/reject`, {
        method: 'POST',
        headers: { 'x-user-email': user.email }
      });
      if (res.ok) {
        loadDashboardData();
      }
    } catch (err) {
      alert('Action failed.');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-10 h-10 border-4 border-[#1F315D] border-t-[#D4A017] rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500 font-medium">Synchronizing Academic Records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* ------------------- STUDENT DASHBOARD ------------------- */}
      {user.role === 'student' && (
        <>
          {/* Welcome Banner */}
          <div className="bg-[#1F315D] rounded-2xl p-6 md:p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden shadow-xl border-l-8 border-[#D4A017]">
            <div className="absolute -right-16 -bottom-16 w-48 h-48 rounded-full bg-white/5 blur-2xl"></div>
            <div className="space-y-2 relative z-10">
              <span className="text-[10px] uppercase tracking-widest text-[#D4A017] font-semibold bg-white/10 px-2.5 py-1 rounded-full">Student Workspace</span>
              <h1 className="text-2xl md:text-3xl font-serif font-bold">Welcome back, {user.name}</h1>
              <p className="text-xs text-gray-300">Enrollment Active • Semester {user.semester} • Department of {user.department}</p>
            </div>
            <button
              onClick={() => onNavigate('courses')}
              className="mt-4 md:mt-0 bg-[#D4A017] hover:bg-[#c29112] text-[#1F315D] px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-sm hover:shadow transition-all relative z-10 flex items-center gap-1.5 active:scale-95"
            >
              Explore Course Syllabus <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <span className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold block">Registered Classes</span>
              <div className="flex justify-between items-end mt-2">
                <span className="text-2xl font-serif font-bold text-[#1F315D]">{courses.length}</span>
                <div className="p-2 bg-[#1F315D]/5 text-[#1F315D] rounded-xl"><BookOpen className="w-4 h-4" /></div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <span className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold block">Earned Certificates</span>
              <div className="flex justify-between items-end mt-2">
                <span className="text-2xl font-serif font-bold text-[#1F315D]">{analytics?.length || 0}</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Award className="w-4 h-4" /></div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <span className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold block">Pending Tasks</span>
              <div className="flex justify-between items-end mt-2">
                <span className="text-2xl font-serif font-bold text-[#1F315D]">1</span>
                <div className="p-2 bg-red-50 text-red-600 rounded-xl"><ClipboardList className="w-4 h-4" /></div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <span className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold block">Upcoming Evaluat.</span>
              <div className="flex justify-between items-end mt-2">
                <span className="text-2xl font-serif font-bold text-[#1F315D]">1 Quiz</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Clock className="w-4 h-4" /></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left/Middle Column: Continue Study and Recent Enrolls */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Continue Learning Widget */}
              <div>
                <h2 className="text-lg font-serif font-bold text-[#1F315D] mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#D4A017]" /> Continue Learning Ch Chords
                </h2>
                {courses.length > 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 hover:shadow-md transition-all">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div>
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full inline-block">{courses[0].code}</span>
                        <h3 className="font-serif font-bold text-[#1F315D] text-base mt-1.5">{courses[0].title}</h3>
                        <p className="text-xs text-gray-400 mt-1">Instructor: {courses[0].teacherName}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="block text-xs font-semibold text-[#1F315D]">{studentProgress[courses[0].id] || 0}% Done</span>
                          <span className="block text-[10px] text-gray-400">1 of 3 Lectures watched</span>
                        </div>
                        <button
                          onClick={() => onNavigate('course-details', courses[0].id)}
                          className="bg-[#1F315D] text-white hover:bg-[#2A427D] px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider"
                        >
                          Resume
                        </button>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4">
                      <div className="bg-[#D4A017] h-1.5 rounded-full" style={{ width: `${studentProgress[courses[0].id] || 0}%` }}></div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-xs text-gray-400">
                    No active courses for your registered semester/dept yet.
                  </div>
                )}
              </div>

              {/* Course Syllabus Grid Shortcut */}
              <div>
                <h2 className="text-lg font-serif font-bold text-[#1F315D] mb-4">My Academic Semester Schedule</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {courses.map(c => (
                    <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-2xs hover:shadow transition-all relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-1 bg-[#D4A017] h-full group-hover:h-full transition-all"></div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">{c.code} • {c.department}</span>
                      <h4 className="font-serif font-bold text-sm text-[#1F315D] mt-1 group-hover:text-[#4F46E5] transition-colors">{c.title}</h4>
                      <p className="text-[11px] text-gray-400 mt-1">Professor: {c.teacherName}</p>
                      <button
                        onClick={() => onNavigate('course-details', c.id)}
                        className="text-xs text-[#1F315D] font-bold hover:underline flex items-center gap-0.5 mt-3 group"
                      >
                        Enter Classroom <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Column: Global Announcements & Calendar widget */}
            <div className="space-y-6">
              
              {/* Institutional Bulletins */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-4">
                <h3 className="text-base font-serif font-bold text-[#1F315D] flex items-center gap-2 border-b border-gray-100 pb-3">
                  <Bell className="w-4.5 h-4.5 text-[#D4A017]" /> University Bulletins
                </h3>
                <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
                  {announcements.length > 0 ? (
                    announcements.map(ann => (
                      <div key={ann.id} className="border-b border-gray-100 last:border-b-0 pb-3 last:pb-0">
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-semibold text-gray-800 leading-snug">{ann.title}</h4>
                          <span className="text-[8px] uppercase tracking-wider text-[#D4A017] bg-[#1F315D]/5 px-1.5 py-0.5 rounded font-bold">{ann.authorRole}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1 leading-normal line-clamp-2">{ann.content}</p>
                        <span className="text-[9px] text-gray-400 mt-1.5 block">By {ann.authorName} • {new Date(ann.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 text-center">No publications reported.</p>
                  )}
                </div>
              </div>

              {/* Semester Calendar widget */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
                <h3 className="text-base font-serif font-bold text-[#1F315D] flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
                  <Calendar className="w-4.5 h-4.5 text-[#D4A017]" /> Academic Planner
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-3 items-start bg-[#F8F5EE] p-3 rounded-xl border border-gray-100">
                    <div className="bg-[#1F315D] text-white p-2.5 rounded-lg text-center shrink-0 w-11 h-11 flex flex-col justify-center">
                      <span className="block text-[8px] uppercase tracking-widest leading-none text-gray-300">JUL</span>
                      <span className="block text-base font-serif font-bold leading-none mt-0.5">10</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-800">A* Manhattan Search Deadline</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">CS-301 Theory Submission</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start bg-[#F8F5EE] p-3 rounded-xl border border-gray-100">
                    <div className="bg-[#1F315D] text-white p-2.5 rounded-lg text-center shrink-0 w-11 h-11 flex flex-col justify-center">
                      <span className="block text-[8px] uppercase tracking-widest leading-none text-gray-300">JUL</span>
                      <span className="block text-base font-serif font-bold leading-none mt-0.5">15</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-800">Final Coursework Quiz Closes</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">Automated Certificate unlocking</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </>
      )}


      {/* ------------------- TEACHER DASHBOARD ------------------- */}
      {user.role === 'teacher' && (
        <>
          {/* Welcome Card */}
          <div className="bg-[#1F315D] rounded-2xl p-6 md:p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden shadow-xl border-l-8 border-[#D4A017]">
            <div className="absolute -right-16 -bottom-16 w-48 h-48 rounded-full bg-white/5 blur-2xl"></div>
            <div className="space-y-2 relative z-10">
              <span className="text-[10px] uppercase tracking-widest text-[#D4A017] font-semibold bg-white/10 px-2.5 py-1 rounded-full">Professor Workspace</span>
              <h1 className="text-2xl md:text-3xl font-serif font-bold">Welcome, {user.name}</h1>
              <p className="text-xs text-gray-300">Department Faculty Lead • {user.department}</p>
            </div>
            <button
              onClick={() => onNavigate('uploads')}
              className="mt-4 md:mt-0 bg-[#D4A017] hover:bg-[#c29112] text-[#1F315D] px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-sm transition-all relative z-10 flex items-center gap-1.5 active:scale-95"
            >
              <UploadCloud className="w-4 h-4" /> Upload Study Material
            </button>
          </div>

          {/* Teacher Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <span className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold block">Courses Lecturing</span>
              <div className="flex justify-between items-end mt-2">
                <span className="text-2xl font-serif font-bold text-[#1F315D]">{courses.length}</span>
                <div className="p-2 bg-[#1F315D]/5 text-[#1F315D] rounded-xl"><BookOpen className="w-4 h-4" /></div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <span className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold block">Assigned Students</span>
              <div className="flex justify-between items-end mt-2">
                <span className="text-2xl font-serif font-bold text-[#1F315D]">1,240</span>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Users className="w-4 h-4" /></div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <span className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold block">Files Published</span>
              <div className="flex justify-between items-end mt-2">
                <span className="text-2xl font-serif font-bold text-[#1F315D]">7 Uploads</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><UploadCloud className="w-4 h-4" /></div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <span className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold block">Certificates Awarded</span>
              <div className="flex justify-between items-end mt-2">
                <span className="text-2xl font-serif font-bold text-[#1F315D]">12</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Award className="w-4 h-4" /></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Col: Pending student assignments */}
            <div className="lg:col-span-2 space-y-6">
              
              <div>
                <h3 className="text-lg font-serif font-bold text-[#1F315D] mb-4 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-[#D4A017]" /> Pending Assignment Reviews ({pendingSubmissions.length})
                </h3>
                
                {pendingSubmissions.length > 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                    <div className="divide-y divide-gray-100">
                      {pendingSubmissions.map(sub => (
                        <div key={sub.id} className="p-4 sm:p-5 hover:bg-gray-50/50 transition-colors flex justify-between items-center">
                          <div>
                            <span className="text-[10px] bg-[#1F315D]/5 text-[#1F315D] font-bold px-2 py-0.5 rounded-full inline-block">Review Required</span>
                            <h4 className="text-xs font-bold text-gray-800 mt-1">Alex Mercer Submitted Assignment 01</h4>
                            <p className="text-[11px] text-gray-400 mt-0.5">Submitted: {new Date(sub.submittedAt).toLocaleDateString()} {sub.isLate && <strong className="text-red-500 font-semibold">(LATE)</strong>}</p>
                          </div>
                          <button
                            onClick={() => onNavigate('courses')}
                            className="bg-[#1F315D] text-white hover:bg-[#2A427D] py-1.5 px-3.5 rounded-xl text-xs font-medium uppercase tracking-wider"
                          >
                            Grade & Feedback
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center space-y-3 shadow-3xs">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                    <div>
                      <h4 className="text-xs font-bold text-gray-800">Inbox Completely Clear!</h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">There are no pending student assignment submissions awaiting reviews currently.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* My Managed Courses */}
              <div>
                <h3 className="text-lg font-serif font-bold text-[#1F315D] mb-4">My Lecturing Curriculum</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {courses.map(c => (
                    <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-3xs hover:shadow transition-all relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 bg-[#D4A017] h-full"></div>
                      <span className="text-[9px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-full">{c.code}</span>
                      <h4 className="font-serif font-bold text-base text-[#1F315D] mt-2 group-hover:text-[#4F46E5] transition-colors">{c.title}</h4>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{c.description}</p>
                      
                      <div className="flex gap-2.5 mt-4 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => onNavigate('course-details', c.id)}
                          className="flex-1 bg-[#1F315D] text-white hover:bg-[#2A427D] text-center py-2 rounded-xl text-xs font-semibold"
                        >
                          Syllabus Classroom
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Col: Announcements & Quick shortcuts */}
            <div className="space-y-6">
              
              {/* Quick material shortcuts */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-3">
                <h3 className="text-base font-serif font-bold text-[#1F315D] border-b border-gray-100 pb-3">Faculty Shortcuts</h3>
                <button
                  onClick={() => onNavigate('uploads')}
                  className="w-full flex items-center justify-between text-left p-3.5 bg-[#F8F5EE] hover:bg-[#1F315D]/5 rounded-xl border border-gray-100 text-xs font-bold text-[#1F315D] transition-colors"
                >
                  <span>Publish Syllabus Resources</span> <ArrowUpRight className="w-4 h-4 text-[#D4A017]" />
                </button>
                <button
                  onClick={() => onNavigate('announcements')}
                  className="w-full flex items-center justify-between text-left p-3.5 bg-[#F8F5EE] hover:bg-[#1F315D]/5 rounded-xl border border-gray-100 text-xs font-bold text-[#1F315D] transition-colors"
                >
                  <span>Publish Course Announcement</span> <ArrowUpRight className="w-4 h-4 text-[#D4A017]" />
                </button>
              </div>

              {/* Bulletins */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-4">
                <h3 className="text-base font-serif font-bold text-[#1F315D] flex items-center gap-2 border-b border-gray-100 pb-3">
                  <Bell className="w-4.5 h-4.5 text-[#D4A017]" /> General Bulletins
                </h3>
                <div className="space-y-3.5">
                  {announcements.slice(0, 3).map(ann => (
                    <div key={ann.id} className="border-b border-gray-50 last:border-b-0 pb-3 last:pb-0">
                      <h4 className="text-xs font-bold text-gray-800 leading-snug">{ann.title}</h4>
                      <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">{ann.content}</p>
                      <span className="text-[9px] text-gray-400 block mt-1">Author: {ann.authorName}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </>
      )}


      {/* ------------------- ADMIN DASHBOARD ------------------- */}
      {user.role === 'admin' && (
        <>
          {/* Administrator Banner */}
          <div className="bg-[#1F315D] rounded-2xl p-6 md:p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden shadow-xl border-l-8 border-[#D4A017]">
            <div className="absolute -right-16 -bottom-16 w-48 h-48 rounded-full bg-white/5 blur-2xl"></div>
            <div className="space-y-2 relative z-10">
              <span className="text-[10px] uppercase tracking-widest text-[#D4A017] font-semibold bg-white/10 px-2.5 py-1 rounded-full">Administrator Terminal</span>
              <h1 className="text-2xl md:text-3xl font-serif font-bold">{user.name} Dashboard</h1>
              <p className="text-xs text-gray-300">Nexus University System Core Authority</p>
            </div>
            <div className="flex gap-2.5 relative z-10 mt-4 md:mt-0">
              <button
                onClick={() => onNavigate('admin-users')}
                className="bg-[#D4A017] hover:bg-[#c29112] text-[#1F315D] px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-sm transition-all active:scale-95"
              >
                Manage Directory
              </button>
            </div>
          </div>

          {/* Admin Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <span className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold block">Total Students</span>
              <div className="flex justify-between items-end mt-2">
                <span className="text-2xl font-serif font-bold text-[#1F315D]">{analytics?.studentCount || 0}</span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Users className="w-4 h-4" /></div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <span className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold block">Active Professors</span>
              <div className="flex justify-between items-end mt-2">
                <span className="text-2xl font-serif font-bold text-[#1F315D]">{analytics?.teacherCount || 0}</span>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Users className="w-4 h-4" /></div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <span className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold block">Active Classes</span>
              <div className="flex justify-between items-end mt-2">
                <span className="text-2xl font-serif font-bold text-[#1F315D]">{analytics?.coursesCount || 0}</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><BookOpen className="w-4 h-4" /></div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <span className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold block">Certificates Issued</span>
              <div className="flex justify-between items-end mt-2">
                <span className="text-2xl font-serif font-bold text-[#1F315D]">{analytics?.certsCount || 0}</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Award className="w-4 h-4" /></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Col: approvals & Logs */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Approvals */}
              <div>
                <h3 className="text-lg font-serif font-bold text-[#1F315D] mb-4 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-[#D4A017]" /> Faculty Registrations Requiring Approvals
                </h3>
                
                {users.filter(u => u.role === 'teacher' && !u.isApproved).length > 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden divide-y divide-gray-100">
                    {users.filter(u => u.role === 'teacher' && !u.isApproved).map(teacher => (
                      <div key={teacher.id} className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-gray-50/40">
                        <div className="flex gap-3 items-center">
                          <img src={teacher.avatar} alt="Avatar" className="w-10 h-10 rounded-xl object-cover" />
                          <div>
                            <h4 className="text-xs font-bold text-gray-800">{teacher.name}</h4>
                            <p className="text-[11px] text-gray-400">{teacher.email} • Dept of {teacher.department}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleRejectTeacher(teacher.id)}
                            className="bg-red-50 text-red-600 hover:bg-red-100 py-1.5 px-3 rounded-lg text-xs font-semibold"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApproveTeacher(teacher.id)}
                            className="bg-[#1F315D] text-white hover:bg-[#2A427D] py-1.5 px-3.5 rounded-lg text-xs font-semibold"
                          >
                            Approve Access
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-3xs space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                    <div>
                      <h4 className="text-xs font-bold text-gray-800">No Pending Approvals</h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">All registered professors and faculty members are approved.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Audit Logs snapshots */}
              <div>
                <h3 className="text-lg font-serif font-bold text-[#1F315D] mb-4">Secured Operations Audit Log</h3>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                  <div className="divide-y divide-gray-100 max-h-[250px] overflow-y-auto">
                    {recentLogs.map(log => (
                      <div key={log.id} className="p-4 hover:bg-gray-50/50 transition-colors flex justify-between items-center text-xs">
                        <div>
                          <span className="font-semibold text-gray-700 block">{log.action}</span>
                          <span className="text-[10px] text-gray-400 block mt-0.5">{log.details}</span>
                          <span className="text-[9px] text-gray-400 block font-mono mt-0.5">{log.userEmail}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-gray-400 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          <span className="block text-[9px] text-gray-400 font-mono mt-0.5">IP: {log.ipAddress}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Right Col: Telemetries & Health */}
            <div className="space-y-6">
              
              {/* Telemetry and analytics */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-4">
                <h3 className="text-base font-serif font-bold text-[#1F315D] border-b border-gray-100 pb-3 flex items-center gap-1.5">
                  <Activity className="w-4.5 h-4.5 text-[#D4A017]" /> Core Ledger Systems
                </h3>
                
                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between items-center border-b border-gray-50 pb-2.5">
                    <span className="text-gray-500 font-medium">Platform Health:</span>
                    <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span> ONLINE
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-2.5">
                    <span className="text-gray-500 font-medium">Memory Allocation:</span>
                    <span className="text-gray-700 font-mono font-semibold">{analytics?.memoryUsage || '64 MB / 512 MB'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-2.5">
                    <span className="text-gray-500 font-medium">Server CPU Load:</span>
                    <span className="text-gray-700 font-mono font-semibold">{analytics?.cpuLoad || '1.2%'}</span>
                  </div>
                  <div className="flex justify-between items-center pb-1">
                    <span className="text-gray-500 font-medium">Total Files Stored:</span>
                    <span className="text-gray-700 font-mono font-semibold">{analytics?.uploadsCount || 7} items</span>
                  </div>
                </div>
              </div>

              {/* Department distribution */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-3">
                <h3 className="text-base font-serif font-bold text-[#1F315D] border-b border-gray-100 pb-2.5">LMS Departments</h3>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-[#1F315D]">
                  {['Computer Science', 'Cyber Security', 'Civil Engineering', 'Mechanical Engineering', 'MBA'].map(dept => (
                    <div key={dept} className="bg-[#F8F5EE] px-3 py-2.5 rounded-lg border border-gray-100 text-center">
                      {dept}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </>
      )}

    </div>
  );
}
