'use client'

import { useEffect, useState, useCallback } from 'react'
import {ProblemViewer} from '@/components/problem/problem-viewer'
import { ProcessedProblem } from '@/types'

interface VerificationData {
  problem: ProcessedProblem | null
  progress: {
    total: number
    verified: number
    remaining: number
  }
  message?: string
}

export default function VerifyMaskingPage() {
  const [data, setData] = useState<VerificationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // 문제 로드
  const loadProblem = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/verify-masking')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error loading problem:', error)
      alert('문제를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  // 검증 결과 제출
  const submitVerification = useCallback(async (isValid: boolean) => {
    if (!data?.problem || submitting) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/admin/verify-masking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: data.problem.id,
          isValid
        })
      })

      const result = await response.json()

      if (result.success) {
        setData({
          problem: result.problem,
          progress: result.progress
        })
      }
    } catch (error) {
      console.error('Error submitting verification:', error)
      alert('검증 결과 저장 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }, [data, submitting])

  // 키보드 단축키
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (submitting || !data?.problem) return

      // O 키: 올바름
      if (e.key === 'o' || e.key === 'O') {
        e.preventDefault()
        submitVerification(true)
      }
      // X 키: 잘못됨
      else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault()
        submitVerification(false)
      }
      // 오른쪽 화살표: 건너뛰기 (검증 안함)
      else if (e.key === 'ArrowRight') {
        e.preventDefault()
        loadProblem()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [submitVerification, loadProblem, data, submitting])

  // 초기 로드
  useEffect(() => {
    loadProblem()
  }, [loadProblem])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">문제 로딩 중...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">데이터를 불러올 수 없습니다.</div>
      </div>
    )
  }

  if (!data.problem) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-2xl font-bold text-green-600">🎉 모든 객관식 문제 검증 완료!</div>
        <div className="text-lg">
          총 {data?.progress?.total}개 문제를 검증했습니다.
        </div>
      </div>
    )
  }

  const { problem, progress } = data
  const percentage = ((progress.verified / progress.total) * 100).toFixed(1)

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* 헤더 */}
      <div className="max-w-6xl mx-auto mb-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">객관식 마스킹 검증</h1>
            <div className="text-sm text-gray-600">
              문제 ID: {problem.id}
            </div>
          </div>

          {/* 진행률 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                진행률: {progress.verified} / {progress.total}
              </span>
              <span className="font-medium text-blue-600">
                {percentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="text-sm text-gray-600">
              남은 문제: {progress.remaining}개
            </div>
          </div>
        </div>
      </div>

      {/* 문제 표시 */}
      <div className="max-w-6xl mx-auto mb-4">
        <div className="bg-white rounded-lg shadow p-6">
          <ProblemViewer
            problem={problem}
            showAnswerKey={false}
          />
        </div>
      </div>

      {/* 검증 버튼 */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center mb-4">
            <p className="text-lg font-medium mb-2">
              마스킹이 올바르게 적용되었나요?
            </p>
            <p className="text-sm text-gray-600">
              (보기는 보이고, 정답만 가려져야 합니다)
            </p>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => submitVerification(true)}
              disabled={submitting}
              className="px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-lg font-medium min-w-[120px]"
            >
              O 올바름
              <div className="text-sm font-normal mt-1">(키: O)</div>
            </button>

            <button
              onClick={() => submitVerification(false)}
              disabled={submitting}
              className="px-8 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-lg font-medium min-w-[120px]"
            >
              X 잘못됨
              <div className="text-sm font-normal mt-1">(키: X)</div>
            </button>

            <button
              onClick={loadProblem}
              disabled={submitting}
              className="px-8 py-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-lg font-medium min-w-[120px]"
            >
              → 건너뛰기
              <div className="text-sm font-normal mt-1">(키: →)</div>
            </button>
          </div>

          {submitting && (
            <div className="text-center mt-4 text-gray-600">
              저장 중...
            </div>
          )}
        </div>
      </div>

      {/* 단축키 안내 */}
      <div className="max-w-6xl mx-auto mt-4">
        <div className="bg-blue-50 rounded-lg p-4 text-sm text-gray-700">
          <p className="font-medium mb-2">💡 단축키 안내</p>
          <ul className="space-y-1">
            <li><kbd className="px-2 py-1 bg-white rounded border">O</kbd> : 마스킹이 올바름 (다음 문제로)</li>
            <li><kbd className="px-2 py-1 bg-white rounded border">X</kbd> : 마스킹이 잘못됨 (다음 문제로, 출제 제외)</li>
            <li><kbd className="px-2 py-1 bg-white rounded border">→</kbd> : 나중에 다시 검증 (건너뛰기)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
