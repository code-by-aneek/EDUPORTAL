/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, Filter, BookOpen, Plus, Compass, ArrowRight, User, GraduationCap, Briefcase } from 'lucide-react';
import { Course, User as UserType } from '../types';

interface CoursesPageProps {
  user: UserType;
  onNavigate: (view: string, courseId: string) => void;
}

export default function CoursesPage({ user, onNavigate }: CoursesPageProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedSem, setSelectedSem] = useState('');
  
  // Create course modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDept, setNewDept] = useState('Computer Science');
  const [newSem, setNewSem] = useState('1st');
  const [newCredits, setNewCredits] = useState(4);
  const [newPrereqs, setNewPrereqs] = useState('');
  const [newObjectives, setNewObjectives] = useState('');
  const [newCover, setNewCover] = useState('');
  const [createError, setCreateError] = useState('');

  const loadCourses = async () => {
    try {
      const res = await fetch('/api/courses');
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
        setFilteredCourses(data);
      }
    } catch (err) {
      console.error('Error fetching courses list', err);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  // Filter handler
  useEffect(() => {
    let result = [...courses];

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.title.toLowerCase().includes(query) || 
        c.code.toLowerCase().includes(query) || 
        c.teacherName.toLowerCase().includes(query)
      );
    }

    if (selectedDept !== '') {
      result = result.filter(c => c.department === selectedDept);
    }

    if (selectedSem !== '') {
      result = result.filter(c => c.semester === selectedSem);
    }

    setFilteredCourses(result);
  }, [searchQuery, selectedDept, selectedSem, courses]);

  // Create course handler
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!newCode || !newTitle || !newDept || !newSem) {
      setCreateError('Please complete all mandatory academic course identifiers.');
      return;
    }

    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user.email
        },
        body: JSON.stringify({
          code: newCode,
          title: newTitle,
          description: newDesc,
          department: newDept,
          semester: newSem,
          credits: newCredits,
          prerequisites: newPrereqs,
          objectives: newObjectives,
          coverImage: newCover || undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert('Course syllabus entry created successfully!');
        setShowCreateModal(false);
        loadCourses();
        // Reset form
        setNewCode('');
        setNewTitle('');
        setNewDesc('');
        setNewPrereqs('');
        setNewObjectives('');
        setNewCover('');
      } else {
        setCreateError(data.error || 'Failed creating new course line.');
      }
    } catch (err) {
      setCreateError('Network link failed.');
    }
  };

  const departments = [
    'Computer Science',
    'Cyber Security',
    'Civil Engineering',
    'Mechanical Engineering',
    'Electrical Engineering',
    'Electronics Engineering',
    'Food Technology',
    'MBA'
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1F315D] tracking-wide">University Curriculum Syllabus</h1>
          <p className="text-xs text-gray-400 mt-1">Search, organize, and access academic course materials and interactive classrooms.</p>
        </div>

        {(user.role === 'teacher' || user.role === 'admin') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#1F315D] text-white hover:bg-[#2A427D] py-2.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 text-[#D4A017]" /> Add New Course Line
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by course code, title, or lecturing professor..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#1F315D] focus:bg-white transition-colors"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
        </div>

        {/* Filters */}
        <div className="flex gap-2.5">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-600 focus:outline-none bg-white font-medium"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={selectedSem}
            onChange={(e) => setSelectedSem(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-600 focus:outline-none bg-white font-medium"
          >
            <option value="">All Semesters</option>
            {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].map(s => (
              <option key={s} value={s}>{s} Semester</option>
            ))}
          </select>
        </div>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(c => {
            const isEnrolled = user.role === 'student' && c.department === user.department && c.semester === user.semester;
            const teachesThis = user.role === 'teacher' && c.teacherId === user.id;

            return (
              <div 
                key={c.id} 
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-2xs hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col justify-between group"
              >
                {/* Cover Image */}
                <div className="h-40 relative bg-gray-100 overflow-hidden">
                  <img 
                    src={c.coverImage} 
                    alt={c.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
                  
                  {/* Absolute Badge */}
                  <div className="absolute top-3 left-3 flex gap-1.5 items-center">
                    <span className="text-[9px] bg-white text-[#1F315D] font-bold px-2 py-0.5 rounded-md shadow-xs uppercase tracking-wider">
                      {c.code}
                    </span>
                    <span className="text-[9px] bg-[#D4A017] text-white font-bold px-2 py-0.5 rounded-md shadow-xs uppercase tracking-wider">
                      {c.credits} Credits
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 text-white">
                    <span className="block text-[10px] text-gray-200 uppercase tracking-widest font-semibold">{c.department}</span>
                    <h3 className="font-serif font-bold text-sm tracking-wide line-clamp-1 mt-0.5">{c.title}</h3>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{c.description}</p>
                  
                  <div className="space-y-2 border-t border-gray-100 pt-3 text-[11px] text-gray-500 font-medium">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-[#D4A017]" /> Instructor</span>
                      <span className="text-[#1F315D] font-bold">{c.teacherName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5 text-[#D4A017]" /> Current Intake</span>
                      <span className="text-gray-700 font-semibold">{c.semester} Semester Students</span>
                    </div>
                  </div>

                  {/* Enrollment context and buttons */}
                  <div className="border-t border-gray-50 pt-3 flex items-center justify-between">
                    {/* Enrollment label */}
                    <div>
                      {isEnrolled && (
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block">
                          Active Enrollment
                        </span>
                      )}
                      {teachesThis && (
                        <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block">
                          My Lecture Course
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => onNavigate('course-details', c.id)}
                      className="text-xs text-[#1F315D] font-bold hover:text-[#4F46E5] flex items-center gap-0.5 group"
                    >
                      Enter Classroom <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center max-w-md mx-auto space-y-4">
          <Compass className="w-12 h-12 text-[#D4A017] mx-auto animate-pulse" />
          <div>
            <h3 className="font-serif text-lg font-bold text-[#1F315D]">No Curriculum Matches</h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">No course lines matched your current search filters. Please adjust filters or clear the search query.</p>
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedDept('');
              setSelectedSem('');
            }}
            className="bg-[#1F315D] text-white hover:bg-[#2A427D] py-2 px-4 rounded-xl text-xs font-semibold"
          >
            Clear Filters
          </button>
        </div>
      )}


      {/* MODAL: CREATE COURSE */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
            <h2 className="text-xl font-serif font-bold text-[#1F315D] mb-1">Create Course Syllabus Line</h2>
            <p className="text-xs text-gray-400 mb-4">Add a new structured course line for Nexus University departments.</p>

            <form onSubmit={handleCreateCourse} className="space-y-4 overflow-y-auto pr-1 flex-1">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1F315D] mb-1">Course Code (Mandatory)</label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="CS-301"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1F315D] mb-1">Course Credits</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={newCredits}
                    onChange={(e) => setNewCredits(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F315D] mb-1">Course Title (Mandatory)</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Artificial Intelligence"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F315D] mb-1">Course Brief Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Overview of intelligence architectures..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1F315D] mb-1">Department</label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none bg-white"
                  >
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1F315D] mb-1">Target Semester</label>
                  <select
                    value={newSem}
                    onChange={(e) => setNewSem(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none bg-white"
                  >
                    {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].map(s => (
                      <option key={s} value={s}>{s} Semester</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1F315D] mb-1">Prerequisites</label>
                  <input
                    type="text"
                    value={newPrereqs}
                    onChange={(e) => setNewPrereqs(e.target.value)}
                    placeholder="CS-201 (Data Structures)"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1F315D] mb-1">Cover Photo URL (Optional)</label>
                  <input
                    type="text"
                    value={newCover}
                    onChange={(e) => setNewCover(e.target.value)}
                    placeholder="https://images.unsplash.com/photo..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F315D] mb-1">Course Key Objectives</label>
                <input
                  type="text"
                  value={newObjectives}
                  onChange={(e) => setNewObjectives(e.target.value)}
                  placeholder="Train backpropagation networks, implement searches..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              {createError && (
                <div className="bg-red-50 text-red-700 text-xs p-3.5 rounded-xl border border-red-200">
                  {createError}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#1F315D] text-white hover:bg-[#2A427D] px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Confirm Creation
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
