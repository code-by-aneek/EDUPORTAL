/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, ShieldCheck, Speaker, ArrowUpRight, Megaphone } from 'lucide-react';
import { Announcement, User } from '../types';

interface AnnouncementsPageProps {
  user: User;
}

export default function AnnouncementsPage({ user }: AnnouncementsPageProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetCourseId, setTargetCourseId] = useState('');
  const [courses, setCourses] = useState<any[]>([]);

  const loadAnnouncements = async () => {
    try {
      const res = await fetch('/api/announcements');
      if (res.ok) setAnnouncements(await res.json());

      // If teacher/admin, fetch courses list for announcement scopes
      if (user.role === 'teacher' || user.role === 'admin') {
        const cRes = await fetch('/api/courses');
        if (cRes.ok) {
          const all = await cRes.json();
          setCourses(user.role === 'teacher' ? all.filter((c: any) => c.teacherId === user.id) : all);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, [user]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user.email
        },
        body: JSON.stringify({
          title,
          content,
          courseId: targetCourseId || undefined
        })
      });

      if (res.ok) {
        setTitle('');
        setContent('');
        setTargetCourseId('');
        setShowCreateForm(false);
        alert('Institutional Bulletin published successfully! 📢');
        loadAnnouncements();
      }
    } catch (err) {
      alert('Failed publishing bulletin.');
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to retract this bulletin announcement?')) return;
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-email': user.email }
      });
      if (res.ok) loadAnnouncements();
    } catch (err) {
      alert('Retraction failed.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1F315D] tracking-wide">University Bulletins Board</h1>
          <p className="text-xs text-gray-400 mt-1">Access verified campus announcements, syllabus updates, and faculty briefings.</p>
        </div>

        {(user.role === 'teacher' || user.role === 'admin') && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-[#1F315D] text-white hover:bg-[#2A427D] py-2.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 text-[#D4A017]" /> Compose Announcement
          </button>
        )}
      </div>

      {/* CREATE FORM */}
      {showCreateForm && (
        <form onSubmit={handleCreateAnnouncement} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4 max-w-xl animate-slide-down">
          <span className="block text-xs font-bold text-[#D4A017] uppercase tracking-wider">Compose New Bulletin Draft</span>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1F315D] mb-1">Bulletin Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Mid-semester Exam Schedules released..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1F315D] mb-1">Target Announcement Scope</label>
              <select
                value={targetCourseId}
                onChange={(e) => setTargetCourseId(e.target.value)}
                className="w-full border border-gray-200 bg-white rounded-xl px-3 py-2 text-xs focus:outline-none text-gray-600"
              >
                <option value="">Global (All Department Students)</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>Course: {c.code} - {c.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F315D] mb-1">Bulletin Details Content</label>
            <textarea
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Please take notice that all department students must attend..."
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#1F315D] text-white hover:bg-[#2A427D] px-4 py-2 rounded-lg text-xs font-semibold"
            >
              Publish Notice
            </button>
          </div>
        </form>
      )}

      {/* ANNOUNCEMENTS LIST */}
      <div className="space-y-4 max-w-3xl">
        {announcements.length > 0 ? (
          announcements.map(ann => (
            <div key={ann.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs space-y-4 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 bg-[#D4A017] h-full"></div>
              
              <div className="flex justify-between items-start gap-4">
                <div className="flex gap-3 items-start">
                  <div className="p-2.5 bg-[#1F315D]/5 text-[#1F315D] rounded-xl shrink-0 mt-0.5">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-base text-[#1F315D]">{ann.title}</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">Published on {new Date(ann.createdAt).toLocaleDateString()} at {new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                    {ann.courseId ? 'Course Specific' : 'Global Bulletin'}
                  </span>

                  {(user.role === 'admin' || (user.role === 'teacher' && ann.authorId === user.id)) && (
                    <button
                      onClick={() => handleDeleteAnnouncement(ann.id)}
                      className="text-red-500 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                      title="Retract Announcement"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed bg-[#F8F5EE]/30 p-4 rounded-xl border border-gray-100/30 font-sans">{ann.content}</p>

              <div className="flex items-center gap-2 text-[10px] text-gray-400 font-semibold border-t border-gray-50 pt-3">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-[#D4A017]" /> Conferred By:</span>
                <span className="text-gray-700 uppercase tracking-wide">{ann.authorName} ({ann.authorRole})</span>
              </div>

            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-xs text-gray-400 max-w-md mx-auto">
            <Bell className="w-10 h-10 text-gray-200 mx-auto animate-bounce mb-3" />
            <h4 className="font-serif font-bold text-sm text-[#1F315D] mb-1">Bulletins Box Clear</h4>
            <p className="leading-relaxed">There are no publications or active notices posted in the university records at this time.</p>
          </div>
        )}
      </div>

    </div>
  );
}
