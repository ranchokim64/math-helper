import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateClassCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function difficultyToKorean(difficulty: string): string {
  const difficultyMap: Record<string, string> = {
    '상': 'hard',
    '중': 'medium',
    '하': 'easy',
    'hard': '상',
    'medium': '중',
    'easy': '하',
  };
  return difficultyMap[difficulty] || difficulty;
}

export function problemTypeToKorean(type: string): string {
  const typeMap: Record<string, string> = {
    '객관식': 'multiple_choice',
    '주관식': 'subjective',
    'multiple_choice': '객관식',
    'subjective': '주관식',
  };
  return typeMap[type] || type;
}