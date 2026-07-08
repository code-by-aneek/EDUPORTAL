/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Award, GraduationCap, ShieldCheck, BookOpen, AlertCircle, Eye, EyeOff, CheckCircle2, Lock, ArrowRight, Clipboard } from 'lucide-react';
import { UserRole } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  // Screens: 'login' | 'register' | 'forgot'
  const [activeScreen, setActiveScreen] = useState<'login' | 'register' | 'forgot'>('login');
  
  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRole, setLoginRole] = useState<UserRole>('student');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register state
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);
  const [regRole, setRegRole] = useState<'student' | 'teacher'>('student');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDept, setRegDept] = useState('Computer Science');
  const [regSemester, setRegSemester] = useState('1st');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0); // 0-4

  // OTP Verification States
  const [otpVal, setOtpVal] = useState<string[]>(Array(6).fill(''));
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const [debugOtpCode, setDebugOtpCode] = useState(''); // Visual mock OTP helper

  // Forgot password states
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1); // 1: Email, 2: OTP, 3: New Pwd
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Password strength checker helper
  useEffect(() => {
    let score = 0;
    if (regPassword.length >= 6) score += 1;
    if (/[A-Z]/.test(regPassword)) score += 1;
    if (/[0-9]/.test(regPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(regPassword)) score += 1;
    setPasswordStrength(score);
  }, [regPassword]);

  // Resend OTP timer effect
  useEffect(() => {
    let interval: any;
    if (activeScreen === 'register' && regStep === 2 && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setIsResendDisabled(false);
    }
    return () => clearInterval(interval);
  }, [resendTimer, regStep, activeScreen]);

  // Instant login helper for evaluation
  const handleDemoLogin = (role: UserRole) => {
    const creds = {
      student: { email: 'student@nexus.edu', pass: 'nexus123' },
      teacher: { email: 'teacher@nexus.edu', pass: 'nexus123' },
      admin: { email: 'admin@nexus.edu', pass: 'nexus123' }
    };
    const target = creds[role];
    setLoginEmail(target.email);
    setLoginPassword(target.pass);
    setLoginRole(role);
  };

  // Submit Login Handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginEmail || !loginPassword) {
      setLoginError('All institutional login credentials are required.');
      return;
    }

    if (!loginEmail.endsWith('@nexus.edu')) {
      setLoginError('Only emails ending with @nexus.edu are permitted institutional access.');
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword, role: loginRole })
      });
      const data = await response.json();
      if (response.ok) {
        onLoginSuccess(data.user, data.token);
      } else {
        setLoginError(data.error || 'Login failed. Please check credentials.');
      }
    } catch (err) {
      setLoginError('Network failure. Please ensure backend is booted.');
    }
  };

  // Step 1: Basic Register Check
  const handleRegisterStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regName || !regEmail || !regPassword || !regConfirmPassword) {
      setRegError('Please complete all academic registration fields.');
      return;
    }

    if (!regEmail.endsWith('@nexus.edu')) {
      setRegError('Institutional registrations restricted to @nexus.edu addresses.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }

    if (regPassword.length < 6) {
      setRegError('For safety, institutional passwords must be at least 6 characters.');
      return;
    }

    try {
      const checkRes = await fetch('/api/auth/register-step1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail, name: regName, role: regRole, password: regPassword })
      });
      const checkData = await checkRes.json();
      if (!checkRes.ok) {
        setRegError(checkData.error || 'Details verification failed.');
        return;
      }

      // Progress to OTP - trigger sending OTP
      sendRegistrationOtp();
    } catch (err) {
      setRegError('Server error validating registrations.');
    }
  };

  // Send Registration OTP Helper
  const sendRegistrationOtp = async () => {
    setRegError('');
    try {
      const otpRes = await fetch('/api/auth/register-send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regEmail,
          payload: {
            name: regName,
            role: regRole,
            phone: regPhone,
            department: regDept,
            semester: regRole === 'student' ? regSemester : 'N/A',
            password: regPassword
          }
        })
      });
      const otpData = await otpRes.json();
      if (otpRes.ok) {
        setDebugOtpCode(otpData.debugOtp || '');
        setOtpSuccessMessage('Institutional OTP code dispatched successfully.');
        setRegStep(2);
        setResendTimer(30);
        setIsResendDisabled(true);
      } else {
        setRegError(otpData.error || 'Failed to dispatch verification OTP.');
      }
    } catch (err) {
      setRegError('Could not connect to authentication services.');
    }
  };

  // Paste OTP Support
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      const digits = pasted.split('');
      setOtpVal(digits);
      // Auto submit or focus last
      otpInputsRef.current[5]?.focus();
    }
  };

  // Handle single digit OTP change
  const handleOtpChange = (index: number, val: string) => {
    if (isNaN(Number(val))) return;
    const nextVal = [...otpVal];
    nextVal[index] = val;
    setOtpVal(nextVal);

    if (val !== '' && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  // Handle backspace navigation in OTP
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && otpVal[index] === '' && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // Step 2: Complete OTP verification
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    const fullOtp = otpVal.join('');
    if (fullOtp.length < 6) {
      setRegError('Please input the entire 6-digit institutional OTP code.');
      return;
    }

    setOtpLoading(true);
    try {
      const verifyRes = await fetch('/api/auth/register-verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail, otp: fullOtp })
      });
      const verifyData = await verifyRes.json();
      if (verifyRes.ok) {
        setRegStep(3); // Registration success screen!
      } else {
        setRegError(verifyData.error || 'Verification code match failed.');
      }
    } catch (err) {
      setRegError('Failed connecting to secure verification nodes.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Forgot password workflow
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (forgotStep === 1) {
      if (!forgotEmail || !forgotEmail.endsWith('@nexus.edu')) {
        setRegError('Valid @nexus.edu institutional email is required.');
        return;
      }
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotEmail })
        });
        const data = await res.json();
        if (res.ok) {
          setDebugOtpCode(data.debugOtp || '');
          setForgotStep(2);
        } else {
          setRegError(data.error || 'Failed sending recovery request.');
        }
      } catch (err) {
        setRegError('Network error starting recovery.');
      }
    } else if (forgotStep === 2) {
      const code = otpVal.join('');
      if (code.length < 6) {
        setRegError('Enter 6 digit OTP.');
        return;
      }
      setForgotStep(3);
    } else if (forgotStep === 3) {
      if (newPassword !== confirmNewPassword) {
        setRegError('Passwords must match.');
        return;
      }
      if (newPassword.length < 6) {
        setRegError('Password too weak.');
        return;
      }
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotEmail, newPassword, otp: otpVal.join('') })
        });
        const data = await res.json();
        if (res.ok) {
          alert('Password Changed Successfully! Redirecting to Login.');
          setActiveScreen('login');
          setForgotStep(1);
          setForgotEmail('');
          setOtpVal(Array(6).fill(''));
        } else {
          setRegError(data.error || 'Failed updating password.');
        }
      } catch (err) {
        setRegError('Network error completing password update.');
      }
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
    <div id="login-container-split" className="min-h-screen bg-[#F8F5EE] flex flex-col lg:flex-row font-sans">
      
      {/* Left side: Premium University Info & Stats */}
      <div className="lg:w-1/2 bg-[#1F315D] text-white p-8 md:p-16 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r-4 border-[#D4A017]">
        {/* Aesthetic design circle */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#D4A017]/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#4F46E5]/10 blur-3xl pointer-events-none"></div>

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-[#D4A017]/40 backdrop-blur-md">
            <Award className="w-6 h-6 text-[#D4A017]" />
          </div>
          <div>
            <span className="block font-serif text-2xl font-bold tracking-wide">EDUPORTAL</span>
            <span className="block text-[10px] text-[#D4A017] tracking-widest uppercase font-semibold">Nexus Learning Management System</span>
          </div>
        </div>

        {/* Center Illustration/Info Card */}
        <div className="relative z-10 my-12 lg:my-0 space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-serif font-bold leading-tight tracking-wide text-[#F8F5EE]">
              Empowering Higher <br />
              <span className="text-[#D4A017] italic">Academic Excellence</span>
            </h1>
            <p className="text-gray-300 text-sm leading-relaxed max-w-lg">
              Welcome to the unified digital core of Nexus University. Upload syllabus resources, participate in peer course forums, complete interactive quizzes, and earn authenticated digital credentials.
            </p>
          </div>

          {/* Real-time stats section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-white/10">
            <div>
              <span className="block text-2xl font-bold text-[#D4A017] font-serif">1,240+</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest">Students Enrolled</span>
            </div>
            <div>
              <span className="block text-2xl font-bold text-[#D4A017] font-serif">48+</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest">Faculty Members</span>
            </div>
            <div>
              <span className="block text-2xl font-bold text-[#D4A017] font-serif">120+</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest">Active Courses</span>
            </div>
            <div>
              <span className="block text-2xl font-bold text-[#D4A017] font-serif">100%</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest">Secure Ledgers</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-[10px] text-gray-400 flex items-center justify-between border-t border-white/5 pt-4">
          <span>&copy; 2026 Nexus University Academic Trust</span>
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#D4A017]" />
            <span>Digital Credential Verified</span>
          </div>
        </div>

      </div>

      {/* Right side: Login & Sign Up Forms */}
      <div className="lg:w-1/2 p-8 md:p-16 flex items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-xl border border-gray-100 relative">
          
          {/* Form Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-serif font-bold text-[#1F315D] flex items-center gap-2">
              {activeScreen === 'login' && 'Sign In to Portal'}
              {activeScreen === 'register' && `Institutional Register (Step ${regStep}/3)`}
              {activeScreen === 'forgot' && 'Account Recovery'}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {activeScreen === 'login' && 'Please input your @nexus.edu institutional credentials.'}
              {activeScreen === 'register' && 'Only students and teachers with institutional emails can register.'}
              {activeScreen === 'forgot' && 'Reset your secure academic password.'}
            </p>
          </div>

          {/* ACTIVE SCREEN: LOGIN */}
          {activeScreen === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              
              {/* Role Selector Tabs */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">My Institutional Role</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl">
                  {(['student', 'teacher', 'admin'] as UserRole[]).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setLoginRole(r)}
                      className={`py-2 px-1 text-xs font-semibold capitalize rounded-lg transition-all ${loginRole === r ? 'bg-[#1F315D] text-white' : 'text-gray-500 hover:text-[#1F315D]'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Institution Email */}
              <div>
                <label className="block text-xs font-bold text-[#1F315D] mb-1.5">Institutional Email</label>
                <div className="relative">
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@nexus.edu"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#1F315D] focus:border-[#1F315D] transition-colors"
                  />
                  <span className="absolute right-3.5 top-3.5 text-[11px] font-bold text-[#D4A017] tracking-wider uppercase bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded">EDU</span>
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-[#1F315D]">Secure Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setRegError('');
                      setForgotStep(1);
                      setActiveScreen('forgot');
                    }}
                    className="text-[11px] font-medium text-[#4F46E5] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-gray-200 rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#1F315D] focus:border-[#1F315D] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember-me-check"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-[#1F315D] rounded border-gray-300 focus:ring-[#1F315D]"
                />
                <label htmlFor="remember-me-check" className="ml-2 text-xs text-gray-500 font-medium">Remember me on this institutional device</label>
              </div>

              {/* Error box */}
              {loginError && (
                <div className="bg-red-50 text-red-700 text-xs p-3.5 rounded-xl flex gap-2 items-start border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Sign In Button */}
              <button
                type="submit"
                className="w-full bg-[#1F315D] hover:bg-[#2A427D] text-white py-3 px-4 rounded-xl font-medium text-sm transition-all shadow-md flex items-center justify-center gap-1.5 hover:shadow-lg active:scale-99"
              >
                Sign In to LMS <ArrowRight className="w-4 h-4" />
              </button>

              {/* Divider / Register Navigation */}
              <div className="text-center pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-400">New to Nexus? </span>
                <button
                  type="button"
                  onClick={() => {
                    setRegError('');
                    setRegStep(1);
                    setActiveScreen('register');
                  }}
                  className="text-xs font-bold text-[#4F46E5] hover:underline"
                >
                  Register Account
                </button>
              </div>

              {/* Easy Demo Logins Area */}
              <div className="bg-amber-50/50 border border-amber-200/55 rounded-xl p-4 mt-6">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-2.5 flex items-center gap-1">
  <ShieldCheck className="w-3.5 h-3.5" /> Sandbox Demo Fast Access:
</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('student')}
                    className="bg-white hover:bg-amber-50 text-[11px] font-semibold py-1.5 px-2 rounded-lg border border-amber-200 text-[#1F315D] text-center"
                  >
                    Student Demo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('teacher')}
                    className="bg-white hover:bg-amber-50 text-[11px] font-semibold py-1.5 px-2 rounded-lg border border-amber-200 text-[#1F315D] text-center"
                  >
                    Teacher Demo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('admin')}
                    className="bg-white hover:bg-amber-50 text-[11px] font-semibold py-1.5 px-2 rounded-lg border border-amber-200 text-[#1F315D] text-center"
                  >
                    Admin Demo
                  </button>
                </div>
              </div>

            </form>
          )}

          {/* ACTIVE SCREEN: REGISTER */}
          {activeScreen === 'register' && (
            <div className="space-y-5">
              
              {/* STEP 1: Details */}
              {regStep === 1 && (
                <form onSubmit={handleRegisterStep1Submit} className="space-y-4">
                  {/* Role selection - only Student and Teacher */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Registering As</label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-gray-50 border border-gray-100 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setRegRole('student')}
                        className={`py-2 px-4 text-xs font-semibold rounded-lg transition-all ${regRole === 'student' ? 'bg-[#1F315D] text-white' : 'text-gray-500'}`}
                      >
                        Student
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegRole('teacher')}
                        className={`py-2 px-4 text-xs font-semibold rounded-lg transition-all ${regRole === 'teacher' ? 'bg-[#1F315D] text-white' : 'text-gray-500'}`}
                      >
                        Teacher (Pending Appr)
                      </button>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-[#1F315D] mb-1">Full Name</label>
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Alex Mercer"
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1F315D]"
                    />
                  </div>

                  {/* Institutional Email */}
                  <div>
                    <label className="block text-xs font-bold text-[#1F315D] mb-1">Institutional Email (@nexus.edu)</label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="yourname@nexus.edu"
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1F315D]"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold text-[#1F315D] mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+1 (555) 012-3456"
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1F315D]"
                    />
                  </div>

                  {/* Dept & Semester */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#1F315D] mb-1">Department</label>
                      <select
                        value={regDept}
                        onChange={(e) => setRegDept(e.target.value)}
                        className="w-full border border-gray-200 bg-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none"
                      >
                        {departments.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    {regRole === 'student' && (
                      <div>
                        <label className="block text-xs font-bold text-[#1F315D] mb-1">Current Semester</label>
                        <select
                          value={regSemester}
                          onChange={(e) => setRegSemester(e.target.value)}
                          className="w-full border border-gray-200 bg-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none"
                        >
                          {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].map(s => (
                            <option key={s} value={s}>{s} Sem</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Passwords */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#1F315D] mb-1">Password</label>
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1F315D]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#1F315D] mb-1">Confirm</label>
                      <input
                        type="password"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1F315D]"
                      />
                    </div>
                  </div>

                  {/* Password Strength Meter */}
                  {regPassword.length > 0 && (
                    <div>
                      <div className="flex justify-between items-center text-[10px] mb-1 font-semibold text-gray-500">
                        <span>Password Strength:</span>
                        <span className={passwordStrength >= 3 ? 'text-emerald-600' : 'text-amber-600'}>
                          {passwordStrength === 1 && 'Weak'}
                          {passwordStrength === 2 && 'Fair'}
                          {passwordStrength === 3 && 'Strong'}
                          {passwordStrength === 4 && 'Excellent'}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 h-1.5">
                        {[1, 2, 3, 4].map(s => (
                          <div
                            key={s}
                            className={`rounded h-full transition-colors ${passwordStrength >= s ? (passwordStrength >= 3 ? 'bg-emerald-500' : 'bg-amber-400') : 'bg-gray-100'}`}
                          ></div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error box */}
                  {regError && (
                    <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200 flex gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{regError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-[#1F315D] hover:bg-[#2A427D] text-white py-3 px-4 rounded-xl font-medium text-xs tracking-wider uppercase transition-all shadow-md"
                  >
                    Submit Details & Verify Email
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setActiveScreen('login')}
                      className="text-xs text-[#1F315D] font-bold hover:underline"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: Email OTP */}
              {regStep === 2 && (
                <form onSubmit={handleOtpSubmit} className="space-y-6">
                  <div className="text-center">
                    <span className="text-xs text-gray-500">
                      An institutional OTP has been dispatched to: <br />
                      <strong className="text-[#1F315D]">{regEmail}</strong>
                    </span>
                  </div>

                  {/* 6 Digit Inputs */}
                  <div className="flex justify-between gap-2 max-w-sm mx-auto" onPaste={handleOtpPaste}>
{otpVal.map((digit, idx) => (
  <input
    key={idx}
    ref={(el) => {
      otpInputsRef.current[idx] = el;
    }}
    type="text"
    maxLength={1}
    value={digit}
    onChange={(e) => handleOtpChange(idx, e.target.value)}
    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
    autoFocus={idx === 0}
    className="w-12 h-12 text-center text-xl font-bold border border-gray-200 rounded-xl focus:border-[#1F315D] focus:outline-none"
  />
))}
                  </div>

                  {/* Simulated visual OTP display */}
                  {debugOtpCode && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] p-3 rounded-xl flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span>Sandbox OTP: <strong className="font-mono">{debugOtpCode}</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpVal(debugOtpCode.split(''));
                        }}
                        className="text-xs underline text-amber-900 font-bold flex items-center gap-0.5 hover:text-amber-950"
                        title="Auto-fill verification code"
                      >
                        <Clipboard className="w-3 h-3" /> Auto-fill
                      </button>
                    </div>
                  )}

                  {/* Error box */}
                  {regError && (
                    <div className="bg-red-50 text-red-700 text-xs p-3.5 rounded-xl border border-red-200 flex gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{regError}</span>
                    </div>
                  )}

                  <div className="text-center space-y-3">
                    <button
                      type="submit"
                      disabled={otpLoading}
                      className="w-full bg-[#1F315D] hover:bg-[#2A427D] text-white py-3 px-4 rounded-xl font-medium text-xs tracking-wider uppercase transition-all shadow-md flex justify-center items-center gap-1.5"
                    >
                      {otpLoading ? 'Verifying OTP...' : 'Verify Institutional Code'}
                    </button>

                    <div className="text-xs text-gray-500">
                      {isResendDisabled ? (
                        <span>Resend code in <strong className="text-[#1F315D]">{resendTimer}s</strong></span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            sendRegistrationOtp();
                          }}
                          className="text-[#4F46E5] font-bold hover:underline"
                        >
                          Resend OTP Code
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              )}

              {/* STEP 3: Animated Success Screen */}
              {regStep === 3 && (
                <div className="text-center py-6 space-y-6">
                  <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-12 h-12 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-[#1F315D]">Institutional Registry Approved!</h3>
                    <p className="text-xs text-gray-500 mt-2 max-w-sm mx-auto leading-relaxed">
                      {regRole === 'teacher' 
                        ? 'Your teacher profile has been registered in the system queue. Please await administration verification.' 
                        : 'Institutional synchronization successfully completed. You can now log in.'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveScreen('login');
                      setRegStep(1);
                      setRegName('');
                      setRegEmail('');
                      setRegPassword('');
                    }}
                    className="w-full bg-[#1F315D] hover:bg-[#2A427D] text-white py-3 px-4 rounded-xl font-medium text-xs uppercase transition-all shadow-md"
                  >
                    Go back to Sign In
                  </button>
                </div>
              )}

            </div>
          )}

          {/* ACTIVE SCREEN: FORGOT PASSWORD */}
          {activeScreen === 'forgot' && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              {forgotStep === 1 && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-[#1F315D] mb-1">Enter Institutional Email</label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@nexus.edu"
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#1F315D] text-white py-2.5 rounded-xl font-medium text-xs uppercase shadow-sm hover:bg-[#2A427D]"
                  >
                    Submit Verification Request
                  </button>
                </>
              )}

              {forgotStep === 2 && (
                <>
                  <p className="text-xs text-center text-gray-500 mb-2">Input the recovery verification code sent to {forgotEmail}</p>
                  <div className="flex justify-between gap-2 max-w-sm mx-auto">
                   {otpVal.map((digit, idx) => (
  <input
    key={idx}
    ref={(el) => {
      otpInputsRef.current[idx] = el;
    }}
    type="text"
    maxLength={1}
    value={digit}
    onChange={(e) => handleOtpChange(idx, e.target.value)}
    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
    className="w-12 h-12 text-center text-xl font-bold border border-gray-200 rounded-xl focus:border-[#1F315D] focus:outline-none"
  />
))}
                  </div>
                  {debugOtpCode && (
                    <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-100 text-center font-semibold mt-2 cursor-pointer" onClick={() => setOtpVal(debugOtpCode.split(''))}>
                      Sandbox Recovery Code: <strong>{debugOtpCode}</strong> (Click to fill)
                    </p>
                  )}
                  <button
                    type="submit"
                    className="w-full bg-[#1F315D] text-white py-2.5 rounded-xl font-medium text-xs uppercase shadow-sm hover:bg-[#2A427D]"
                  >
                    Verify Recovery Code
                  </button>
                </>
              )}

              {forgotStep === 3 && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-[#1F315D] mb-1">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1F315D] mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#1F315D] text-white py-2.5 rounded-xl font-medium text-xs uppercase shadow-sm hover:bg-[#2A427D]"
                  >
                    Reset Password
                  </button>
                </>
              )}

              {regError && (
                <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200">
                  {regError}
                </div>
              )}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveScreen('login');
                    setForgotStep(1);
                  }}
                  className="text-xs text-[#1F315D] font-bold hover:underline"
                >
                  Cancel and Sign In
                </button>
              </div>
            </form>
          )}

        </div>
      </div>

    </div>
  );
}
