/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  department: string;
  semester: string; // e.g., "1st", "2nd", etc., or "N/A" for admin/teacher
  bio?: string;
  isApproved: boolean; // Teachers require admin approval
  isActive: boolean; // Locked/suspended accounts cannot log in
  twoFactorEnabled: boolean;
  createdAt: string;
  avatar?: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  description: string;
  department: string;
  semester: string;
  teacherId: string;
  teacherName: string;
  credits: number;
  prerequisites: string;
  objectives: string;
  coverImage: string;
}

export interface Lecture {
  id: string;
  courseId: string;
  title: string;
  type: 'video' | 'pdf' | 'slides' | 'link';
  url: string;
  duration?: string; // e.g., "15:20" for video
  order: number;
}

export interface Note {
  id: string;
  courseId: string;
  title: string;
  type: 'notes' | 'reference' | 'material';
  url: string;
  fileType: string; // e.g., "PDF", "DOCX"
  fileSize: string; // e.g., "2.4 MB"
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  deadline: string;
  maxMarks: number;
}

export interface Submission {
  id: string;
  assignmentId: string;
  courseId: string;
  studentId: string;
  studentName: string;
  fileUrl: string;
  fileName: string;
  submittedAt: string;
  marks?: number;
  feedback?: string;
  status: 'pending' | 'graded' | 'returned' | 'rejected';
  isLate: boolean;
}

export interface QuestionPaper {
  id: string;
  courseId: string;
  title: string;
  year: number;
  semester: string;
  term: 'mid' | 'end' | 'practical';
  fileUrl: string;
}

export interface Question {
  id: string;
  type: 'mcq' | 'true_false' | 'multiple' | 'short';
  text: string;
  options?: string[]; // MCQs and Multiple Answer
  correctAnswer: string | string[]; // Single string for MCQ/TF/Short, string[] for Multiple
}

export interface Quiz {
  id: string;
  courseId: string;
  title: string;
  timeLimit: number; // in minutes
  passingMarks: number;
  attemptsAllowed: number;
  questions: Question[];
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  score: number;
  percentage: number;
  passed: boolean;
  attemptedAt: string;
}

export interface CertificateConfig {
  courseId: string;
  minimumScore: number; // e.g. 70% on quiz
  requiredLecturesCount: number; // e.g. 3 of 4 completed
  assignmentRequired: boolean; // must submit assignment
  enabled: boolean;
}

export interface Certificate {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  instructorName: string;
  adminName: string;
  issueDate: string;
  certificateId: string; // formatted ID: NX-2026-XXXX
  qrCodeData: string; // verification URL
  goldSeal: boolean;
}

export interface Announcement {
  id: string;
  courseId: 'global' | string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  createdAt: string;
}

export interface ForumPost {
  id: string;
  courseId: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  createdAt: string;
  replies: ForumReply[];
}

export interface ForumReply {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  createdAt: string;
}

export interface SystemLog {
  id: string;
  action: string;
  details: string;
  userEmail: string;
  timestamp: string;
  ipAddress: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'assignment' | 'quiz' | 'announcement' | 'certificate' | 'upload' | 'deadline';
  read: boolean;
  createdAt: string;
}

export interface DatabaseSchema {
  users: User[];
  courses: Course[];
  lectures: Lecture[];
  notes: Note[];
  assignments: Assignment[];
  submissions: Submission[];
  questionPapers: QuestionPaper[];
  quizzes: Quiz[];
  quizAttempts: QuizAttempt[];
  certificateConfigs: CertificateConfig[];
  certificates: Certificate[];
  announcements: Announcement[];
  forumPosts: ForumPost[];
  systemLogs: SystemLog[];
  notifications: AppNotification[];
  lectureProgress: { [studentCourseId: string]: string[] }; // studentId:courseId -> list of completed lectureIds
}
