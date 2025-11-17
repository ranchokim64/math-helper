export type UserRole = 'teacher' | 'student';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  classId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Class {
  id: string;
  name: string;
  code: string;
  teacherId: string;
  teacher: User;
  students: User[];
  assignments: Assignment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Assignment {
  id: string;
  title: string;
  description?: string;
  problems: string[];
  classId: string;
  class: Class;
  submissions: Submission[];
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Submission {
  id: string;
  studentId: string;
  student: User;
  assignmentId: string;
  assignment: Assignment;
  recordingUrl?: string;
  feedback?: string;
  score?: number;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MathProblemAPI {
  raw_data_info: RawDataInfo;
  source_data_info: SourceDataInfo;
  learning_data_info: LearningDataInfo[];
}

export interface RawDataInfo {
  raw_data_name: string;
  date: string;
  publisher: string;
  publication_year: string;
  school: string;
  grade: string;
  semester: string;
  subject: string;
  revision_year: string;
}

export interface SourceDataInfo {
  source_data_name: string;
  "2009_achievement_standard": string[];
  "2015_achievement_standard": string[];
  "2022_achievement_standard": string[];
  level_of_difficulty: '상' | '중' | '하';
  types_of_problems: '객관식' | '주관식';
}

export interface LearningDataInfo {
  class_num: number;
  class_name: string;
  class_info_list: ClassInfo[];
}

export interface ClassInfo {
  Type: 'Bounding_Box';
  Type_value: number[][];
  text_description: string;
}

export interface ProcessedProblem {
  id: string;
  imageUrl: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'multiple_choice' | 'subjective';
  grade: string;
  semester: string;
  subject: string;
  area?: string;
  contentElement?: string;
  metadata: SourceDataInfo;
  sections: ProblemSection[];
}

export interface ProblemSection {
  type: 'question' | 'choices' | 'explanation' | 'image' | 'text' | 'answer' | 'question_image';
  content: string;
  boundingBox?: number[][]; // [[x1, y1, x2, y2]]
  position: number;
  className?: string; // 원본 class_name (예: "정답(이미지)", "해설(텍스트)")
}

export interface ProblemFilter {
  school?: string;
  grade?: string;
  semester?: string;
  difficulty?: string;
  type?: string;
  achievement_standard?: string[];
  search?: string;
}

// 활동 세그먼트 타입
export interface ActivitySegment {
  type: 'writing' | 'erasing' | 'paused';
  startTime: number;  // timestamp (ms)
  endTime?: number;   // timestamp (ms)
  duration?: number;  // seconds
  metadata?: {
    strokesErased?: number;  // 지운 스트로크 개수
    isRework?: boolean;      // 재풀이 여부 (3초 이상 지우기)
  };
}

// 문제 풀이 분석 통계
export interface ProblemSolvingAnalytics {
  writingTime: number;       // 1. 필기 시간 (초)
  thinkingTime: number;      // 2. 고민 시간 (초)
  erasingTime: number;       // 3. 지우기 시간 (초)
  firstReactionTime: number; // 4. 최초 반응 (초)
  maxPauseTime: number;      // 5. 최대 정지 (초)
  reworkCount: number;       // 6. 재풀이 횟수 (3초 이상 지우기)
  totalTime: number;         // 총 활동 시간 (초)
}

// 문제별 활동 메타데이터
export interface ProblemActivity {
  problemId: string;
  totalTime: number;        // 총 시간 (초)
  drawingTime: number;      // 필기 시간 (초)
  pausedTime: number;       // 고민 시간 (초)
  answeringTime: number;    // 답안 입력 시간 (초)
  segments: ActivitySegment[]; // 상세 타임라인
  firstDrawTime?: number;   // 첫 필기 시작 시각
  submitTime?: number;      // 제출 시각
}