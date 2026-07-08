/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, Activity, Award, ShieldAlert, Search, RefreshCw, UserCheck, 
  UserX, Key, Trash2, Database, Download, ShieldCheck, CheckCircle2 
} from 'lucide-react';
import { User, SystemLog, Certificate } from '../types';

interface AdminPageProps {
  currentUser: User;
}

export default function AdminPage({ currentUser }: AdminPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'certs' | 'backup'>('users');
  
  // Searching/filtering
  const [userSearch, setUserSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');
  
  // Edit Password modal states
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(true);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const emailHeaders = { 'x-user-email': currentUser.email };
      const [usersRes, logsRes, certsRes] = await Promise.all([
        fetch('/api/admin/users', { headers: emailHeaders }),
        fetch('/api/admin/logs', { headers: emailHeaders }),
        fetch('/api/admin/certificates', { headers: emailHeaders })
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (logsRes.ok) setLogs(await logsRes.json());
      if (certsRes.ok) setCerts(await certsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [currentUser]);

  // Approve / Reject Teacher
  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/approve`, {
        method: 'POST',
        headers: { 'x-user-email': currentUser.email }
      });
      if (res.ok) {
        alert('Faculty profile approved successfully.');
        loadAdminData();
      }
    } catch (err) {
      alert('Approval failed.');
    }
  };

  // Deactivate / Activate Student/Teacher
  const handleToggleActive = async (id: string, currentlyActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/toggle-active`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email
        },
        body: JSON.stringify({ isActive: !currentlyActive })
      });
      if (res.ok) {
        alert(`User profile ${!currentlyActive ? 'activated' : 'deactivated'} successfully.`);
        loadAdminData();
      }
    } catch (err) {
      alert('Status change failed.');
    }
  };

  // Change user password override
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId || !newPassword.trim()) return;

    try {
      const res = await fetch(`/api/admin/users/${targetUserId}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email
        },
        body: JSON.stringify({ newPassword })
      });

      if (res.ok) {
        alert('Credential credentials modified successfully on Nexus records.');
        setTargetUserId(null);
        setNewPassword('');
        loadAdminData();
      } else {
        alert('Password update rejected.');
      }
    } catch (err) {
      alert('Override connection failed.');
    }
  };

  // Reset database sandbox helper
  const handleResetDatabase = async () => {
    if (!confirm('Warning: This will restore the database to standard sandbox demo records. All custom entries will be reset. Proceed?')) return;
    
    try {
      const res = await fetch('/api/admin/database/reset', {
        method: 'POST',
        headers: { 'x-user-email': currentUser.email }
      });
      if (res.ok) {
        alert('Database sandbox fully restored to default institutional profiles.');
        loadAdminData();
      }
    } catch (err) {
      alert('Reset failed.');
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.department.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(logSearch.toLowerCase()) ||
    l.details.toLowerCase().includes(logSearch.toLowerCase()) ||
    l.userEmail.toLowerCase().includes(logSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-10 h-10 border-4 border-[#1F315D] border-t-[#D4A017] rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500">Retrieving Secure Administrative Indexes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#1F315D] tracking-wide">LMS Security Administration</h1>
        <p className="text-xs text-gray-400 mt-1">Institutional governance terminal to manage campus directories, operations logs, certificates, and ledger states.</p>
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 text-xs font-semibold tracking-wide border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${activeTab === 'users' ? 'border-[#1F315D] text-[#1F315D]' : 'border-transparent text-gray-400'}`}
          >
            <Users className="w-4 h-4" /> Academic Directories ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-3 text-xs font-semibold tracking-wide border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${activeTab === 'logs' ? 'border-[#1F315D] text-[#1F315D]' : 'border-transparent text-gray-400'}`}
          >
            <Activity className="w-4 h-4" /> Operations Audit Log ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab('certs')}
            className={`pb-3 text-xs font-semibold tracking-wide border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${activeTab === 'certs' ? 'border-[#1F315D] text-[#1F315D]' : 'border-transparent text-gray-400'}`}
          >
            <Award className="w-4 h-4" /> Issued Credentials ({certs.length})
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`pb-3 text-xs font-semibold tracking-wide border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${activeTab === 'backup' ? 'border-[#1F315D] text-[#1F315D]' : 'border-transparent text-gray-400'}`}
          >
            <Database className="w-4 h-4" /> Ledger & Backups
          </button>
        </div>
      </div>

      {/* TAB CONTENT: USERS DIRECTORY */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search academic name, email, department..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 uppercase tracking-widest text-gray-500 font-bold text-[10px]">
                  <th className="p-4">Academic User Details</th>
                  <th className="p-4">Institutional Role</th>
                  <th className="p-4">Department / Semester</th>
                  <th className="p-4">Governance Status</th>
                  <th className="p-4 text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/45">
                    <td className="p-4">
                      <div className="flex gap-3 items-center">
                        <img src={u.avatar} alt="Avatar" className="w-9 h-9 rounded-xl object-cover border border-gray-100 shrink-0" />
                        <div>
                          <strong className="text-gray-800 font-semibold block">{u.name}</strong>
                          <span className="text-gray-400 text-[10px] block font-mono">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${u.role === 'admin' ? 'bg-red-50 text-red-700' : u.role === 'teacher' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-600 block">{u.department}</span>
                      <span className="text-gray-400 text-[10px] block">{u.role === 'student' ? `${u.semester} Sem` : 'Faculty Head'}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block text-center ${u.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                          {u.isActive ? 'ACCOUNT ACTIVE' : 'LOCKED / SUSPENDED'}
                        </span>
                        {u.role === 'teacher' && (
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block text-center ${u.isApproved ? 'bg-indigo-50 text-indigo-800' : 'bg-amber-50 text-amber-800'}`}>
                            {u.isApproved ? 'VERIFIED FACULTY' : 'AWAITING SIGN-OFF'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right space-x-1.5">
                      {u.role === 'teacher' && !u.isApproved && (
                        <button
                          onClick={() => handleApprove(u.id)}
                          className="bg-[#1F315D] text-white hover:bg-[#2A427D] py-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-2xs"
                        >
                          Verify Profile
                        </button>
                      )}
                      
                      <button
                        onClick={() => {
                          setTargetUserId(u.id);
                          setNewPassword('');
                        }}
                        className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 py-1.5 px-2.5 rounded-lg text-[10px] font-bold"
                        title="Override secure credentials password"
                      >
                        Override Password
                      </button>

                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleActive(u.id, u.isActive)}
                          className={`py-1.5 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${u.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                        >
                          {u.isActive ? 'Lock Profile' : 'Unlock Profile'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <input
              type="text"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="Search actions, username, IP address..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 uppercase tracking-widest text-gray-500 font-bold text-[10px]">
                  <th className="p-4">Operations Action</th>
                  <th className="p-4">Parameters & Details</th>
                  <th className="p-4">Actor Email</th>
                  <th className="p-4">Terminal IP Node</th>
                  <th className="p-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                {filteredLogs.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50/45">
                    <td className="p-4 font-bold text-[#1F315D]">{l.action}</td>
                    <td className="p-4 text-gray-600 font-sans">{l.details}</td>
                    <td className="p-4 text-gray-500">{l.userEmail}</td>
                    <td className="p-4 text-gray-400">{l.ipAddress}</td>
                    <td className="p-4 text-right text-gray-400">{new Date(l.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ISSUED CREDENTIALS */}
      {activeTab === 'certs' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 uppercase tracking-widest text-gray-500 font-bold text-[10px]">
                  <th className="p-4">Credential Recipient</th>
                  <th className="p-4">Curriculum Course</th>
                  <th className="p-4">Verified Ledgers ID</th>
                  <th className="p-4">Signatories Faculty</th>
                  <th className="p-4 text-right">Conferred Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {certs.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/45 text-xs text-gray-700">
                    <td className="p-4">
                      <strong className="text-[#1F315D] font-serif font-bold block">{c.studentName}</strong>
                      <span className="text-gray-400 text-[10px] block">{c.studentId}</span>
                    </td>
                    <td className="p-4 font-semibold">{c.courseName}</td>
                    <td className="p-4 font-mono text-gray-500 text-[10px]">{c.certificateId}</td>
                    <td className="p-4">
                      <span className="text-gray-600 block">{c.instructorName}</span>
                      <span className="text-gray-400 text-[9px] block">Approved by {c.adminName}</span>
                    </td>
                    <td className="p-4 text-right text-gray-400">{c.issueDate}</td>
                  </tr>
                ))}
                {certs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400 text-xs font-semibold">No digital achievements registered yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: DATABASE BACKUPS */}
      {activeTab === 'backup' && (
        <div className="max-w-xl bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-6">
          <div className="flex gap-4 items-start bg-amber-50 border border-amber-200/50 p-4 rounded-xl">
            <ShieldAlert className="w-6 h-6 text-amber-700 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <h4 className="text-sm font-bold text-amber-800">Secure Governance Safeguard Settings</h4>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                As a system administrator, you have permission to download complete ledger catalogs or reset Sandbox memory to standard, pre-approved faculty accounts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            
            {/* Backup */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col justify-between space-y-4">
              <div>
                <h5 className="text-xs font-bold text-[#1F315D] flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-[#D4A017]" /> Download JSON Ledger
                </h5>
                <p className="text-[11px] text-gray-400 mt-1">Download raw JSON file backup containing all campus directories, courses, submissions and discussion threads.</p>
              </div>
              <a 
                href="/database.json" 
                download="nexus_learning_ledger_backup.json" 
                className="bg-white hover:bg-gray-100 text-[#1F315D] text-center border border-gray-200 py-2 rounded-lg text-xs font-semibold transition-colors"
              >
                Extract Backup File
              </a>
            </div>

            {/* Restore */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col justify-between space-y-4">
              <div>
                <h5 className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4" /> Restore Default Database
                </h5>
                <p className="text-[11px] text-gray-400 mt-1">Clear custom submissions, registered students, test posts and revert the sandbox state back to default credentials.</p>
              </div>
              <button
                type="button"
                onClick={handleResetDatabase}
                className="bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-lg text-xs font-semibold transition-colors"
              >
                Restore Sandbox
              </button>
            </div>

          </div>
        </div>
      )}


      {/* MODAL: ADMINISTRATOR CREDENTIALS OVERRIDE */}
      {targetUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-2xs">
          <form onSubmit={handleChangePassword} className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <h3 className="text-lg font-serif font-bold text-[#1F315D]">Credential Password Override</h3>
            <p className="text-xs text-gray-400">Force set a new login password for this academic profile.</p>

            <div>
              <label className="block text-xs font-bold text-[#1F315D] mb-1">New Secure Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setTargetUserId(null)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#1F315D] text-white hover:bg-[#2A427D] px-4 py-2 rounded-lg text-xs font-semibold"
              >
                Confirm Override
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
