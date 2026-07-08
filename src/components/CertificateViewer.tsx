/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { Award, Printer, Download, CheckCircle2, ShieldCheck, ExternalLink, Globe } from 'lucide-react';
import { Certificate } from '../types';

interface CertificateViewerProps {
  certificate: Certificate;
  onClose: () => void;
}

export default function CertificateViewer({ certificate, onClose }: CertificateViewerProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printAreaRef.current?.innerHTML;
    const originalContent = document.body.innerHTML;

    if (printContent) {
      // Open a print window or style body directly
      window.print();
    }
  };

  return (
    <div id="certificate-viewer-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col md:flex-row border border-gray-100 max-h-[95vh]">
        
        {/* Certificate Display Side (Printable) */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col items-center justify-center bg-[#FDFBF7]">
          {/* Main frame */}
          <div 
            ref={printAreaRef}
            className="w-full max-w-2xl bg-white p-8 md:p-12 border-8 border-double border-[#1F315D] relative shadow-md rounded-lg select-none"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            {/* Inner golden thin border */}
            <div className="absolute inset-2 border border-[#D4A017]"></div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center text-center">
              
              {/* Crest / Header */}
              <div className="flex items-center gap-2.5 mb-6">
                <div className="w-10 h-10 rounded-full bg-[#1F315D] flex items-center justify-center border border-[#D4A017]">
                  <Award className="w-5 h-5 text-[#D4A017]" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-[#1F315D] tracking-wide uppercase">Nexus University</h2>
                  <p className="text-[9px] text-[#D4A017] uppercase tracking-widest font-semibold">Institutional Digital Seal</p>
                </div>
              </div>

              {/* Subtitle */}
              <span className="text-[#D4A017] font-serif italic text-sm font-medium tracking-wide">Upon recommendation of the Academic Senate, hereby confers on</span>

              {/* Recipient */}
              <h1 className="font-serif text-3xl font-bold my-4 text-[#1F315D] border-b-2 border-gray-200 pb-1 px-8 capitalize leading-tight">
                {certificate.studentName}
              </h1>

              {/* Award Statement */}
              <p className="text-gray-600 text-xs max-w-md leading-relaxed my-2">
                the official University Certificate of Coursework Completion for successfully meeting all academic requirements, completing lectures, and scoring passing marks on the comprehensive examinations for:
              </p>

              {/* Course Title */}
              <h3 className="font-serif text-xl font-semibold text-[#1F315D] my-3 italic">
                "{certificate.courseName}"
              </h3>

              {/* Spacing / Signatures */}
              <div className="w-full flex justify-between items-end mt-10 text-[10px]">
                {/* Instructor */}
                <div className="flex flex-col items-center w-1/3">
                  <span className="font-serif italic text-gray-700 font-semibold mb-1 border-b border-gray-300 px-4 pb-0.5">
                    {certificate.instructorName}
                  </span>
                  <span className="text-gray-400 uppercase tracking-wider text-[8px]">Lead Instructor</span>
                </div>

                {/* Gold Seal */}
                <div className="flex flex-col items-center justify-center relative -bottom-2">
                  <div className="w-16 h-16 rounded-full bg-[#D4A017] flex items-center justify-center border-4 border-white shadow-lg relative cursor-default">
                    {/* Golden jagged star visual */}
                    <div className="absolute inset-0 rounded-full border border-dashed border-[#1F315D]/50 animate-spin-slow"></div>
                    <div className="w-11 h-11 rounded-full bg-[#1F315D] flex items-center justify-center text-[#D4A017] font-serif font-bold text-[10px]">
                      SEAL
                    </div>
                  </div>
                  <span className="text-gray-400 text-[8px] uppercase tracking-widest mt-1">Official Seal</span>
                </div>

                {/* Administrator */}
                <div className="flex flex-col items-center w-1/3">
                  <span className="font-serif italic text-gray-700 font-semibold mb-1 border-b border-gray-300 px-4 pb-0.5">
                    {certificate.adminName}
                  </span>
                  <span className="text-gray-400 uppercase tracking-wider text-[8px]">{certificate.adminName.includes('Dean') ? 'Dean of Studies' : 'University Admin'}</span>
                </div>
              </div>

              {/* Footer / QR info */}
              <div className="w-full flex items-center justify-between border-t border-gray-100 mt-8 pt-4">
                <div className="text-left">
                  <p className="text-[9px] text-gray-400">Date Issued: <strong className="text-gray-600">{certificate.issueDate}</strong></p>
                  <p className="text-[9px] text-gray-400">Credential ID: <strong className="text-gray-600 font-mono text-[10px]">{certificate.certificateId}</strong></p>
                </div>

                {/* Simulated QR Code for lookup verification */}
                <div className="flex items-center gap-1.5 border border-gray-100 p-1.5 rounded bg-white">
                  <div className="w-8 h-8 grid grid-cols-4 gap-0.5 bg-gray-50 border border-gray-200">
                    <div className="bg-[#1F315D]"></div>
                    <div className="bg-white"></div>
                    <div className="bg-[#1F315D]"></div>
                    <div className="bg-[#1F315D]"></div>
                    <div className="bg-white"></div>
                    <div className="bg-[#1F315D]"></div>
                    <div className="bg-white"></div>
                    <div className="bg-[#1F315D]"></div>
                    <div className="bg-[#1F315D]"></div>
                    <div className="bg-white"></div>
                    <div className="bg-[#1F315D]"></div>
                    <div className="bg-white"></div>
                    <div className="bg-[#1F315D]"></div>
                    <div className="bg-[#1F315D]"></div>
                    <div className="bg-white"></div>
                    <div className="bg-[#1F315D]"></div>
                  </div>
                  <div className="text-right">
                    <span className="block text-[8px] uppercase tracking-widest text-[#1F315D] font-bold">VERIFY</span>
                    <span className="block text-[7px] text-gray-400">Scan Certificate</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Control and Validation sidebar */}
        <div className="w-full md:w-80 bg-gray-50 p-6 border-t md:border-t-0 md:border-l border-gray-200 flex flex-col justify-between">
          <div className="space-y-5">
            <div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 uppercase tracking-wider mb-2">
                <CheckCircle2 className="w-3 h-3" /> VERIFIED CREDENTIAL
              </span>
              <h2 className="text-lg font-serif font-bold text-[#1F315D]">Certificate Details</h2>
              <p className="text-xs text-gray-500 mt-1">This achievement is registered in the institutional Nexus Ledger.</p>
            </div>

            {/* Validation items */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
              <div className="flex gap-2.5 items-start">
                <ShieldCheck className="w-4.5 h-4.5 text-[#D4A017] shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-gray-700">Digital Authenticity</h4>
                  <p className="text-[11px] text-gray-400 font-mono mt-0.5">{certificate.certificateId}</p>
                </div>
              </div>
              <div className="flex gap-2.5 items-start border-t border-gray-100 pt-3">
                <Globe className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-gray-700">Verification URL</h4>
                  <a 
                    href={`/verify-certificate?id=${certificate.certificateId}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5 mt-0.5"
                  >
                    nexus.edu/verify <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500 leading-relaxed bg-amber-50 border border-amber-200 p-3.5 rounded-xl">
              <strong>Certificate Criteria Met:</strong>
              <ul className="list-disc list-inside mt-1.5 space-y-1">
                <li>Completed all core syllabus lectures.</li>
                <li>Submitted required project papers.</li>
                <li>Scored &ge; 70% in Coursework Exam.</li>
              </ul>
            </div>
          </div>

          <div className="space-y-2 mt-6">
            <button
              onClick={() => window.print()}
              className="w-full bg-[#1F315D] text-white hover:bg-[#2A427D] py-2.5 px-4 rounded-xl font-medium text-xs flex items-center justify-center gap-2 shadow-sm transition-all duration-300"
            >
              <Printer className="w-4 h-4" /> Print Certificate
            </button>
            <button
              onClick={onClose}
              className="w-full bg-white text-gray-600 hover:bg-gray-100 py-2.5 px-4 rounded-xl font-medium text-xs border border-gray-200 flex items-center justify-center gap-2 transition-all duration-300"
            >
              Close Window
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
