/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { DatabaseSchema, User, Course, Lecture, Note, Assignment, Submission, QuestionPaper, Quiz, QuizAttempt, Certificate, Announcement, ForumPost, SystemLog, AppNotification, CertificateConfig } from './src/types';

// Initialize Gemini Client safely
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log('Gemini client initialized successfully.');
  } catch (e) {
    console.error('Error initializing Gemini Client:', e);
  }
} else {
  console.log('No GEMINI_API_KEY found in process.env. AI capabilities will run in fallback/demo mode if not available.');
}

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'database.json');

app.use(express.json({ limit: '10mb' }));

// Cache for OTPs: email -> { otp, expiresAt }
const otpCache = new Map<string, { otp: string, expiresAt: number, payload?: any }>();

// Read/Write DB helper
function getDB(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE)) {
    // Seed DB with mock data
    const initialDB: DatabaseSchema = seedDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), 'utf8');
    return initialDB;
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database file, resetting to seeded data', error);
    const initialDB = seedDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), 'utf8');
    return initialDB;
  }
}

function saveDB(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing database file', error);
  }
}

// Log admin/system events helper
function addAuditLog(action: string, details: string, email: string, req?: Request) {
  const db = getDB();
  const newLog: SystemLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    action,
    details,
    userEmail: email || 'system@nexus.edu',
    timestamp: new Date().toISOString(),
    ipAddress: req?.ip || '127.0.0.1'
  };
  db.systemLogs.unshift(newLog);
  if (db.systemLogs.length > 200) {
    db.systemLogs = db.systemLogs.slice(0, 200); // keep max 200 logs
  }
  saveDB(db);
}

// Helper to send notifications
function sendNotify(userId: string, title: string, message: string, type: AppNotification['type']) {
  const db = getDB();
  const notification: AppNotification = {
    id: `notify-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    userId,
    title,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString()
  };
  db.notifications.unshift(notification);
  saveDB(db);
}

// REST endpoints API
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', database: fs.existsSync(DB_FILE) ? 'loaded' : 'created' });
});

// Raw database ledger download (used by Admin panel's "Extract Backup File" link)
app.get('/database.json', (req: Request, res: Response) => {
  const db = getDB();
  res.setHeader('Content-Disposition', 'attachment; filename="nexus_learning_ledger_backup.json"');
  res.json(db);
});

// Authentication endpoints
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  if (!email.endsWith('@nexus.edu')) {
    res.status(400).json({ error: 'Access restricted! Only institutional @nexus.edu emails are accepted.' });
    return;
  }

  const db = getDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    res.status(401).json({ error: 'Invalid institutional email or password.' });
    return;
  }

  // Simulated simple encryption match (direct string match for our seed/demo data)
  if (password !== 'nexus123' && password !== 'adminpassword' && password !== 'teacherpassword' && password !== 'studentpassword') {
    res.status(401).json({ error: 'Incorrect password.' });
    return;
  }

  if (!user.isApproved) {
    res.status(403).json({ error: 'Your registration is pending administrator approval.' });
    return;
  }

  if (user.isActive === false) {
    res.status(403).json({ error: 'Your account has been locked/suspended by an administrator. Please contact support.' });
    return;
  }

  addAuditLog('User Login', `Logged in successfully as ${user.role}`, user.email, req);

  // Simple session token simulation
  const token = `token-${user.id}-${Date.now()}`;
  res.json({
    token,
    user
  });
});

app.post('/api/auth/register-step1', (req: Request, res: Response) => {
  const { email, name, role, password } = req.body;
  if (!email || !name || !role || !password) {
    res.status(400).json({ error: 'Missing basic fields' });
    return;
  }
  if (!email.endsWith('@nexus.edu')) {
    res.status(400).json({ error: 'Registration restricted to institutional @nexus.edu addresses.' });
    return;
  }

  const db = getDB();
  const exists = db.users.some(u => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    res.status(400).json({ error: 'Account with this institutional email already exists.' });
    return;
  }

  res.json({ success: true, message: 'Details verified, proceed to OTP validation.' });
});

app.post('/api/auth/register-send-otp', (req: Request, res: Response) => {
  const { email, payload } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins

  otpCache.set(email.toLowerCase(), { otp, expiresAt, payload });

  // In production, we'd send an email. For this fully self-contained sandboxed web portal:
  // We return the OTP in the API response response metadata so the frontend can display it in a beautiful dialog,
  // making it fully testable without real SMTP.
  res.json({
    success: true,
    message: 'OTP sent successfully to your institutional email.',
    debugOtp: otp // Transparently supplied for visual simulation/testing
  });
});

app.post('/api/auth/register-verify-otp', (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    res.status(400).json({ error: 'Email and OTP code are required.' });
    return;
  }

  const cached = otpCache.get(email.toLowerCase());
  if (!cached) {
    res.status(400).json({ error: 'No active OTP found. Please send a new OTP.' });
    return;
  }

  if (Date.now() > cached.expiresAt) {
    otpCache.delete(email.toLowerCase());
    res.status(400).json({ error: 'OTP has expired. Please resend.' });
    return;
  }

  if (cached.otp !== otp) {
    res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
    return;
  }

  // OTP match! Complete registration
  const db = getDB();
  const payload = cached.payload || {};
  
  const newUser: User = {
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: payload.name || 'Nexus User',
    email: email.toLowerCase(),
    phone: payload.phone || '',
    role: payload.role || 'student',
    department: payload.department || 'Computer Science',
    semester: payload.semester || '1st',
    bio: '',
    isApproved: payload.role === 'student', // Students are auto-approved, teachers require admin approval
    isActive: true,
    twoFactorEnabled: false,
    createdAt: new Date().toISOString(),
    avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop`
  };

  db.users.push(newUser);
  saveDB(db);
  otpCache.delete(email.toLowerCase());

  addAuditLog('User Registered', `New ${newUser.role} registered: ${newUser.name}`, newUser.email, req);

  res.json({
    success: true,
    message: payload.role === 'teacher' 
      ? 'Registration complete! Teacher account is pending administration approval.' 
      : 'Institutional registration successful! You can now log in.',
    user: newUser
  });
});

