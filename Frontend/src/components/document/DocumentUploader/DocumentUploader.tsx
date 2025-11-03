// ============================================
// 📄 1. src/components/document/DocumentUploader/DocumentUploader.tsx
// ============================================
// 드래그 앤 드롭 파일 업로더
// ============================================

'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { formatFileSize } from '@/lib/utils/format';
import styles from './DocumentUploader.module.css';

interface DocumentUploaderProps {
  onFileSelect: (file: File) => void;
}

export default function DocumentUploader({ onFileSelect }: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');

    if (pdfFile) {
      handleFileSelect(pdfFile);
    } else {
      alert('PDF 파일만 업로드 가능합니다.');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // 파일 크기 체크 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.container}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileInputChange}
        className={styles.hiddenInput}
      />

      {!selectedFile ? (
        <div
          className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <div className={styles.uploadIcon}>
            <Upload size={48} />
          </div>
          <h3 className={styles.title}>파일을 드래그하거나 클릭하세요</h3>
          <p className={styles.description}>
            PDF 파일만 업로드 가능 (최대 10MB)
          </p>
        </div>
      ) : (
        <div className={styles.filePreview}>
          <div className={styles.fileIcon}>
            <FileText size={32} />
          </div>
          <div className={styles.fileInfo}>
            <div className={styles.fileName}>{selectedFile.name}</div>
            <div className={styles.fileSize}>{formatFileSize(selectedFile.size)}</div>
          </div>
          <button
            type="button"
            className={styles.removeButton}
            onClick={handleRemoveFile}
            aria-label="파일 제거"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}