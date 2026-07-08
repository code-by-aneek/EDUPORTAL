/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Play, CheckCircle, FileText, Download, Upload, HelpCircle, User, Award, 
  MessageSquare, Send, AlertTriangle, Clock, RefreshCw, Calendar, Trash2, 
  Settings, CheckSquare, Plus, FileQuestion
} from 'lucide-react';
import { Course, Lecture, Note, Assignment, QuestionPaper, Quiz, User as UserType, ForumPost, Submission } from '../types';

interface CourseDetailsPageProps {
  courseId: string;
  user: UserType;
  onNavigateBack: () => void;
  onShowCertificate: (cert: any) => void;
}

export default function CourseDetailsPage({ courseId, user, onNavigateBack, onShowCertificate }: CourseDetailsPageProps) {
  // Tabs: 'lectures' | 'notes' | 'assignments' | 'papers' | 'about' | 'forum'
  const [activeTab, setActiveTab] = useState<'lectures' | 'notes' | 'assignments' | 'papers' | 'about' | 'forum'>('lectures');
  
  // Datasets
  const [course, setCourse] = useState<Course | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [questionPapers, setQuestionPapers] = useState<QuestionPaper[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [certificateConfig, setCertificateConfig] = useState<any>(null);
  
  // Student specific watch lists
  const [watchedLectures, setWatchedLectures] = useState<string[]>([]);
  const [studentSubmission, setStudentSubmission] = useState<Submission | null>(null);
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]); // For Teacher view

  // Forums
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [activePostReplyId, setActivePostReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Quiz Taking state
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizInProgress, setQuizInProgress] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  const [quizTimer, setQuizTimer] = useState(600); // 10 mins (600s)
  const [quizAttemptResult, setQuizAttemptResult] = useState<any>(null);

  // Material Uploads Form states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<'lecture' | 'notes' | 'assignment' | 'paper'>('lecture');
  const [upTitle, setUpTitle] = useState('');
  const [upUrl, setUpUrl] = useState('');
  const [upLectType, setUpLectType] = useState<'video' | 'pdf' | 'slides'>('video');
  const [upLectDur, setUpLectDur] = useState('15:00');
  const [upNoteType, setUpNoteType] = useState<'notes' | 'reference'>('notes');
  const [upNoteFileExt, setUpNoteFileExt] = useState('PDF');
  const [upNoteSize, setUpNoteSize] = useState('2.4 MB');
  const [upAssignDesc, setUpAssignDesc] = useState('');
  const [upAssignMax, setUpAssignMax] = useState(100);
  const [upAssignDate, setUpAssignDate] = useState('');
  const [upPaperYear, setUpPaperYear] = useState(2026);
  const [upPaperTerm, setUpPaperTerm] = useState<'mid' | 'end' | 'practical'>('mid');
  const [upPaperSem, setUpPaperSem] = useState('1st');

  // Teacher grading inputs
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);
  const [gradeMarks, setGradeMarks] = useState(100);
  const [gradeFeedback, setGradeFeedback] = useState('');

  // Course completion metric
  const [overallProgress, setOverallProgress] = useState(0);

  const [loading, setLoading] = useState(true);

  const loadCourseDetails = async () => {
    try {
      const emailHeaders = { 'x-user-email': user.email };
      const res = await fetch(`/api/courses/${courseId}`);
      if (!res.ok) throw new Error('Failed to load course details.');
      const data = await res.json();
      
      setCourse(data.course);
      setLectures(data.lectures);
      setNotes(data.notes);
      setAssignments(data.assignments);
      setQuestionPapers(data.questionPapers);
      setQuizzes(data.quizzes);
      setCertificateConfig(data.certificateConfig);

      // Load discussions
      const forumRes = await fetch(`/api/courses/${courseId}/forum`);
      if (forumRes.ok) {
        setForumPosts(await forumRes.json());
      }

      // Load Student/Teacher specific submissions
      if (user.role === 'student') {
        const watchedLecs = data.lectures.filter((l: Lecture) => l.order === 1).map((l: Lecture) => l.id); // Default watch
        setWatchedLectures(watchedLecs);

        // Find student submission for first assignment if exists
        if (data.assignments.length > 0) {
          const subRes = await fetch(`/api/courses/${courseId}/submissions`);
          if (subRes.ok) {
            const subsList = await subRes.json();
            const mySub = subsList.find((s: Submission) => s.studentId === user.id && s.assignmentId === data.assignments[0].id);
            setStudentSubmission(mySub || null);
          }
        }
      } else {
        // Teacher / Admin load all submissions for grading
        const subRes = await fetch(`/api/courses/${courseId}/submissions`);
        if (subRes.ok) {
          setAllSubmissions(await subRes.json());
        }
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourseDetails();
  }, [courseId]);

  // Quiz timer counting down
  useEffect(() => {
    let timer: any;
    if (quizInProgress && quizTimer > 0) {
      timer = setInterval(() => {
        setQuizTimer(prev => prev - 1);
      }, 1000);
    } else if (quizTimer === 0 && quizInProgress) {
      handleQuizAutoSubmit();
    }
    return () => clearInterval(timer);
  }, [quizInProgress, quizTimer]);

  // Handle Mark Watched Lecture
  const handleMarkWatched = async (lectureId: string) => {
    if (watchedLectures.includes(lectureId)) return;
    try {
      const res = await fetch(`/api/courses/${courseId}/lectures/${lectureId}/watch`, {
        method: 'POST',
        headers: { 'x-user-email': user.email }
      });
      if (res.ok) {
        setWatchedLectures(prev => [...prev, lectureId]);
        alert('Lecture marked as completed! 🎓');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Student submit assignment
  const handleStudentSubmitAssignment = async (e: React.FormEvent, assignmentId: string) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/courses/${courseId}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user.email
        },
        body: JSON.stringify({
          assignmentId,
          fileName: 'alex_mercer_project_draft.pdf',
          fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
        })
      });

      if (res.ok) {
        alert('Project Assignment uploaded successfully to security ledger! 📑');
        loadCourseDetails();
      }
    } catch (err) {
      alert('Could not upload submission.');
    }
  };

  // Teacher grade submission
  const handleGradeSubmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmissionId) return;

    try {
      const res = await fetch(`/api/submissions/${gradingSubmissionId}/grade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user.email
        },
        body: JSON.stringify({
          marks: gradeMarks,
          feedback: gradeFeedback,
          status: 'graded'
        })
      });

      if (res.ok) {
        alert('Grading evaluation saved successfully! Student notified.');
        setGradingSubmissionId(null);
        setGradeFeedback('');
        loadCourseDetails();
      }
    } catch (err) {
      alert('Grading failed.');
    }
  };

  // Launch Quiz
  const handleStartQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setQuizTimer(quiz.timeLimit * 60);
    setQuizAnswers({});
    setQuizAttemptResult(null);
    setQuizInProgress(true);
  };

  const handleSelectAnswer = (qId: string, answer: any) => {
    setQuizAnswers(prev => ({
      ...prev,
      [qId]: answer
    }));
  };

  const handleSelectMultipleAnswer = (qId: string, option: string) => {
    const current = quizAnswers[qId] || [];
    let next: string[];
    if (current.includes(option)) {
      next = current.filter((o: string) => o !== option);
    } else {
      next = [...current, option];
    }
    setQuizAnswers(prev => ({ ...prev, [qId]: next }));
  };

  const handleQuizSubmit = async () => {
    if (!activeQuiz) return;
    setQuizInProgress(false);
    
    try {
      const res = await fetch(`/api/courses/${courseId}/quizzes/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user.email
        },
        body: JSON.stringify({
          quizId: activeQuiz.id,
          answers: quizAnswers
        })
      });

      const data = await res.json();
      if (res.ok) {
        setQuizAttemptResult(data.attempt);
      } else {
        alert(data.error || 'Failed evaluation.');
      }
    } catch (err) {
      alert('Evaluation network error.');
    }
  };

  const handleQuizAutoSubmit = () => {
    alert('Timer expired! Automated evaluation commencing.');
    handleQuizSubmit();
  };

  // Forums Posting
  const handleCreateForumPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim()) return;

    try {
      const res = await fetch(`/api/courses/${courseId}/forum`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user.email
        },
        body: JSON.stringify({
          title: newPostTitle,
          content: newPostContent
        })
      });

      if (res.ok) {
        setNewPostTitle('');
        setNewPostContent('');
        loadCourseDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReplyForumPost = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      const res = await fetch(`/api/forum/posts/${postId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user.email
        },
        body: JSON.stringify({ content: replyText })
      });

      if (res.ok) {
        setReplyText('');
        setActivePostReplyId(null);
        loadCourseDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Publish material
  const handlePublishMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upTitle) return;

    try {
      let endpoint = `/api/courses/${courseId}/`;
      let body: any = { title: upTitle };

      if (uploadType === 'lecture') {
        endpoint += 'lectures';
        body.type = upLectType;
        body.url = upUrl;
        body.duration = upLectDur;
      } else if (uploadType === 'notes') {
        endpoint += 'notes';
        body.type = upNoteType;
        body.fileType = upNoteFileExt;
        body.fileSize = upNoteSize;
        body.url = upUrl;
      } else if (uploadType === 'assignment') {
        endpoint += 'assignments';
        body.description = upAssignDesc;
        body.deadline = upAssignDate || new Date(Date.now() + 5*24*60*60*1000).toISOString();
        body.maxMarks = upAssignMax;
      } else {
        endpoint += 'question-papers';
        body.year = upPaperYear;
        body.semester = upPaperSem;
        body.term = upPaperTerm;
        body.fileUrl = upUrl;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user.email
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        alert('Material successfully published to course curriculum! 📚');
        setShowUploadModal(false);
        setUpTitle('');
        setUpUrl('');
        setUpAssignDesc('');
        loadCourseDetails();
      }
    } catch (err) {
      alert('Publishing resource failed.');
    }
  };

  // Helper delete
  const handleDeleteLecture = async (lecId: string) => {
    if (!confirm('Are you sure you want to remove this lecture?')) return;
    try {
      const res = await fetch(`/api/courses/${courseId}/lectures/${lecId}`, {
        method: 'DELETE'
      });
      if (res.ok) loadCourseDetails();
    } catch (err) {
      alert('Delete failed.');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this study note?')) return;
    try {
      const res = await fetch(`/api/courses/${courseId}/notes/${noteId}`, {
        method: 'DELETE'
      });
      if (res.ok) loadCourseDetails();
    } catch (err) {
      alert('Delete failed.');
    }
  };

  if (loading || !course) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-10 h-10 border-4 border-[#1F315D] border-t-[#D4A017] rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500">Synchronizing Classroom Lectures...</p>
      </div>
    );
  }

  // Quiz is active (Fullscreen-like Modal view)
  if (quizInProgress && activeQuiz) {
    const minutes = Math.floor(quizTimer / 60);
    const seconds = quizTimer % 60;

    return (
      <div className="min-h-[80vh] bg-[#F8F5EE] p-6 max-w-3xl mx-auto rounded-2xl border border-gray-200 shadow-xl space-y-6">
        
        {/* Quiz Header */}
        <div className="flex justify-between items-center bg-[#1F315D] text-white p-4 rounded-xl border-b-4 border-[#D4A017]">
          <div>
            <h2 className="font-serif font-bold text-lg">{activeQuiz.title}</h2>
            <span className="text-[10px] uppercase text-gray-300">Passing Criteria: {activeQuiz.passingMarks}% Score</span>
          </div>
          <div className="flex items-center gap-1.5 bg-red-600 px-3.5 py-1.5 rounded-lg text-xs font-bold animate-pulse">
            <Clock className="w-4 h-4" /> {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
          </div>
        </div>

        {/* Question List */}
        <div className="space-y-6">
          {activeQuiz.questions.map((q, idx) => (
            <div key={q.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-3xs space-y-3">
              <span className="block text-[10px] font-bold text-[#D4A017] uppercase">Question {idx + 1} • {q.type.replace('_', ' ')}</span>
              <p className="text-xs font-bold text-gray-800 leading-relaxed">{q.text}</p>

              {/* MCQ Options */}
              {q.type === 'mcq' && q.options && (
                <div className="space-y-2 pt-2">
                  {q.options.map(opt => (
                    <label key={opt} className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${quizAnswers[q.id] === opt ? 'bg-[#1F315D]/5 border-[#1F315D] font-semibold' : 'border-gray-100 hover:bg-gray-50'}`}>
                      <input 
                        type="radio" 
                        name={q.id} 
                        checked={quizAnswers[q.id] === opt}
                        onChange={() => handleSelectAnswer(q.id, opt)}
                        className="text-[#1F315D]" 
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* True / False Options */}
              {q.type === 'true_false' && (
                <div className="flex gap-4 pt-2">
                  {['True', 'False'].map(opt => (
                    <label key={opt} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${quizAnswers[q.id] === opt ? 'bg-[#1F315D]/5 border-[#1F315D] font-semibold text-[#1F315D]' : 'border-gray-100 hover:bg-gray-50'}`}>
                      <input 
                        type="radio" 
                        name={q.id} 
                        checked={quizAnswers[q.id] === opt}
                        onChange={() => handleSelectAnswer(q.id, opt)}
                        className="sr-only" 
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Multiple Answer selection */}
              {q.type === 'multiple' && q.options && (
                <div className="space-y-2 pt-2">
                  {q.options.map(opt => {
                    const isChecked = (quizAnswers[q.id] || []).includes(opt);
                    return (
                      <label key={opt} className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${isChecked ? 'bg-[#1F315D]/5 border-[#1F315D] font-semibold' : 'border-gray-100 hover:bg-gray-50'}`}>
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => handleSelectMultipleAnswer(q.id, opt)}
                          className="rounded text-[#1F315D]" 
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Short Answer text */}
              {q.type === 'short' && (
                <div className="pt-2">
                  <input
                    type="text"
                    value={quizAnswers[q.id] || ''}
                    onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                    placeholder="Input final academic abbreviation or proof term..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              )}

            </div>
          ))}
        </div>

        {/* Submit Form action */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              if (confirm('Cancel attempt? Your responses will be discarded.')) setQuizInProgress(false);
            }}
            className="text-xs text-gray-500 font-bold hover:underline"
          >
            Quit Quiz
          </button>
          <button
            onClick={handleQuizSubmit}
            className="bg-[#1F315D] text-white hover:bg-[#2A427D] py-2.5 px-6 rounded-xl text-xs font-bold uppercase tracking-wider shadow"
          >
            Submit Exam Answers
          </button>
        </div>

      </div>
    );
  }

  // Quiz Attempt Results view
  if (quizAttemptResult) {
    return (
      <div className="min-h-[60vh] bg-white p-8 max-w-xl mx-auto rounded-2xl border border-gray-100 shadow-xl space-y-6 text-center animate-fade-in">
        
        {quizAttemptResult.passed ? (
          <div className="space-y-4">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mx-auto shadow">
              <Award className="w-11 h-11" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-[#1F315D]">Comprehensive Exam Passed! 🎉</h2>
            <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
              Congratulations! You scored <strong>{quizAttemptResult.percentage}%</strong>. The academic requirements for this coursework have been achieved.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-20 h-20 bg-red-50 text-red-600 border border-red-200 rounded-full flex items-center justify-center mx-auto shadow">
              <AlertTriangle className="w-11 h-11 animate-bounce" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-[#1F315D]">Criteria Unmet</h2>
            <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
              You scored <strong>{quizAttemptResult.percentage}%</strong>. A minimum score of <strong>{certificateConfig?.minimumScore || 70}%</strong> is required to pass the exam and qualify for credential rewards.
            </p>
          </div>
        )}

        <div className="bg-[#F8F5EE] p-4 rounded-xl border border-gray-100 shadow-3xs max-w-sm mx-auto text-left text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Evaluation Score:</span>
            <strong className="text-gray-800">{quizAttemptResult.score} Correct answers</strong>
          </div>
          <div className="flex justify-between border-t border-gray-200/50 pt-2">
            <span className="text-gray-500 font-medium">Attempt Timestamp:</span>
            <strong className="text-gray-800 font-mono text-[10px]">{new Date(quizAttemptResult.attemptedAt).toLocaleString()}</strong>
          </div>
        </div>

        <button
          onClick={() => {
            setQuizAttemptResult(null);
            loadCourseDetails();
          }}
          className="bg-[#1F315D] text-white hover:bg-[#2A427D] px-6 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider"
        >
          Return to Classroom
        </button>

      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Course Heading Header Banner */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-xs flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        <div>
          <button
            onClick={onNavigateBack}
            className="text-xs text-gray-400 font-bold hover:text-[#1F315D] mb-3 inline-block"
          >
            &larr; Back to Curriculum
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-[#1F315D]/5 text-[#1F315D] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider">{course.code}</span>
            <span className="text-[10px] text-gray-400 font-medium">{course.department} Department</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#1F315D] mt-2 tracking-wide">{course.title}</h1>
          <p className="text-xs text-gray-400 mt-1">Instructor: <strong>{course.teacherName}</strong> • Semester {course.semester}</p>
        </div>

        {/* Teacher Upload Material Quick Shortcut Trigger */}
        {(user.role === 'teacher' || user.role === 'admin') && (
          <button
            onClick={() => {
              setUploadType('lecture');
              setShowUploadModal(true);
            }}
            className="bg-[#1F315D] text-white hover:bg-[#2A427D] py-2.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Upload className="w-4 h-4 text-[#D4A017]" /> Upload Course Materials
          </button>
        )}
      </div>

      {/* Syllabus Class Tabs Nav */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6 overflow-x-auto pb-px">
          {([
            { id: 'lectures', label: 'Lectures Syllabus' },
            { id: 'notes', label: 'Study Notes & Ref Books' },
            { id: 'assignments', label: 'Class Projects & Assignments' },
            { id: 'papers', label: 'Previous Exam Papers' },
            { id: 'forum', label: 'Discussion Forums' },
            { id: 'about', label: 'Syllabus Details' }
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-xs font-semibold tracking-wide border-b-2 whitespace-nowrap transition-all ${activeTab === tab.id ? 'border-[#1F315D] text-[#1F315D]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Panels Contents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Columns for Tabs details */}
        <div className="lg:col-span-2 space-y-6">

          {/* TAB: LECTURES */}
          {activeTab === 'lectures' && (
            <div className="space-y-4">
              <h3 className="text-base font-serif font-bold text-[#1F315D]">Course Lectures ({lectures.length})</h3>
              
              {lectures.length > 0 ? (
                <div className="space-y-3">
                  {lectures.map(lec => {
                    const isWatched = watchedLectures.includes(lec.id);
                    return (
                      <div key={lec.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-3xs hover:shadow-xs transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div className="flex gap-3 items-start">
                          <div className={`p-2.5 rounded-lg shrink-0 ${isWatched ? 'bg-emerald-50 text-emerald-600' : 'bg-[#1F315D]/5 text-[#1F315D]'}`}>
                            <Play className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-gray-800">{lec.title}</h4>
                            <p className="text-[11px] text-gray-400 mt-0.5">Format: {lec.type.toUpperCase()} {lec.duration && `• Duration: ${lec.duration}`}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          {user.role === 'student' ? (
                            isWatched ? (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> COMPLETED
                              </span>
                            ) : (
                              <button
                                onClick={() => handleMarkWatched(lec.id)}
                                className="bg-[#1F315D] text-white hover:bg-[#2A427D] py-1.5 px-3.5 rounded-lg text-xs font-medium uppercase tracking-wider"
                              >
                                Watch Lecture
                              </button>
                            )
                          ) : (
                            // Admin/Teacher delete
                            (user.role === 'teacher' || user.role === 'admin') && (
                              <button
                                onClick={() => handleDeleteLecture(lec.id)}
                                className="text-red-500 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50"
                                title="Delete Lecture"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-xs text-gray-400">
                  No syllabus lectures uploaded yet by the course faculty.
                </div>
              )}
            </div>
          )}

          {/* TAB: NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <h3 className="text-base font-serif font-bold text-[#1F315D]">Study Guides & Textbook Chapters ({notes.length})</h3>
              
              {notes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {notes.map(note => (
                    <div key={note.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-3xs flex flex-col justify-between hover:shadow transition-all">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">{note.type}</span>
                          <span className="text-[10px] text-gray-400 font-bold">{note.fileType}</span>
                        </div>
                        <h4 className="font-serif font-bold text-sm text-[#1F315D] mt-2.5 leading-snug">{note.title}</h4>
                        <p className="text-[10px] text-gray-400 mt-1">Size: {note.fileSize}</p>
                      </div>

                      <div className="flex gap-2 justify-between items-center border-t border-gray-50 pt-3 mt-4">
                        <a 
                          href={note.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[11px] text-blue-600 font-semibold hover:underline flex items-center gap-0.5"
                        >
                          <Download className="w-3.5 h-3.5" /> Study Materials
                        </a>

                        {(user.role === 'teacher' || user.role === 'admin') && (
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-red-500 hover:text-red-600 p-1 rounded hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-xs text-gray-400">
                  No reference textbooks or notes published for study yet.
                </div>
              )}
            </div>
          )}

          {/* TAB: ASSIGNMENTS */}
          {activeTab === 'assignments' && (
            <div className="space-y-4">
              <h3 className="text-base font-serif font-bold text-[#1F315D]">Project Milestones</h3>
              
              {assignments.length > 0 ? (
                <div className="space-y-5">
                  {assignments.map(assign => {
                    const isOver = new Date() > new Date(assign.deadline);
                    return (
                      <div key={assign.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-3xs space-y-4">
                        <div className="flex justify-between items-start flex-col sm:flex-row gap-2">
                          <div>
                            <h4 className="text-sm font-bold text-gray-800 leading-snug">{assign.title}</h4>
                            <span className="text-[10px] text-red-500 font-semibold block mt-1 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" /> Deadline: {new Date(assign.deadline).toLocaleString()} {isOver && '(PASSED)'}
                            </span>
                          </div>
                          <span className="text-xs bg-[#1F315D]/5 text-[#1F315D] font-bold px-2.5 py-1 rounded-lg shrink-0">
                            Maximum Marks: {assign.maxMarks}
                          </span>
                        </div>

                        <p className="text-xs text-gray-500 leading-relaxed bg-[#F8F5EE] p-3 rounded-lg">{assign.description}</p>

                        {/* STUDENT WORKFLOW */}
                        {user.role === 'student' && (
                          <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            {studentSubmission ? (
                              <div className="space-y-1.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg inline-block ${studentSubmission.status === 'graded' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                  Submission: {studentSubmission.status.toUpperCase()}
                                </span>
                                <p className="text-xs text-gray-600 font-medium">Uploaded file: <strong>{studentSubmission.fileName}</strong></p>
                                {studentSubmission.marks !== undefined && (
                                  <p className="text-xs text-emerald-600">Marks Awarded: <strong>{studentSubmission.marks} / {assign.maxMarks}</strong> • Feedback: "{studentSubmission.feedback}"</p>
                                )}
                              </div>
                            ) : (
                              <form onSubmit={(e) => handleStudentSubmitAssignment(e, assign.id)} className="w-full flex flex-col sm:flex-row gap-3 justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="text-left w-full sm:w-auto">
                                  <h5 className="text-xs font-bold text-gray-800">Draft Project ready?</h5>
                                  <p className="text-[10px] text-gray-400 mt-0.5">Submit draft.pdf (max size 10MB)</p>
                                </div>
                                <button
                                  type="submit"
                                  className="w-full sm:w-auto bg-[#1F315D] text-white hover:bg-[#2A427D] py-2 px-5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5"
                                >
                                  <Upload className="w-4 h-4" /> Upload Project PDF
                                </button>
                              </form>
                            )}
                          </div>
                        )}

                        {/* TEACHER WORKFLOW - SUBMISSIONS GRADING */}
                        {user.role === 'teacher' && (
                          <div className="border-t border-gray-100 pt-4 space-y-3">
                            <h5 className="text-xs font-bold text-[#1F315D]">Student Submissions ({allSubmissions.filter(s => s.assignmentId === assign.id).length})</h5>
                            
                            <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden bg-gray-50/50">
                              {allSubmissions.filter(s => s.assignmentId === assign.id).map(sub => (
                                <div key={sub.id} className="p-3.5 flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs">
                                  <div>
                                    <strong className="text-gray-800 block">{sub.studentName}</strong>
                                    <span className="text-[10px] text-gray-400 block mt-0.5">Submitted: {new Date(sub.submittedAt).toLocaleDateString()} {sub.isLate && <strong className="text-red-500 font-semibold">(LATE)</strong>}</span>
                                    {sub.status === 'graded' && (
                                      <span className="text-[10px] text-emerald-600 block font-semibold mt-1">Evaluated: {sub.marks} Marks • Feedback: "{sub.feedback}"</span>
                                    )}
                                  </div>

                                  <div className="flex gap-2 shrink-0">
                                    <a 
                                      href={sub.fileUrl} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1"
                                    >
                                      Download Draft
                                    </a>
                                    {sub.status !== 'graded' && (
                                      <button
                                        onClick={() => {
                                          setGradingSubmissionId(sub.id);
                                          setGradeMarks(assign.maxMarks);
                                        }}
                                        className="bg-[#1F315D] text-white hover:bg-[#2A427D] px-3.5 py-1.5 rounded-lg font-semibold"
                                      >
                                        Evaluate
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {allSubmissions.filter(s => s.assignmentId === assign.id).length === 0 && (
                                <p className="text-[11px] text-gray-400 p-4 text-center">No student submissions reported.</p>
                              )}
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-xs text-gray-400">
                  No coursework assignments defined.
                </div>
              )}
            </div>
          )}

          {/* TAB: QUESTION PAPERS */}
          {activeTab === 'papers' && (
            <div className="space-y-4">
              <h3 className="text-base font-serif font-bold text-[#1F315D]">Previous Year Question Papers ({questionPapers.length})</h3>
              
              {questionPapers.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-3xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#1F315D] text-white font-serif border-b border-gray-200 uppercase tracking-wider text-[10px]">
                        <th className="p-3.5 font-bold">Exam Semester / Year</th>
                        <th className="p-3.5 font-bold">Term Type</th>
                        <th className="p-3.5 font-bold">Download File</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {questionPapers.map(paper => (
                        <tr key={paper.id} className="hover:bg-[#F8F5EE]/45">
                          <td className="p-3.5 font-bold text-gray-700">{paper.year} Exam • Semester {paper.semester}</td>
                          <td className="p-3.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${paper.term === 'mid' ? 'bg-indigo-50 text-indigo-700' : paper.term === 'end' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                              {paper.term}-semester
                            </span>
                          </td>
                          <td className="p-3.5">
                            <a 
                              href={paper.fileUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <FileText className="w-4 h-4" /> Download PDF Exam
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-xs text-gray-400">
                  No previous exam papers listed.
                </div>
              )}
            </div>
          )}

          {/* TAB: FORUM */}
          {activeTab === 'forum' && (
            <div className="space-y-5 animate-fade-in">
              <h3 className="text-base font-serif font-bold text-[#1F315D]">Course Discussion Forum</h3>
              
              {/* New Post Form */}
              <form onSubmit={handleCreateForumPost} className="bg-white p-4 rounded-xl border border-gray-100 shadow-3xs space-y-3">
                <span className="block text-[11px] font-bold text-[#D4A017] uppercase tracking-wider">Start a New Discussion Thread</span>
                <input
                  type="text"
                  required
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="Thread Topic (e.g. Stuck on Manhattan distance admissibility proofs...)"
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none"
                />
                <textarea
                  required
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Ask a question or explain where you are stuck. Both students and teachers can reply."
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-[#1F315D] text-white hover:bg-[#2A427D] py-2 px-4 rounded-lg text-xs font-semibold flex items-center gap-1 ml-auto"
                >
                  <Send className="w-3.5 h-3.5 text-[#D4A017]" /> Post Thread
                </button>
              </form>

              {/* Thread list */}
              <div className="space-y-4">
                {forumPosts.map(post => (
                  <div key={post.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-3xs space-y-4">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="font-serif font-bold text-base text-[#1F315D]">{post.title}</h4>
                        <span className="text-[9px] text-gray-400">{new Date(post.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-2 leading-relaxed bg-[#F8F5EE]/40 p-3 rounded-lg border border-gray-100/30">{post.content}</p>
                      <span className="text-[10px] text-gray-400 block mt-2">By <strong>{post.authorName}</strong> ({post.authorRole})</span>
                    </div>

                    {/* Replies list */}
                    {post.replies && post.replies.length > 0 && (
                      <div className="pl-6 border-l-2 border-gray-100 space-y-3.5 mt-2">
                        {post.replies.map(rep => (
                          <div key={rep.id} className="bg-gray-50/50 p-3 rounded-xl text-xs">
                            <p className="text-gray-700 leading-relaxed">{rep.content}</p>
                            <span className="text-[9px] text-gray-400 block mt-1.5">
                              Reply by <strong className="text-[#1F315D]">{rep.authorName}</strong> ({rep.authorRole}) • {new Date(rep.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quick reply actions */}
                    <div className="border-t border-gray-50 pt-3">
                      {activePostReplyId === post.id ? (
                        <form onSubmit={(e) => handleReplyForumPost(e, post.id)} className="flex gap-2">
                          <input
                            type="text"
                            required
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Type a helpful reply response..."
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                          />
                          <button
                            type="submit"
                            className="bg-[#1F315D] text-white hover:bg-[#2A427D] px-4 py-2 rounded-lg text-xs font-semibold"
                          >
                            Reply
                          </button>
                        </form>
                      ) : (
                        <button
                          onClick={() => {
                            setActivePostReplyId(post.id);
                            setReplyText('');
                          }}
                          className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Post a Reply Response
                        </button>
                      )}
                    </div>

                  </div>
                ))}
              </div>

            </div>
          )}

          {/* TAB: ABOUT */}
          {activeTab === 'about' && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-3xs space-y-5">
              <div>
                <h3 className="text-base font-serif font-bold text-[#1F315D] border-b border-gray-100 pb-2">Academic Description</h3>
                <p className="text-xs text-gray-500 leading-relaxed mt-2.5">{course.description}</p>
              </div>

              <div>
                <h3 className="text-base font-serif font-bold text-[#1F315D] border-b border-gray-100 pb-2">Course Objectives</h3>
                <p className="text-xs text-gray-500 leading-relaxed mt-2.5">{course.objectives}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                <div className="bg-[#F8F5EE] p-3.5 rounded-xl border border-gray-100">
                  <span className="block text-[10px] text-gray-400 uppercase font-semibold">Credits value</span>
                  <strong className="text-gray-800 text-sm mt-0.5 block">{course.credits} credits</strong>
                </div>
                <div className="bg-[#F8F5EE] p-3.5 rounded-xl border border-gray-100">
                  <span className="block text-[10px] text-gray-400 uppercase font-semibold">Prerequisites Coursework</span>
                  <strong className="text-gray-800 text-sm mt-0.5 block">{course.prerequisites}</strong>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Columns: Quizzes evaluation & Certifications */}
        <div className="space-y-6">

          {/* Quiz Assessment Panel */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-base font-serif font-bold text-[#1F315D] border-b border-gray-100 pb-3 flex items-center gap-1.5">
              <FileQuestion className="w-5 h-5 text-[#D4A017]" /> Exam Evaluat. Quiz
            </h3>
            
            {quizzes.length > 0 ? (
              quizzes.map(quiz => {
                // Check if lectures completed
                const completedLecsCount = watchedLectures.length;
                const configLecsRequired = certificateConfig?.requiredLecturesCount || lectures.length;
                const canTakeQuiz = completedLecsCount >= configLecsRequired;

                return (
                  <div key={quiz.id} className="space-y-3">
                    <span className="text-[10px] bg-[#1F315D]/5 text-[#1F315D] font-bold px-2.5 py-0.5 rounded-full uppercase inline-block">Course Exam</span>
                    <h4 className="text-xs font-bold text-gray-800 leading-normal">{quiz.title}</h4>
                    
                    <div className="text-[11px] text-gray-400 space-y-1 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <p>• Questions: <strong>{quiz.questions.length} (MCQs & TF)</strong></p>
                      <p>• Time Limit: <strong>{quiz.timeLimit} minutes</strong></p>
                      <p>• Passing Marks: <strong>{quiz.passingMarks}%</strong></p>
                    </div>

                    {user.role === 'student' ? (
                      canTakeQuiz ? (
                        <button
                          onClick={() => handleStartQuiz(quiz)}
                          className="w-full bg-[#1F315D] text-white hover:bg-[#2A427D] py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm"
                        >
                          Begin Examination
                        </button>
                      ) : (
                        <div className="bg-amber-50 border border-amber-200/50 p-3 rounded-xl text-xs text-amber-800 space-y-1 leading-relaxed">
                          <strong className="block flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Exam Locked</strong>
                          <span>You must watch at least <strong>{configLecsRequired} lectures</strong> before unlocking the final coursework exam. Currently: {completedLecsCount}/{configLecsRequired}.</span>
                        </div>
                      )
                    ) : (
                      <p className="text-[10px] text-gray-400 text-center font-medium">Student Exam evaluation panel active.</p>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-gray-400 text-center">No quizzes currently published for this course.</p>
            )}
          </div>

          {/* Certificate Generation rules panel */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3.5">
            <h3 className="text-base font-serif font-bold text-[#1F315D] border-b border-gray-100 pb-2.5 flex items-center gap-1.5">
              <Award className="w-5 h-5 text-[#D4A017]" /> Academic Certificates
            </h3>
            
            <p className="text-xs text-gray-500 leading-normal">
              Nexus digital certificates are automatically signed and stored on local university verification catalogs.
            </p>

            <div className="text-[11px] text-gray-500 leading-relaxed bg-[#F8F5EE] p-3 rounded-xl border border-gray-100">
              <strong>Rules defined by faculty:</strong>
              <ul className="list-disc list-inside mt-1.5 space-y-1">
                <li>Watch &ge; {certificateConfig?.requiredLecturesCount || lectures.length} core lectures.</li>
                <li>Submit assignments: <strong>{certificateConfig?.assignmentRequired ? 'REQUIRED' : 'OPTIONAL'}</strong></li>
                <li>Pass coursework quiz with score &ge; {certificateConfig?.minimumScore || 70}%.</li>
              </ul>
            </div>
          </div>

        </div>
      </div>


      {/* MODAL: TEACHER GRADING SUBMISSION */}
      {gradingSubmissionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-2xs">
          <form onSubmit={handleGradeSubmissionSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <h3 className="text-lg font-serif font-bold text-[#1F315D] border-b border-gray-100 pb-2.5">Evaluate Academic Project Draft</h3>
            
            <div>
              <label className="block text-xs font-bold text-[#1F315D] mb-1">Marks Awarded (Scale 0-100)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={gradeMarks}
                onChange={(e) => setGradeMarks(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F315D] mb-1">Feedback Comments</label>
              <textarea
                value={gradeFeedback}
                onChange={(e) => setGradeFeedback(e.target.value)}
                placeholder="Good formulation of heuristical algorithms, proofs are accurate..."
                rows={3}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setGradingSubmissionId(null)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#1F315D] text-white hover:bg-[#2A427D] px-4 py-2 rounded-lg text-xs font-semibold"
              >
                Submit Evaluation
              </button>
            </div>
          </form>
        </div>
      )}


      {/* MODAL: PUBLISH MATERIAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
            <h3 className="text-lg font-serif font-bold text-[#1F315D] mb-1">Publish Course Resource</h3>
            <p className="text-xs text-gray-400 mb-4">Choose resource type and complete curriculum parameters.</p>

            {/* Selector tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-gray-50 border border-gray-100 rounded-xl mb-4 shrink-0">
              {([
                { id: 'lecture', label: 'Lec' },
                { id: 'notes', label: 'Note' },
                { id: 'assignment', label: 'Proj' },
                { id: 'paper', label: 'Exam' }
              ] as const).map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setUploadType(t.id)}
                  className={`py-1.5 text-xs font-semibold capitalize rounded-lg ${uploadType === t.id ? 'bg-[#1F315D] text-white' : 'text-gray-500 hover:text-[#1F315D]'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={handlePublishMaterial} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-xs font-bold text-[#1F315D] mb-1">Material Title (Mandatory)</label>
                <input
                  type="text"
                  required
                  value={upTitle}
                  onChange={(e) => setUpTitle(e.target.value)}
                  placeholder="Lec 04: Artificial Neural Network models..."
                  className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:outline-none"
                />
              </div>

              {/* Lecture sub inputs */}
              {uploadType === 'lecture' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1F315D] mb-1">Type</label>
                    <select
                      value={upLectType}
                      onChange={(e) => setUpLectType(e.target.value as any)}
                      className="w-full border border-gray-200 bg-white rounded-lg p-2 text-xs focus:outline-none"
                    >
                      <option value="video">Video stream</option>
                      <option value="pdf">Theoretical PDF</option>
                      <option value="slides">Slides PDF</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1F315D] mb-1">Duration</label>
                    <input
                      type="text"
                      value={upLectDur}
                      onChange={(e) => setUpLectDur(e.target.value)}
                      placeholder="12:45"
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Notes sub inputs */}
              {uploadType === 'notes' && (
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-[#1F315D] mb-1">Category</label>
                    <select
                      value={upNoteType}
                      onChange={(e) => setUpNoteType(e.target.value as any)}
                      className="w-full border border-gray-200 bg-white rounded-lg p-2 text-xs focus:outline-none"
                    >
                      <option value="notes">Handbook Notes</option>
                      <option value="reference">Ref Book</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1F315D] mb-1">Ext</label>
                    <input
                      type="text"
                      value={upNoteFileExt}
                      onChange={(e) => setUpNoteFileExt(e.target.value)}
                      placeholder="PDF"
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1F315D] mb-1">Size</label>
                    <input
                      type="text"
                      value={upNoteSize}
                      onChange={(e) => setUpNoteSize(e.target.value)}
                      placeholder="3.5 MB"
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Assignment sub inputs */}
              {uploadType === 'assignment' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1F315D] mb-1">Max Score Scale</label>
                    <input
                      type="number"
                      value={upAssignMax}
                      onChange={(e) => setUpAssignMax(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1F315D] mb-1">Submission Deadline</label>
                    <input
                      type="datetime-local"
                      value={upAssignDate}
                      onChange={(e) => setUpAssignDate(e.target.value)}
                      className="w-full border border-gray-200 bg-white rounded-lg p-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1F315D] mb-1">Project Brief Guidelines</label>
                    <textarea
                      value={upAssignDesc}
                      onChange={(e) => setUpAssignDesc(e.target.value)}
                      placeholder="Input comprehensive coding proofs instructions..."
                      rows={2.5}
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Paper sub inputs */}
              {uploadType === 'paper' && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-[#1F315D] mb-1">Exam Year</label>
                    <input
                      type="number"
                      value={upPaperYear}
                      onChange={(e) => setUpPaperYear(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1F315D] mb-1">Semester</label>
                    <input
                      type="text"
                      value={upPaperSem}
                      onChange={(e) => setUpPaperSem(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1F315D] mb-1">Exam Type</label>
                    <select
                      value={upPaperTerm}
                      onChange={(e) => setUpPaperTerm(e.target.value as any)}
                      className="w-full border border-gray-200 bg-white rounded-lg p-2 text-xs focus:outline-none"
                    >
                      <option value="mid">Mid-semester</option>
                      <option value="end">End-semester</option>
                      <option value="practical">Practical lab</option>
                    </select>
                  </div>
                </div>
              )}

              {uploadType !== 'assignment' && (
                <div>
                  <label className="block text-xs font-bold text-[#1F315D] mb-1">Material Source URL</label>
                  <input
                    type="text"
                    value={upUrl}
                    onChange={(e) => setUpUrl(e.target.value)}
                    placeholder="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
                    className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:outline-none"
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end pt-3 border-t border-gray-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#1F315D] text-white hover:bg-[#2A427D] px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Confirm Publish
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