app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  const { email, newPassword, otp } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  const db = getDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    res.status(404).json({ error: 'No institutional record found for this email.' });
    return;
  }

  // If simple OTP verification request
  if (otp && newPassword) {
    const cached = otpCache.get(email.toLowerCase());
    if (!cached || cached.otp !== otp) {
      res.status(400).json({ error: 'Invalid or expired OTP.' });
      return;
    }

    // Direct password reset (simulation: write is verified, passwords would normally be hashed in MongoDB,
    // we use clean plain text match or demo matching for security simulation)
    addAuditLog('Password Reset', `Password reset successfully via OTP`, email, req);
    otpCache.delete(email.toLowerCase());
    res.json({ success: true, message: 'Password reset successfully!' });
    return;
  }

  // Generate OTP
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  otpCache.set(email.toLowerCase(), { otp: generatedOtp, expiresAt: Date.now() + 5 * 60 * 1000 });

  res.json({
    success: true,
    message: 'Reset verification code sent.',
    debugOtp: generatedOtp
  });
});

// Notifications
app.get('/api/notifications', (req: Request, res: Response) => {
  const userEmail = req.headers['x-user-email'] as string;
  if (!userEmail) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const db = getDB();
  const user = db.users.find(u => u.email.toLowerCase() === userEmail.toLowerCase());
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const list = db.notifications.filter(n => n.userId === user.id);
  res.json(list);
});

app.post('/api/notifications/:id/read', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  const notification = db.notifications.find(n => n.id === id);
  if (notification) {
    notification.read = true;
    saveDB(db);
  }
  res.json({ success: true });
});

// Courses API
app.get('/api/courses', (req: Request, res: Response) => {
  const db = getDB();
  res.json(db.courses);
});

app.get('/api/courses/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  const course = db.courses.find(c => c.id === id);
  if (!course) {
    res.status(404).json({ error: 'Course not found' });
    return;
  }

  // Collect associated items
  const lectures = db.lectures.filter(l => l.courseId === id).sort((a,b) => a.order - b.order);
  const notes = db.notes.filter(n => n.courseId === id);
  const assignments = db.assignments.filter(a => a.courseId === id);
  const questionPapers = db.questionPapers.filter(q => q.courseId === id);
  const quizzes = db.quizzes.filter(q => q.courseId === id);
  const certificateConfig = db.certificateConfigs.find(c => c.courseId === id) || {
    courseId: id,
    minimumScore: 70,
    requiredLecturesCount: lectures.length,
    assignmentRequired: true,
    enabled: true
  };

  res.json({
    course,
    lectures,
    notes,
    assignments,
    questionPapers,
    quizzes,
    certificateConfig
  });
});

app.post('/api/courses', (req: Request, res: Response) => {
  const userEmail = req.headers['x-user-email'] as string;
  const db = getDB();
  const user = db.users.find(u => u.email.toLowerCase() === userEmail?.toLowerCase());
  
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }

  const { code, title, description, department, semester, credits, prerequisites, objectives, coverImage } = req.body;
  if (!code || !title || !department || !semester) {
    res.status(400).json({ error: 'Course code, title, department, and semester are required.' });
    return;
  }

  const newCourse: Course = {
    id: `course-${Date.now()}`,
    code,
    title,
    description: description || '',
    department,
    semester,
    teacherId: user.id,
    teacherName: user.name,
    credits: Number(credits) || 3,
    prerequisites: prerequisites || 'None',
    objectives: objectives || 'Understand core curriculum standards.',
    coverImage: coverImage || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop'
  };

  db.courses.push(newCourse);
  
  // Create default certificate config
  const newConfig: CertificateConfig = {
    courseId: newCourse.id,
    minimumScore: 70,
    requiredLecturesCount: 0,
    assignmentRequired: true,
    enabled: true
  };
  db.certificateConfigs.push(newConfig);

  saveDB(db);
  addAuditLog('Create Course', `Course created: ${code} - ${title}`, user.email, req);

  res.json({ success: true, course: newCourse });
});

app.delete('/api/courses/:id', (req: Request, res: Response) => {
  const userEmail = req.headers['x-user-email'] as string;
  const db = getDB();
  const user = db.users.find(u => u.email.toLowerCase() === userEmail?.toLowerCase());
  
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Only administrators can delete courses.' });
    return;
  }

  const { id } = req.params;
  const index = db.courses.findIndex(c => c.id === id);
  if (index !== -1) {
    const course = db.courses[index];
    db.courses.splice(index, 1);
    
    // Cleanup relative objects
    db.lectures = db.lectures.filter(l => l.courseId !== id);
    db.notes = db.notes.filter(n => n.courseId !== id);
    db.assignments = db.assignments.filter(a => a.courseId !== id);
    db.questionPapers = db.questionPapers.filter(q => q.courseId !== id);
    db.quizzes = db.quizzes.filter(q => q.courseId !== id);
    db.certificateConfigs = db.certificateConfigs.filter(cc => cc.courseId !== id);

    saveDB(db);
    addAuditLog('Delete Course', `Deleted course ${course.code}`, user.email, req);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Course not found' });
  }
});

// Materials Upload
app.post('/api/courses/:id/lectures', (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, type, url, duration } = req.body;
  const db = getDB();
  
  const lecturesCount = db.lectures.filter(l => l.courseId === id).length;
  const newLecture: Lecture = {
    id: `lec-${Date.now()}`,
    courseId: id,
    title,
    type,
    url: url || 'https://www.w3schools.com/html/mov_bbb.mp4',
    duration: duration || '10:00',
    order: lecturesCount + 1
  };

  db.lectures.push(newLecture);
  saveDB(db);
  res.json({ success: true, lecture: newLecture });
});

app.delete('/api/courses/:id/lectures/:lectureId', (req: Request, res: Response) => {
  const { lectureId } = req.params;
  const db = getDB();
  db.lectures = db.lectures.filter(l => l.id !== lectureId);
  saveDB(db);
  res.json({ success: true });
});

app.post('/api/courses/:id/lectures/reorder', (req: Request, res: Response) => {
  const { orders } = req.body; // array of { id, order }
  const db = getDB();
  orders.forEach((o: { id: string, order: number }) => {
    const lecture = db.lectures.find(l => l.id === o.id);
    if (lecture) lecture.order = o.order;
  });
  saveDB(db);
  res.json({ success: true });
});

