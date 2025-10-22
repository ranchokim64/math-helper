"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ProcessedProblem } from "@/types"
import {
  Filter,
  Plus,
  Trash2,
  BookOpen,
  BarChart3,
  ChevronDown,
  ChevronRight
} from "lucide-react"

interface ProblemFilter {
  schools: string[]
  grades: string[]
  semesters: string[]
  areas: string[]
  contentElements: Record<string, string[]>
  achievementStandards: string[]
}

interface DifficultyCount {
  easy: number
  medium: number
  hard: number
}

interface ProblemSelectorProps {
  onProblemsSelected: (problems: ProcessedProblem[]) => void
  selectedProblems: ProcessedProblem[]
}

export function ProblemSelector({ onProblemsSelected, selectedProblems }: ProblemSelectorProps) {
  const [filters, setFilters] = useState<ProblemFilter>({
    schools: [],
    grades: [],
    semesters: [],
    areas: [],
    contentElements: {},
    achievementStandards: []
  })

  const [selectedFilters, setSelectedFilters] = useState<ProblemFilter>({
    schools: [],
    grades: [],
    semesters: [],
    areas: [],
    contentElements: {},
    achievementStandards: []
  })

  const [selectedContentElements, setSelectedContentElements] = useState<string[]>([])

  // 영역별 펼침/접힘 상태 관리
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set())

  const [difficultyCount, setDifficultyCount] = useState<DifficultyCount>({
    easy: 0,
    medium: 0,
    hard: 0
  })

  const [isLoading, setIsLoading] = useState(false)

  // 필터 옵션 로드
  useEffect(() => {
    const loadFilters = async () => {
      try {
        // 선택된 학년/학기가 있으면 쿼리 파라미터로 전달
        const params = new URLSearchParams()
        if (selectedFilters.grades.length > 0) {
          params.append('grade', selectedFilters.grades[0])
        }
        if (selectedFilters.semesters.length > 0) {
          params.append('semester', selectedFilters.semesters[0])
        }

        const url = params.toString()
          ? `/api/problems/filters?${params.toString()}`
          : '/api/problems/filters'

        const response = await fetch(url)
        const data = await response.json()

        if (response.ok) {
          // 서버에서 받은 데이터 구조에 맞게 처리
          const processedFilters: ProblemFilter = {
            schools: data.schools || [],
            grades: data.grades || [],
            semesters: data.semesters || [],
            areas: data.areas || [],
            contentElements: data.contentElements || {},
            achievementStandards: data.achievementStandards || []
          }
          setFilters(processedFilters)

          // 총 문제 수 정보 표시
          if (data.totalProblems !== undefined) {
            console.log(`문제은행에 총 ${data.totalProblems}개의 문제가 있습니다.`)
            if (data.totalProblems === 0) {
              toast.info("문제은행에 데이터가 없습니다. 관리자에게 문의하세요.")
            }
          }

        } else {
          // API 오류 시 기본값 사용
          const defaultFilters: ProblemFilter = {
            schools: ["초등학교", "중학교", "고등학교"],
            grades: ["1학년", "2학년", "3학년", "4학년", "5학년", "6학년"],
            semesters: ["1학기", "2학기"],
            areas: [
              "수와 연산",
              "변화와 관계",
              "도형과 측정",
              "자료와 가능성"
            ],
            contentElements: {
              "수와 연산": ["네 자리 이하의 수", "분수", "소수"],
              "변화와 관계": ["규칙 찾기", "비와 비율"],
              "도형과 측정": ["평면도형", "시각과 시간", "길이"],
              "자료와 가능성": ["자료의 정리", "가능성"]
            },
            achievementStandards: [
              "[4수01-04] 곱하는 수가 한 자리 수 또는 두 자리 수인 곱셈의 계산 원리를 이해하고 그 계산을 할 수 있다.",
              "[4수02-01] 분수의 의미와 표현을 이해한다.",
              "[6수02-03] 비율을 이해하고, 비율을 분수, 소수, 백분율로 나타낼 수 있다."
            ]
          }
          setFilters(defaultFilters)
        }
      } catch (error) {
        console.error("필터 로드 오류:", error)
        // 네트워크 오류 시 기본값 사용
        const defaultFilters: ProblemFilter = {
          schools: ["초등학교", "중학교", "고등학교"],
          grades: ["1학년", "2학년", "3학년", "4학년", "5학년", "6학년"],
          semesters: ["1학기", "2학기"],
          areas: [
            "수와 연산",
            "변화와 관계",
            "도형과 측정",
            "자료와 가능성"
          ],
          contentElements: {
            "수와 연산": ["네 자리 이하의 수", "분수", "소수"],
            "변화와 관계": ["규칙 찾기", "비와 비율"],
            "도형과 측정": ["평면도형", "시각과 시간", "길이"],
            "자료와 가능성": ["자료의 정리", "가능성"]
          },
          achievementStandards: [
            "[4수01-04] 곱하는 수가 한 자리 수 또는 두 자리 수인 곱셈의 계산 원리를 이해하고 그 계산을 할 수 있다.",
            "[4수01-05] 곱하는 수가 한 자리 수 또는 두 자리 수인 곱셈의 계산 원리를 이해하고 그 계산을 할 수 있다.",
            "[4수02-01] 분수의 의미와 표현을 이해한다.",
            "[4수03-01] 소수의 의미와 표현을 이해한다."
          ]
        }
        setFilters(defaultFilters)
        toast.error("필터 옵션을 불러오는 중 오류가 발생했습니다. 기본값을 사용합니다.")
      }
    }

    loadFilters()
  }, [selectedFilters.grades, selectedFilters.semesters])

  const handleFilterChange = (category: keyof ProblemFilter, value: string, checked: boolean) => {
    // 학년이나 학기가 변경되면 영역과 내용요소 선택 초기화
    if (category === 'grades' || category === 'semesters') {
      setSelectedFilters(prev => ({
        ...prev,
        [category]: checked
          ? [...(prev[category] as string[]), value]
          : (prev[category] as string[]).filter(item => item !== value),
        areas: [], // 영역 선택 초기화
      }))
      setSelectedContentElements([]) // 내용요소 선택 초기화
      setExpandedAreas(new Set()) // 펼침 상태도 초기화
      return
    }

    if (category === 'areas') {
      // 영역 선택시 해당 영역의 모든 내용요소 자동 체크/해제
      setSelectedFilters(prev => {
        const newAreas = checked
          ? [...prev.areas, value]
          : prev.areas.filter(item => item !== value)

        let newContentElements = [...selectedContentElements]

        if (checked) {
          // 영역 선택시 해당 영역의 모든 내용요소 추가
          const areaContentElements = filters.contentElements[value] || []
          newContentElements = [...new Set([...newContentElements, ...areaContentElements])]
        } else {
          // 영역 해제시 해당 영역의 내용요소들 제거
          const areaContentElements = filters.contentElements[value] || []
          newContentElements = newContentElements.filter(ce => !areaContentElements.includes(ce))
        }

        setSelectedContentElements(newContentElements)

        return {
          ...prev,
          areas: newAreas
        }
      })
    } else {
      setSelectedFilters(prev => ({
        ...prev,
        [category]: checked
          ? [...(prev[category] as string[]), value]
          : (prev[category] as string[]).filter(item => item !== value)
      }))
    }
  }

  const handleContentElementChange = (contentElement: string, checked: boolean) => {
    setSelectedContentElements(prev =>
      checked
        ? [...prev, contentElement]
        : prev.filter(item => item !== contentElement)
    )
  }

  // 영역 펼치기/접기 토글
  const toggleAreaExpansion = (area: string) => {
    setExpandedAreas(prev => {
      const newSet = new Set(prev)
      if (newSet.has(area)) {
        newSet.delete(area)
      } else {
        newSet.add(area)
      }
      return newSet
    })
  }

  const handleDifficultyCountChange = (difficulty: keyof DifficultyCount, value: string) => {
    const count = parseInt(value) || 0
    setDifficultyCount(prev => ({
      ...prev,
      [difficulty]: Math.max(0, count)
    }))
  }

  const addProblemsToAssignment = async () => {
    if (difficultyCount.easy + difficultyCount.medium + difficultyCount.hard === 0) {
      toast.error("최소 1개 이상의 문제를 선택해주세요.")
      return
    }

    if (selectedFilters.grades.length === 0) {
      toast.error("학년을 선택해주세요.")
      return
    }

    if (selectedFilters.semesters.length === 0) {
      toast.error("학기를 선택해주세요.")
      return
    }

    if (selectedFilters.areas.length === 0) {
      toast.error("영역을 선택해주세요.")
      return
    }

    // 내용요소는 선택사항으로 변경 (영역만 선택해도 가능)

    setIsLoading(true)

    try {
      // 각 난이도별로 문제 요청
      const difficulties = [
        { level: 'easy', count: difficultyCount.easy },
        { level: 'medium', count: difficultyCount.medium },
        { level: 'hard', count: difficultyCount.hard }
      ]

      const newProblems: ProcessedProblem[] = []

      // 더 효과적인 검색 전략: 여러 번 검색하여 필요한 문제 수 확보
      for (const { level, count } of difficulties) {
        if (count > 0) {
          let collectedProblems: ProcessedProblem[] = []
          let remainingCount = count

          // 내용요소가 선택된 경우 각 내용요소별로 검색
          if (selectedContentElements.length > 0) {
            for (const contentElement of selectedContentElements) {
              if (remainingCount <= 0) break

              const requestData = {
                school: "초등학교",
                grade: selectedFilters.grades[0],
                semester: selectedFilters.semesters[0],
                area: selectedFilters.areas[0],
                contentElement: contentElement,
                difficulty: level,
                limit: Math.min(remainingCount, 10) // 한 번에 최대 10개씩
              }

              console.log('문제 검색 요청:', requestData)

              try {
                const response = await fetch('/api/problems', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(requestData),
                })

                if (response.ok) {
                  const data = await response.json()
                  const problemsForContentElement = data.problems.slice(0, remainingCount)
                  collectedProblems.push(...problemsForContentElement)
                  remainingCount -= problemsForContentElement.length
                  console.log(`${contentElement} (${level}): ${problemsForContentElement.length}개 수집`)
                }
              } catch (error) {
                console.error(`${contentElement} 검색 오류:`, error)
              }
            }
          } else {
            // 내용요소가 선택되지 않은 경우 영역 전체에서 검색
            const requestData = {
              school: "초등학교",
              grade: selectedFilters.grades[0],
              semester: selectedFilters.semesters[0],
              area: selectedFilters.areas[0],
              difficulty: level,
              limit: count * 2 // 넉넉하게 검색
            }

            console.log('영역 전체 검색 요청:', requestData)

            try {
              const response = await fetch('/api/problems', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
              })

              if (response.ok) {
                const data = await response.json()
                console.log(`${level} 난이도 전체 검색 응답:`, data)
                collectedProblems = data.problems.slice(0, count)
                console.log(`영역 전체에서 ${collectedProblems.length}개 문제 수집`)
              } else {
                console.error(`${level} 난이도 영역 전체 검색 실패:`, response.status, await response.text())
              }
            } catch (error) {
              console.error('영역 전체 검색 오류:', error)
            }
          }

          newProblems.push(...collectedProblems)
          console.log(`${level} 난이도 최종 수집: ${collectedProblems.length}/${count}개`)
        }
      }

      if (newProblems.length > 0) {
        // 기존 선택된 문제들과 합치되, 중복 제거
        const existingIds = new Set(selectedProblems.map(p => p.id))
        const uniqueNewProblems = newProblems.filter(p => !existingIds.has(p.id))

        onProblemsSelected([...selectedProblems, ...uniqueNewProblems])

        toast.success(`${uniqueNewProblems.length}개의 문제가 추가되었습니다.`)

        // 카운트 초기화
        setDifficultyCount({ easy: 0, medium: 0, hard: 0 })
      } else {
        toast.error("선택한 조건에 맞는 문제를 찾을 수 없습니다.")
      }

    } catch (error) {
      toast.error("문제를 추가하는 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const removeProblem = (problemId: string) => {
    const updatedProblems = selectedProblems.filter(p => p.id !== problemId)
    onProblemsSelected(updatedProblems)
    toast.success("문제가 제거되었습니다.")
  }

  const totalProblems = difficultyCount.easy + difficultyCount.medium + difficultyCount.hard

  return (
    <div className="space-y-6">
      {/* 필터 선택 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>문제 선택 조건</span>
          </CardTitle>
          <CardDescription>
            원하는 조건을 선택하고 난이도별 문제 수를 입력하면 문제은행에서 자동으로 문제를 가져옵니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 초등학교 고정 안내 */}
          <div>
            <Label className="text-sm font-medium">학교급</Label>
            <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-blue-800 font-medium">초등학교</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">현재 초등학교 문제만 지원합니다</p>
            </div>
          </div>

          {/* 학년 */}
          <div>
            <Label className="text-sm font-medium">학년</Label>
            <div className="flex flex-wrap gap-3 mt-2">
              {filters.grades.map((grade) => (
                <div key={grade} className="flex items-center space-x-2">
                  <Checkbox
                    id={`grade-${grade}`}
                    checked={selectedFilters.grades.includes(grade)}
                    onCheckedChange={(checked) =>
                      handleFilterChange('grades', grade, checked as boolean)
                    }
                  />
                  <Label htmlFor={`grade-${grade}`} className="text-sm">
                    {grade}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* 학기 */}
          <div>
            <Label className="text-sm font-medium">학기</Label>
            <div className="flex flex-wrap gap-3 mt-2">
              {filters.semesters.map((semester) => (
                <div key={semester} className="flex items-center space-x-2">
                  <Checkbox
                    id={`semester-${semester}`}
                    checked={selectedFilters.semesters.includes(semester)}
                    onCheckedChange={(checked) =>
                      handleFilterChange('semesters', semester, checked as boolean)
                    }
                  />
                  <Label htmlFor={`semester-${semester}`} className="text-sm">
                    {semester}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* 영역 및 내용요소 */}
          <div>
            <Label className="text-sm font-medium">영역 및 내용요소</Label>
            <div className="mt-2 space-y-4">
              {filters.areas.map((area) => (
                <div key={area} className="border rounded-lg p-3">
                  {/* 영역 헤더: 체크박스와 펼치기 버튼 분리 */}
                  <div className="flex items-center justify-between mb-3">
                    {/* 왼쪽: 체크박스와 영역명 */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`area-${area}`}
                        checked={selectedFilters.areas.includes(area)}
                        onCheckedChange={(checked) =>
                          handleFilterChange('areas', area, checked as boolean)
                        }
                      />
                      <Label htmlFor={`area-${area}`} className="text-sm font-medium text-blue-600">
                        {area}
                      </Label>
                    </div>

                    {/* 오른쪽: 펼치기/접기 버튼 */}
                    <button
                      type="button"
                      onClick={() => toggleAreaExpansion(area)}
                      className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 p-1"
                    >
                      <span className="text-xs">내용요소</span>
                      {expandedAreas.has(area) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* 내용요소 체크박스들 (펼쳐진 경우에만 표시) */}
                  {expandedAreas.has(area) && (
                    <div className="ml-6 grid grid-cols-1 gap-2 border-t pt-3">
                      <div className="text-xs text-gray-500 mb-2">
                        {filters.contentElements[area]?.length || 0}개의 내용요소
                      </div>
                      {(filters.contentElements[area] || []).map((contentElement) => (
                        <div key={contentElement} className="flex items-center space-x-2">
                          <Checkbox
                            id={`content-${area}-${contentElement}`}
                            checked={selectedContentElements.includes(contentElement)}
                            onCheckedChange={(checked) =>
                              handleContentElementChange(contentElement, checked as boolean)
                            }
                          />
                          <Label
                            htmlFor={`content-${area}-${contentElement}`}
                            className="text-xs text-gray-600 cursor-pointer hover:text-gray-800"
                          >
                            {contentElement}
                          </Label>
                        </div>
                      ))}
                      {(filters.contentElements[area] || []).length === 0 && (
                        <div className="text-xs text-gray-400 italic">
                          이 영역에는 아직 내용요소가 없습니다
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* 선택된 조건 요약 */}
          {(selectedFilters.areas.length > 0 || selectedContentElements.length > 0) && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-sm font-medium text-blue-800 mb-2">선택된 조건</div>

              {selectedFilters.areas.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs text-blue-600">영역: </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedFilters.areas.map(area => (
                      <Badge key={area} variant="secondary" className="text-xs">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedContentElements.length > 0 && (
                <div>
                  <span className="text-xs text-blue-600">내용요소 ({selectedContentElements.length}개): </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedContentElements.slice(0, 3).map(element => (
                      <Badge key={element} variant="outline" className="text-xs">
                        {element}
                      </Badge>
                    ))}
                    {selectedContentElements.length > 3 && (
                      <Badge variant="outline" className="text-xs text-gray-500">
                        +{selectedContentElements.length - 3}개 더
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* 난이도별 문제 수 입력 */}
          <div>
            <Label className="text-sm font-medium flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>난이도별 문제 수</span>
            </Label>
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div>
                <Label htmlFor="easy-count" className="text-xs text-green-600">하 (쉬움)</Label>
                <Input
                  id="easy-count"
                  type="number"
                  min="0"
                  value={difficultyCount.easy}
                  onChange={(e) => handleDifficultyCountChange('easy', e.target.value)}
                  placeholder="0"
                  className="text-center"
                />
              </div>
              <div>
                <Label htmlFor="medium-count" className="text-xs text-yellow-600">중 (보통)</Label>
                <Input
                  id="medium-count"
                  type="number"
                  min="0"
                  value={difficultyCount.medium}
                  onChange={(e) => handleDifficultyCountChange('medium', e.target.value)}
                  placeholder="0"
                  className="text-center"
                />
              </div>
              <div>
                <Label htmlFor="hard-count" className="text-xs text-red-600">상 (어려움)</Label>
                <Input
                  id="hard-count"
                  type="number"
                  min="0"
                  value={difficultyCount.hard}
                  onChange={(e) => handleDifficultyCountChange('hard', e.target.value)}
                  placeholder="0"
                  className="text-center"
                />
              </div>
            </div>
            {totalProblems > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                총 {totalProblems}개의 문제가 추가됩니다
              </p>
            )}
          </div>

          <Button
            onClick={addProblemsToAssignment}
            disabled={isLoading || totalProblems === 0}
            className="w-full"
          >
            {isLoading ? (
              "문제 추가 중..."
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                문제 추가하기
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 선택된 문제 목록 */}
      {selectedProblems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>선택된 문제</span>
              </div>
              <Badge variant="secondary">{selectedProblems.length}개</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedProblems.map((problem) => (
                <div key={problem.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {problem.grade} {problem.semester}
                      </Badge>
                      <Badge
                        variant={
                          problem.difficulty === 'easy' ? 'secondary' :
                          problem.difficulty === 'medium' ? 'default' : 'destructive'
                        }
                        className="text-xs"
                      >
                        {problem.difficulty === 'easy' ? '하' :
                         problem.difficulty === 'medium' ? '중' : '상'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {problem.type === 'multiple_choice' ? '객관식' : '주관식'}
                      </Badge>
                      {problem.area && (
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                          {problem.area}
                        </Badge>
                      )}
                      {problem.contentElement && (
                        <Badge variant="outline" className="text-xs text-purple-700 border-purple-300">
                          {problem.contentElement}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {problem.sections?.find(s => s.type === 'question')?.content || problem.id}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeProblem(problem.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}