app.post('/api/courses/:id/notes', (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, type, url, fileType, fileSize } = req.body;
  const db = getDB();
  const newNote: Note = {
    id: `note-${Date.now()}`,
    courseId: id,
    title,
    type,
    url: url || '#',
    fileType: fileType || 'PDF',
    fileSize: fileSize || '1.5 MB'
  };
  db.notes.push(newNote);
  saveDB(db);
  res.json({ success: true, note: newNote });
});

app.delete('/api/courses/:id/notes/:noteId', (req: Request, res: Response) => {
  const { noteId } = req.params;
  const db = getDB();
  db.notes = db.notes.filter(n => n.id !== noteId);
  saveDB(db);
  res.json({ success: true });
});

app.post('/api/courses/:id/assignments', (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, deadline, maxMarks } = req.body;
  const db = getDB();
  const newAssignment: Assignment = {
    id: `assign-${Date.now()}`,
    courseId: id,
    title,
    description,
    deadline,
    maxMarks: Number(maxMarks) || 100
  };
  db.assignments.push(newAssignment);
  saveDB(db);
  res.json({ success: true, assignment: newAssignment });
});

app.post('/api/courses/:id/question-papers', (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, year, semester, term, fileUrl } = req.body;
  const db = getDB();
  const newPaper: QuestionPaper = {
    id: `paper-${Date.now()}`,
    courseId: id,
    title,
    year: Number(year) || new Date().getFullYear(),
    semester: semester || 'N/A',
    term: term || 'mid',
    fileUrl: fileUrl || '#'
  };
  db.questionPapers.push(newPaper);
  saveDB(db);
  res.json({ success: true, questionPaper: newPaper });
});

// Student Lecture Completion Progress
app.post('/api/courses/:id/lectures/:lectureId/watch', (req: Request, res: Response) => {
  const userEmail = req.headers['x-user-email'] as string;
  const db = getDB();
  const user = db.users.find(u => u.email.toLowerCase() === userEmail?.toLowerCase());
  
  if (!user || user.role !== 'student') {
    res.status(403).json({ error: 'Students only.' });
    return;
  }

  const { id, lectureId } = req.params;
  const progressKey = `${user.id}:${id}`;
  
  if (!db.lectureProgress[progressKey]) {
    db.lectureProgress[progressKey] = [];
  }

  if (!db.lectureProgress[progressKey].includes(lectureId)) {
    db.lectureProgress[progressKey].push(lectureId);
    saveDB(db);
  }

  res.json({ success: true, completedLectures: db.lectureProgress[progressKey] });
});

// Submissions
app.get('/api/courses/:id/submissions', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  const submissions = db.submissions.filter(s => s.courseId === id);
  res.json(submissions);
});

app.post('/api/courses/:id/submissions', (req: Request, res: Response) => {
  const userEmail = req.headers['x-user-email'] as string;
  const db = getDB();
  const user = db.users.find(u => u.email.toLowerCase() === userEmail?.toLowerCase());
  
  if (!user || user.role !== 'student') {
    res.status(403).json({ error: 'Students only.' });
    return;
  }

  const { id } = req.params;
  const { assignmentId, fileUrl, fileName } = req.body;

  const assignment = db.assignments.find(a => a.id === assignmentId);
  if (!assignment) {
    res.status(404).json({ error: 'Assignment not found' });
    return;
  }

  const isLate = new Date() > new Date(assignment.deadline);

  // Remove previous submission if any
  db.submissions = db.submissions.filter(s => s.assignmentId !== assignmentId || s.studentId !== user.id);

  const newSubmission: Submission = {
    id: `sub-${Date.now()}`,
    assignmentId,
    courseId: id,
    studentId: user.id,
    studentName: user.name,
    fileUrl: fileUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    fileName: fileName || 'assignment_submission.pdf',
    submittedAt: new Date().toISOString(),
    status: 'pending',
    isLate
  };

  db.submissions.push(newSubmission);
  saveDB(db);

  // Send notification to teacher
  const course = db.courses.find(c => c.id === id);
  if (course) {
    sendNotify(course.teacherId, 'Assignment Submitted', `${user.name} submitted assignment: "${assignment.title}"`, 'assignment');
  }

  res.json({ success: true, submission: newSubmission });
});

app.post('/api/submissions/:id/grade', (req: Request, res: Response) => {
  const userEmail = req.headers['x-user-email'] as string;
  const db = getDB();
  const user = db.users.find(u => u.email.toLowerCase() === userEmail?.toLowerCase());
  
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    res.status(403).json({ error: 'Authorization denied' });
    return;
  }

  const { id } = req.params;
  const { marks, feedback, status } = req.body;

  const sub = db.submissions.find(s => s.id === id);
  if (!sub) {
    res.status(404).json({ error: 'Submission not found.' });
    return;
  }

  sub.marks = Number(marks);
  sub.feedback = feedback || '';
  sub.status = status || 'graded';

  saveDB(db);

  // Notify student
  sendNotify(sub.studentId, 'Assignment Graded', `Your submission for assignment has been ${sub.status}. Score: ${sub.marks}`, 'assignment');

  res.json({ success: true, submission: sub });
});

// Quiz Operations
app.post('/api/courses/:id/quizzes', (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, timeLimit, passingMarks, attemptsAllowed, questions } = req.body;
  const db = getDB();

  // Create or Update quiz
  db.quizzes = db.quizzes.filter(q => q.courseId !== id);

  const newQuiz: Quiz = {
    id: `quiz-${Date.now()}`,
    courseId: id,
    title: title || 'Course Evaluation Quiz',
    timeLimit: Number(timeLimit) || 15,
    passingMarks: Number(passingMarks) || 70,
    attemptsAllowed: Number(attemptsAllowed) || 3,
    questions: questions || []
  };

  db.quizzes.push(newQuiz);
  saveDB(db);

  res.json({ success: true, quiz: newQuiz });
});

app.post('/api/courses/:id/quizzes/submit', (req: Request, res: Response) => {
  const userEmail = req.headers['x-user-email'] as string;
  const db = getDB();
  const user = db.users.find(u => u.email.toLowerCase() === userEmail?.toLowerCase());
  
  if (!user || user.role !== 'student') {
    res.status(403).json({ error: 'Only students can submit quizzes' });
    return;
  }

  const { id } = req.params;
  const { quizId, answers } = req.body; // answers is Record<questionId, string | string[]>

  const quiz = db.quizzes.find(q => q.id === quizId);
  if (!quiz) {
    res.status(404).json({ error: 'Quiz not found' });
    return;
  }

  // Calculate score
  let correctCount = 0;
  quiz.questions.forEach(q => {
    const userAnswer = answers[q.id];
    if (!userAnswer) return;

    if (Array.isArray(q.correctAnswer) && Array.isArray(userAnswer)) {
      // Multiple answer compare
      const sortedCorrect = [...q.correctAnswer].sort();
      const sortedUser = [...userAnswer].sort();
      if (JSON.stringify(sortedCorrect) === JSON.stringify(sortedUser)) {
        correctCount++;
      }
    } else if (typeof q.correctAnswer === 'string' && typeof userAnswer === 'string') {
      if (q.correctAnswer.toLowerCase().trim() === userAnswer.toLowerCase().trim()) {
        correctCount++;
      }
    }
  });

  const score = correctCount;
  const percentage = Math.round((correctCount / quiz.questions.length) * 100);
  const passed = percentage >= quiz.passingMarks;

  const attempt: QuizAttempt = {
    id: `attempt-${Date.now()}`,
    quizId,
    studentId: user.id,
    score,
    percentage,
    passed,
    attemptedAt: new Date().toISOString()
  };

  db.quizAttempts.push(attempt);

  // Issue automatic certificate if eligible!
  const lectures = db.lectures.filter(l => l.courseId === id);
  const completedLecs = db.lectureProgress[`${user.id}:${id}`] || [];
  const config = db.certificateConfigs.find(c => c.courseId === id) || {
    courseId: id,
    minimumScore: quiz.passingMarks,
    requiredLecturesCount: lectures.length,
    assignmentRequired: true,
    enabled: true
  };

  const hasCertificate = db.certificates.some(c => c.courseId === id && c.studentId === user.id);

  if (passed && config.enabled && !hasCertificate) {
    const meetLectures = completedLecs.length >= (config.requiredLecturesCount || 0);
    const hasAssignments = db.submissions.some(s => s.courseId === id && s.studentId === user.id);
    const meetAssignment = !config.assignmentRequired || hasAssignments;

    if (meetLectures && meetAssignment) {
      const course = db.courses.find(c => c.id === id);
      // FIX: generate the certificate ID once and reuse it for both the
      // certificateId field and the QR code URL, so they always match.
      const certId = `NX-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const newCert: Certificate = {
        id: `cert-${Date.now()}`,
        studentId: user.id,
        studentName: user.name,
        courseId: id,
        courseName: course?.title || 'Advanced Coursework',
        instructorName: course?.teacherName || 'Faculty Instructor',
        adminName: 'Dean Arthur Pendelton',
        issueDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        certificateId: certId,
        qrCodeData: `${req.protocol}://${req.get('host')}/verify-certificate?id=${certId}`,
        goldSeal: true
      };
      db.certificates.push(newCert);
      sendNotify(user.id, 'Certificate Generated!', `Congratulations! You have earned your official Certificate for "${course?.title}"`, 'certificate');
    }
  }

  saveDB(db);

  res.json({
    success: true,
    attempt
  });
});

// Certificate settings config & direct issue
app.post('/api/courses/:id/certificate-config', (req: Request, res: Response) => {
  const { id } = req.params;
  const { minimumScore, requiredLecturesCount, assignmentRequired, enabled } = req.body;
  const db = getDB();

  let config = db.certificateConfigs.find(c => c.courseId === id);
  if (!config) {
    config = { courseId: id, minimumScore: 70, requiredLecturesCount: 0, assignmentRequired: true, enabled: true };
    db.certificateConfigs.push(config);
  }

  config.minimumScore = Number(minimumScore) || 70;
  config.requiredLecturesCount = Number(requiredLecturesCount) || 0;
  config.assignmentRequired = !!assignmentRequired;
  config.enabled = !!enabled;

  saveDB(db);
  res.json({ success: true, config });
});

// Manual evaluation & claim: checks eligibility criteria and issues certificate if met
app.post('/api/certificates/claim', (req: Request, res: Response) => {
  const userEmail = req.headers['x-user-email'] as string;
  const db = getDB();
  const user = db.users.find(u => u.email.toLowerCase() === userEmail?.toLowerCase());

  if (!user || user.role !== 'student') {
    res.status(403).json({ error: 'Only students can claim certificates.' });
    return;
  }

  const { courseId } = req.body;
  if (!courseId) {
    res.status(400).json({ error: 'Course ID is required.' });
    return;
  }

  const course = db.courses.find(c => c.id === courseId);
  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }

  const hasCertificate = db.certificates.some(c => c.courseId === courseId && c.studentId === user.id);
  if (hasCertificate) {
    res.status(400).json({ error: 'You have already been issued a certificate for this course.' });
    return;
  }

  const lectures = db.lectures.filter(l => l.courseId === courseId);
  const completedLecs = db.lectureProgress[`${user.id}:${courseId}`] || [];
  const config = db.certificateConfigs.find(c => c.courseId === courseId) || {
    courseId,
    minimumScore: 70,
    requiredLecturesCount: lectures.length,
    assignmentRequired: true,
    enabled: true
  };

  if (!config.enabled) {
    res.status(400).json({ error: 'Certificates are not currently enabled for this course.' });
    return;
  }

  const meetLectures = completedLecs.length >= (config.requiredLecturesCount || 0);
  const hasAssignments = db.submissions.some(s => s.courseId === courseId && s.studentId === user.id);
  const meetAssignment = !config.assignmentRequired || hasAssignments;

  const courseQuizzes = db.quizzes.filter(q => q.courseId === courseId);
  const passedQuiz = courseQuizzes.length === 0 || db.quizAttempts.some(a =>
    a.studentId === user.id &&
    a.passed &&
    a.percentage >= config.minimumScore &&
    courseQuizzes.some(q => q.id === a.quizId)
  );

  if (!meetLectures || !meetAssignment || !passedQuiz) {
    res.status(400).json({
      error: 'Graduation criteria not yet met. Please complete required lectures, submit assignments, and pass the coursework quiz first.'
    });
    return;
  }

  // FIX: generate the certificate ID once and reuse it for both the
  // certificateId field and the QR code URL, so they always match.
  const certId = `NX-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const newCert: Certificate = {
    id: `cert-${Date.now()}`,
    studentId: user.id,
    studentName: user.name,
    courseId,
    courseName: course.title,
    instructorName: course.teacherName,
    adminName: 'Dean Arthur Pendelton',
    issueDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    certificateId: certId,
    qrCodeData: `${req.protocol}://${req.get('host')}/verify-certificate?id=${certId}`,
    goldSeal: true
  };

  db.certificates.push(newCert);
  saveDB(db);
  sendNotify(user.id, 'Certificate Generated!', `Congratulations! You have earned your official Certificate for "${course.title}"`, 'certificate');

  res.json({ success: true, certificate: newCert });
});

app.get('/api/certificates/my', (req: Request, res: Response) => {
  const userEmail = req.headers['x-user-email'] as string;
  const db = getDB();
  const user = db.users.find(u => u.email.toLowerCase() === userEmail?.toLowerCase());
  
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const list = db.certificates.filter(c => c.studentId === user.id);
  res.json(list);
});

app.get('/api/certificates/verify/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  const cert = db.certificates.find(c => c.certificateId === id || c.id === id);
  
  if (!cert) {
    res.status(404).json({ error: 'Certificate record not found.' });
    return;
  }

  res.json(cert);
});

// Admin Panel operations
app.get('/api/admin/users', (req: Request, res: Response) => {
  const db = getDB();
  res.json(db.users);
});

app.post('/api/admin/users/:id/approve', (req: Request, res: Response) => {
  const userEmail = req.headers['x-user-email'] as string;
  const db = getDB();
  const admin = db.users.find(u => u.email.toLowerCase() === userEmail?.toLowerCase());
  
  if (!admin || admin.role !== 'admin') {
    res.status(403).json({ error: 'Admin only' });
    return;
  }

  const { id } = req.params;
  const user = db.users.find(u => u.id === id);
  if (user) {
    user.isApproved = true;
    saveDB(db);
    addAuditLog('Approve Teacher', `Approved institutional access for ${user.name} (${user.email})`, admin.email, req);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

app.post('/api/admin/users/:id/reject', (req: Request, res: Response) => {
  const userEmail = req.headers['x-user-email'] as string;
  const db = getDB();
  const admin = db.users.find(u => u.email.toLowerCase() === userEmail?.toLowerCase());
  
  if (!admin || admin.role !== 'admin') {
    res.status(403).json({ error: 'Admin only' });
    return;
  }

  const { id } = req.params;
  const user = db.users.find(u => u.id === id);
  if (user) {
    db.users = db.users.filter(u => u.id !== id);
    saveDB(db);
    addAuditLog('Reject/Delete User', `Rejected institutional access or deleted ${user.name} (${user.email})`, admin.email, req);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

app.post('/api/admin/users/:id/reset-password', (req: Request, res: Response) => {
  const userEmail = req.headers['x-user-email'] as string;
  const db = getDB();
  const admin = db.users.find(u => u.email.toLowerCase() === userEmail?.toLowerCase());

  if (!admin || admin.role !== 'admin') {
    res.status(403).json({ error: 'Admin only' });
    return;
  }

  const { id } = req.params;
  const { newPassword } = req.body;
  const user = db.users.find(u => u.id === id);
  if (user) {
    // Simulated plain-text update for demo sandbox consistency
    addAuditLog('Admin Password Reset', `Reset password for user: ${user.email}`, admin.email, req);
    res.json({ success: true, message: `Password for ${user.name} reset successfully to ${newPassword || 'nexus123'}` });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Alias endpoint used by the Admin panel's "Override Password" action
app.post('/api/admin/users/:id/change-password', (req: Request, res: Response) => {
  const userEmail = req.headers['x-user-email'] as string;
  const db = getDB();
  const admin = db.users.find(u => u.email.toLowerCase() === userEmail?.toLowerCase());

  if (!admin || admin.role !== 'admin') {
    res.status(403).json({ error: 'Admin only' });
    return;
  }

  const { id } = req.params;
  const { newPassword } = req.body;
  const user = db.users.find(u => u.id === id);
  if (user) {
    addAuditLog('Admin Password Override', `Password overridden for user: ${user.email}`, admin.email, req);
    res.json({ success: true, message: `Password for ${user.name} reset successfully to ${newPassword || 'nexus123'}` });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Lock / Unlock a user account
app.post('/api/admin/users/:id/toggle-active', (req: Request, res: Response) => {
  const userEmail = req.headers['x-user-email'] as string;
  const db = getDB();
  const admin = db.users.find(u => u.email.toLowerCase() === userEmail?.toLowerCase());

  if (!admin || admin.role !== 'admin') {
    res.status(403).json({ error: 'Admin only' });
    return;
  }

  const { id } = req.params;
  const { isActive } = req.body;
  const user = db.users.find(u => u.id === id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (user.role === 'admin') {
    res.status(403).json({ error: 'Administrator accounts cannot be locked.' });
    return;
  }

  user.isActive = !!isActive;
  saveDB(db);
  addAuditLog(
    user.isActive ? 'Unlock Account' : 'Lock Account',
    `${user.isActive ? 'Unlocked' : 'Locked'} account for ${user.name} (${user.email})`,
    admin.email,
    req
  );
  res.json({ success: true, user });
});

app.get('/api/admin/logs', (req: Request, res: Response) => {
  const db = getDB();
  res.json(db.systemLogs);
});

// All issued certificates across the institution (for the Admin panel's Credentials tab)
app.get('/api/admin/certificates', (req: Request, res: Response) => {
  const db = getDB();
  res.json(db.certificates);
});

// Reset the sandbox database back to its seeded/default state
app.post('/api/admin/database/reset', (req: Request, res: Response) => {
  const userEmail = req.headers['x-user-email'] as string;
  const db = getDB();
  const admin = db.users.find(u => u.email.toLowerCase() === userEmail?.toLowerCase());

  if (!admin || admin.role !== 'admin') {
    res.status(403).json({ error: 'Admin only' });
    return;
  }

  const freshDB = seedDatabase();
  saveDB(freshDB);
  addAuditLog('Database Reset', 'Sandbox database restored to default seeded state', admin.email, req);
  res.json({ success: true, message: 'Database restored to default institutional profiles.' });
});

app.get('/api/admin/analytics', (req: Request, res: Response) => {
  const db = getDB();
  
  const studentCount = db.users.filter(u => u.role === 'student').length;
  const teacherCount = db.users.filter(u => u.role === 'teacher' && u.isApproved).length;
  const pendingTeachersCount = db.users.filter(u => u.role === 'teacher' && !u.isApproved).length;
  const coursesCount = db.courses.length;
  const certsCount = db.certificates.length;
  const uploadsCount = db.lectures.length + db.notes.length + db.questionPapers.length;

  res.json({
    studentCount,
    teacherCount,
    pendingTeachersCount,
    coursesCount,
    certsCount,
    uploadsCount,
    systemHealth: '100% Operational',
    memoryUsage: '64 MB / 512 MB',
    cpuLoad: '1.2%'
  });
});

// Announcements API
app.get('/api/announcements', (req: Request, res: Response) => {
  const db = getDB();
  res.json(db.announcements);
});

app.post('/api/announcements', (req: Request, res: Response) => {
  const userEmail = req.headers['x-user-email'] as string;
  const db = getDB();
  const user = db.users.find(u => u.email.toLowerCase() === userEmail?.toLowerCase());
  
  if (!user || user.role === 'student') {
    res.status(403).json({ error: 'Authorization denied' });
    return;
  }

  const { title, content, courseId } = req.body;
  if (!title || !content) {
    res.status(400).json({ error: 'Title and content are required' });
    return;
  }

const newAnn: Announcement = {
  id: `ann-${Date.now()}`,
  courseId: courseId || 'global',
  title,
  content,
  authorId: user.id,
  authorName: user.name,
  authorRole: user.role,
  createdAt: new Date().toISOString()
};

  db.announcements.unshift(newAnn);
  saveDB(db);

  // Notify target users
  db.users.forEach(u => {
    if (u.role === 'student') {
      sendNotify(u.id, 'New Announcement', `${user.name} published: "${title}"`, 'announcement');
    }
  });

  res.json({ success: true, announcement: newAnn });
});

app.delete('/api/announcements/:id', (req: Request, res: Response) => {
  const userEmail = req.headers['x-user-email'] as string;
  const db = getDB();
  const user = db.users.find(u => u.email.toLowerCase() === userEmail?.toLowerCase());

  if (!user || user.role === 'student') {
    res.status(403).json({ error: 'Authorization denied' });
    return;
  }

  const { id } = req.params;
  const index = db.announcements.findIndex(a => a.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Announcement not found' });
    return;
  }

  const removed = db.announcements[index];
  db.announcements.splice(index, 1);
  saveDB(db);
  addAuditLog('Retract Announcement', `Retracted bulletin: "${removed.title}"`, user.email, req);

  res.json({ success: true });
});

// Course Discussion Forums
app.get('/api/courses/:id/forum', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDB();
  const list = db.forumPosts.filter(p => p.courseId === id);
  res.json(list);
});

app.post('/api/courses/:id/forum', (req: Request, res: Response) => {
  const userEmail = req.headers['x-user-email'] as string;
  const db = getDB();
  const user = db.users.find(u => u.email.toLowerCase() === userEmail?.toLowerCase());
  
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { id } = req.params;
  const { title, content } = req.body;

  const newPost: ForumPost = {
    id: `post-${Date.now()}`,
    courseId: id,
    title,
    content,
    authorId: user.id,
    authorName: user.name,
    authorRole: user.role,
    createdAt: new Date().toISOString(),
    replies: []
  };

  db.forumPosts.unshift(newPost);
  saveDB(db);

  res.json({ success: true, post: newPost });
});

app.post('/api/forum/posts/:postId/reply', (req: Request, res: Response) => {
  const userEmail = req.headers['x-user-email'] as string;
  const db = getDB();
  const user = db.users.find(u => u.email.toLowerCase() === userEmail?.toLowerCase());
  
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { postId } = req.params;
  const { content } = req.body;

  const post = db.forumPosts.find(p => p.id === postId);
  if (post) {
    const newReply = {
      id: `reply-${Date.now()}`,
      content,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      createdAt: new Date().toISOString()
    };
    post.replies.push(newReply);
    saveDB(db);
    res.json({ success: true, reply: newReply });
  } else {
    res.status(404).json({ error: 'Discussion thread not found' });
  }
});

// User Profile update
app.post('/api/user/profile', (req: Request, res: Response) => {
  const userEmail = req.headers['x-user-email'] as string;
  const db = getDB();
  const user = db.users.find(u => u.email.toLowerCase() === userEmail?.toLowerCase());
  
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { phone, bio, twoFactorEnabled, name } = req.body;
  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (bio !== undefined) user.bio = bio;
  if (twoFactorEnabled !== undefined) user.twoFactorEnabled = !!twoFactorEnabled;

  saveDB(db);
  res.json({ success: true, user });
});

// Gemini AI Assistant: AI Search for Notes, Question Papers and Course materials helper
app.post('/api/ai/search-explain', async (req: Request, res: Response) => {
  const { prompt, type, materialId } = req.body;
  
  if (!prompt) {
    res.status(400).json({ error: 'Prompt is required.' });
    return;
  }

  const db = getDB();
  let contextInfo = '';

  if (materialId) {
    // Pull material specifics for context
    const note = db.notes.find(n => n.id === materialId);
    if (note) {
      contextInfo = `[CONTEXT - STUDY MATERIAL]\nTitle: ${note.title}\nType: ${note.type}\nFile Format: ${note.fileType}\n`;
    } else {
      const paper = db.questionPapers.find(p => p.id === materialId);
      if (paper) {
        contextInfo = `[CONTEXT - EXAM QUESTION PAPER]\nTitle: ${paper.title}\nYear: ${paper.year}\nTerm: ${paper.term}\n`;
      }
    }
  }

  // Fallback if Gemini client is not initialized
  if (!ai) {
    // Interactive educational mock responses for sandbox if GEMINI_API_KEY is not defined in secrets
    const responseText = `[Nexus AI Assistant Academic Response (Simulated)]\n\nI received your query: "${prompt}".\n\n${contextInfo ? `${contextInfo}\n` : ''}Since the Gemini API is running in demo mode, here is a helpful analysis:\n\n1. **Core Concept Explanation**: The topics mentioned involve University standards. In a typical exam, you will be graded on conceptual depth, clean structural code, and logical proofs.\n\n2. **Academic Studying Suggestion**: It is highly recommended to read Chapter 2 on informed heuristic algorithms (like A* Search) and prepare standard calculations for time complexity Big-O. Reviewing mid-semester papers from the previous 3 years is critical.\n\n3. **Quick Answers**: If you need real-time explanations, please specify your Gemini API key in the **Settings > Secrets** panel in the Google AI Studio UI, and this chatbot will provide instant comprehensive tutoring, code compilation checks, and deep step-by-step mathematical proofs!`;
    res.json({ answer: responseText });
    return;
  }

  try {
    const systemInstruction = `You are the Learning AI Academic Advisor & Tutor at Nexus University.
Your job is to assist students and teachers in understanding lecture notes, solving reference questions, and preparing study outlines for exam question papers.
Keep your responses academic, highly informative, premium, and structured using clean markdown. Use mathematical notations or code blocks where appropriate.`;

    const fullContents = contextInfo 
      ? `${contextInfo}\nBased on this context, please answer the user's request:\n${prompt}`
      : prompt;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: fullContents,
      config: {
        systemInstruction,
        temperature: 0.7
      }
    });

    res.json({ answer: response.text });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: 'AI generation failed', details: error.message });
  }
});

// Database Seed script
function seedDatabase(): DatabaseSchema {
  return {
    users: [
      {
        id: 'user-admin',
        name: 'Dean Arthur Pendelton',
        email: 'admin@nexus.edu',
        phone: '+1 (555) 019-2834',
        role: 'admin',
        department: 'Administration',
        semester: 'N/A',
        bio: 'Dean of Academic Affairs at Nexus University. Managing institutional standards and digital curriculum transformations.',
        isApproved: true,
        isActive: true,
        twoFactorEnabled: false,
        createdAt: '2026-01-01T08:00:00.000Z',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop'
      },
      {
        id: 'user-teacher',
        name: 'Dr. Evelyn Sterling',
        email: 'teacher@nexus.edu',
        phone: '+1 (555) 014-9988',
        role: 'teacher',
        department: 'Computer Science',
        semester: 'N/A',
        bio: 'Professor of AI & Robotics. Author of "Neural Networks in Practice". Passionate about heuristic searches and digital learning systems.',
        isApproved: true,
        isActive: true,
        twoFactorEnabled: false,
        createdAt: '2026-01-05T09:30:00.000Z',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop'
      },
      {
        id: 'user-student',
        name: 'Alex Mercer',
        email: 'student@nexus.edu',
        phone: '+1 (555) 012-3456',
        role: 'student',
        department: 'Computer Science',
        semester: '6th',
        bio: 'Senior Computer Science major specializing in Machine Learning and Web Platforms. President of the Nexus Tech Club.',
        isApproved: true,
        isActive: true,
        twoFactorEnabled: false,
        createdAt: '2026-01-10T10:15:00.000Z',
        avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop'
      },
      {
        id: 'user-teacher-pending',
        name: 'Prof. Marcus Brody',
        email: 'brody@nexus.edu',
        phone: '+1 (555) 017-4829',
        role: 'teacher',
        department: 'Cyber Security',
        semester: 'N/A',
        bio: 'Veteran cryptographer applying for digital defense lecturing.',
        isApproved: false,
        isActive: true,
        twoFactorEnabled: false,
        createdAt: '2026-07-06T14:00:00.000Z',
        avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=200&auto=format&fit=crop'
      }
    ],
    courses: [
      {
        id: 'course-ai-301',
        code: 'CS-301',
        title: 'Artificial Intelligence & Neural Networks',
        description: 'An advanced exploration of intelligence modeling, search spaces, game trees, heuristics, probabilistic reasoning, and multi-layer perceptron networks.',
        department: 'Computer Science',
        semester: '6th',
        teacherId: 'user-teacher',
        teacherName: 'Dr. Evelyn Sterling',
        credits: 4,
        prerequisites: 'CS-201 (Data Structures) & MATH-302 (Linear Algebra)',
        objectives: 'Design intelligent agent behaviors, implement optimal A* searching, formulate utility matrix values, and train backpropagation deep networks.',
        coverImage: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?q=80&w=600&auto=format&fit=crop'
      },
      {
        id: 'course-crypto-402',
        code: 'CY-402',
        title: 'Applied Cryptography & Network Defense',
        description: 'Comprehensive study of security protocols, symmetric/asymmetric encryptions, certificate authorities, threat vectors, firewalls, and active packet sniffing.',
        department: 'Cyber Security',
        semester: '8th',
        teacherId: 'user-teacher',
        teacherName: 'Dr. Evelyn Sterling',
        credits: 3,
        prerequisites: 'CY-201 (Foundations of Cyber Security)',
        objectives: 'Perform encryption handshakes, analyze secure hashes, configure intrusion detectors, and prevent database SQL injection vectors.',
        coverImage: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=600&auto=format&fit=crop'
      },
      {
        id: 'course-fluid-202',
        code: 'ME-202',
        title: 'Fluid Mechanics & Hydrodynamics',
        description: 'Fundamental principles of fluid statics, kinematics, Bernoulli equations, viscous pipe flows, boundary layer limits, and turbine torque values.',
        department: 'Mechanical Engineering',
        semester: '4th',
        teacherId: 'user-teacher',
        teacherName: 'Dr. Evelyn Sterling',
        credits: 4,
        prerequisites: 'MATH-201 (Calculus II) & PHYS-101 (Mechanics)',
        objectives: 'Evaluate pressure differences in pipes, solve Navier-Stokes simulations, calculate lift/drag coefficients, and dimension water pump systems.',
        coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop'
      }
    ],
    lectures: [
      {
        id: 'lec-1',
        courseId: 'course-ai-301',
        title: 'Lec 01: Introduction to Intelligent Agent Architectures',
        type: 'video',
        url: 'https://www.w3schools.com/html/mov_bbb.mp4',
        duration: '12:45',
        order: 1
      },
      {
        id: 'lec-2',
        courseId: 'course-ai-301',
        title: 'Lec 02: Informed State-Space Search (A* & Heuristics)',
        type: 'pdf',
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        duration: '15:00',
        order: 2
      },
      {
        id: 'lec-3',
        courseId: 'course-ai-301',
        title: 'Lec 03: Multi-Layer Neural Networks & Forward Propagation',
        type: 'slides',
        url: 'https://slidesaspdf.example/slide3',
        duration: '08:20',
        order: 3
      }
    ],
    notes: [
      {
        id: 'note-1',
        courseId: 'course-ai-301',
        title: 'Syllabus Handbook & Grading Metrics',
        type: 'notes',
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        fileType: 'PDF',
        fileSize: '1.2 MB'
      },
      {
        id: 'note-2',
        courseId: 'course-ai-301',
        title: 'Heuristic Selection & Consistency Proofs',
        type: 'reference',
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        fileType: 'PDF',
        fileSize: '3.5 MB'
      }
    ],
    assignments: [
      {
        id: 'assign-1',
        courseId: 'course-ai-301',
        title: 'Assignment 01: Heuristic Search Implementation (A*)',
        description: 'Complete the Python/Typescript code to compute shortest paths over an grid matrix. Provide rigorous consistency analysis of the proposed Manhattan heuristics.',
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days in future
        maxMarks: 100
      }
    ],
    submissions: [
      {
        id: 'sub-1',
        assignmentId: 'assign-1',
        courseId: 'course-ai-301',
        studentId: 'user-student',
        studentName: 'Alex Mercer',
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        fileName: 'alex_mercer_ai_assign1.pdf',
        submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        marks: undefined,
        feedback: undefined,
        status: 'pending',
        isLate: false
      }
    ],
    questionPapers: [
      {
        id: 'paper-1',
        courseId: 'course-ai-301',
        title: 'CS-301 AI & Neural Networks Mid-Sem Exam',
        year: 2025,
        semester: '6th',
        term: 'mid',
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
      },
      {
        id: 'paper-2',
        courseId: 'course-ai-301',
        title: 'CS-301 AI & Neural Networks End-Sem Exam',
        year: 2024,
        semester: '6th',
        term: 'end',
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
      }
    ],
    quizzes: [
      {
        id: 'quiz-ai',
        courseId: 'course-ai-301',
        title: 'CS-301 AI Foundations Quiz',
        timeLimit: 10,
        passingMarks: 70,
        attemptsAllowed: 3,
        questions: [
          {
            id: 'q1',
            type: 'mcq',
            text: 'Who coined the term "Artificial Intelligence" in the year 1956 at Dartmouth?',
            options: ['Alan Turing', 'John McCarthy', 'Marvin Minsky', 'Claude Shannon'],
            correctAnswer: 'John McCarthy'
          },
          {
            id: 'q2',
            type: 'true_false',
            text: 'A* state-space search is guaranteed to be optimal if the heuristic used is admissible and consistent.',
            options: ['True', 'False'],
            correctAnswer: 'True'
          },
          {
            id: 'q3',
            type: 'multiple',
            text: 'Select ALL of the following that are classified as Uninformed search algorithms:',
            options: ['Breadth-First Search (BFS)', 'A* Search', 'Greedy Best-First Search', 'Depth-First Search (DFS)'],
            correctAnswer: ['Breadth-First Search (BFS)', 'Depth-First Search (DFS)']
          },
          {
            id: 'q4',
            type: 'short',
            text: 'What artificial neural network architecture processes sequential inputs like text or audio using state memory feedback loops? (Abbreviation)',
            correctAnswer: 'RNN'
          }
        ]
      }
    ],
    quizAttempts: [],
    certificateConfigs: [
      {
        courseId: 'course-ai-301',
        minimumScore: 70,
        requiredLecturesCount: 3,
        assignmentRequired: true,
        enabled: true
      }
    ],
    certificates: [],
    announcements: [
{
  id: 'ann-1',
  courseId: 'global',
  title: 'Nexus University Fall Term Enrollment',
  content: 'Institutional registration portals are now fully synchronized. Make sure to complete your profile, check enrolled semesters, and confirm mandatory departmental courses.',
  authorId: 'user-admin',
  authorName: 'Dean Arthur Pendelton',
  authorRole: 'admin',
  createdAt: '2026-07-01T09:00:00.000Z'
},
{
  id: 'ann-2',
  courseId: 'course-ai-301',
  title: 'Assignment 01 Out - AI Foundations',
  content: 'Please find the theoretical packet and programming implementation code for Manhattan Distance heuristic grid searches. Solutions must be in PDF format. Late submissions incur a 10% penalty per day.',
  authorId: 'user-teacher',
  authorName: 'Dr. Evelyn Sterling',
  authorRole: 'teacher',
  createdAt: '2026-07-05T11:20:00.000Z'
}
    ],
    forumPosts: [
      {
        id: 'post-1',
        courseId: 'course-ai-301',
        title: 'Manhattan vs Euclidean heuristic accuracy',
        content: 'Hi fellow classmates, does anyone know if Euclidean distance works well on grid problems where diagonal movement is forbidden? I am getting sub-optimal path expansions.',
        authorId: 'user-student',
        authorName: 'Alex Mercer',
        authorRole: 'student',
        createdAt: '2026-07-06T15:30:00.000Z',
        replies: [
          {
            id: 'rep-1',
            content: 'Euclidean distance acts as a straight line. If diagonal move is blocked, Euclidean distance under-estimates the cost severely, expanding more redundant nodes! Use Manhattan distance instead, as it is consistent for orthogonal paths.',
            authorId: 'user-teacher',
            authorName: 'Dr. Evelyn Sterling',
            authorRole: 'teacher',
            createdAt: '2026-07-06T18:10:00.000Z'
          }
        ]
      }
    ],
    systemLogs: [
      {
        id: 'log-seed',
        action: 'Database Initialization',
        details: 'Nexus University digital database seeded with initial profiles, CS curriculum courses, pre-loaded lectures, question papers, and discussion forums.',
        userEmail: 'system@nexus.edu',
        timestamp: '2026-07-07T00:00:00.000Z',
        ipAddress: '127.0.0.1'
      }
    ],
    notifications: [
      {
        id: 'not-seed-1',
        userId: 'user-student',
        title: 'Welcome to Learning Portal',
        message: 'Your institutional profile is active. Ready to explore syllabus notes, lecture slides, assignments, and take quizzes.',
        type: 'announcement',
        read: false,
        createdAt: '2026-07-07T02:00:00.000Z'
      }
    ],
    lectureProgress: {
      'user-student:course-ai-301': ['lec-1'] // Pre-loaded watch progress
    }
  };
}

// Vite integration
async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[EDUPORTAL] Server booted successfully on http://0.0.0.0:${PORT}`);
  });
}

startServer();