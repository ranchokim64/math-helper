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

  // 초기 로드: 학년/학기 옵션만 가져오기
  useEffect(() => {
    const loadInitialFilters = async () => {
      try {
        const response = await fetch('/api/problems/filters')
        const data = await response.json()

        if (response.ok) {
          setFilters({
            schools: data.schools || ["초등학교"],
            grades: data.grades || [],
            semesters: data.semesters || [],
            areas: [],
            contentElements: {},
            achievementStandards: []
          })
        }
      } catch (error) {
        console.error("필터 로드 오류:", error)
        toast.error("필터 옵션을 불러오는 중 오류가 발생했습니다.")
      }
    }

    loadInitialFilters()
  }, [])

  // 학년/학기 선택 시 해당 조건에 맞는 영역 및 내용요소 로드
  useEffect(() => {
    // 학년과 학기가 모두 선택되지 않은 경우
    if (selectedFilters.grades.length === 0 || selectedFilters.semesters.length === 0) {
      setFilters(prev => ({
        ...prev,
        areas: [],
        contentElements: {},
        achievementStandards: []
      }))
      return
    }

    // 선택된 학년/학기 조합에 맞는 데이터 로드
    const loadFilteredData = async () => {
      try {
        // 모든 학년/학기 조합으로 API 호출
        const queries = selectedFilters.grades.flatMap(grade =>
          selectedFilters.semesters.map(semester => {
            const params = new URLSearchParams({ grade, semester })
            return fetch(`/api/problems/filters?${params}`).then(res => res.json())
          })
        )

        const results = await Promise.all(queries)

        // 결과 병합
        const mergedAreas = new Set<string>()
        const mergedContentElements: Record<string, Set<string>> = {}
        const mergedAchievementStandards = new Set<string>()

        results.forEach(data => {
          data.areas?.forEach((area: string) => mergedAreas.add(area))

          Object.entries(data.contentElements || {}).forEach(([area, elements]) => {
            if (!mergedContentElements[area]) {
              mergedContentElements[area] = new Set()
            }
            (elements as string[]).forEach(el => mergedContentElements[area]!.add(el))
          })

          data.achievementStandards?.forEach((std: string) => mergedAchievementStandards.add(std))
        })

        // Set을 배열로 변환
        const finalContentElements: Record<string, string[]> = {}
        Object.entries(mergedContentElements).forEach(([area, elements]) => {
          finalContentElements[area] = Array.from(elements).sort()
        })

        setFilters(prev => ({
          ...prev,
          areas: Array.from(mergedAreas).sort(),
          contentElements: finalContentElements,
          achievementStandards: Array.from(mergedAchievementStandards).sort()
        }))
      } catch (error) {
        console.error("필터 데이터 로드 오류:", error)
        toast.error("필터 데이터를 불러오는 중 오류가 발생했습니다.")
      }
    }

    loadFilteredData()
  }, [selectedFilters.grades, selectedFilters.semesters])

  const handleFilterChange = (category: keyof ProblemFilter, value: string, checked: boolean) => {
    // 학년이나 학기 변경 시에도 유효한 선택은 유지 (스마트 필터링은 useEffect에서 처리)
    if (category === 'grades' || category === 'semesters') {
      setSelectedFilters(prev => ({
        ...prev,
        [category]: checked
          ? [...(prev[category] as string[]), value]
          : (prev[category] as string[]).filter(item => item !== value),
      }))
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
    const newContentElements = checked
      ? [...selectedContentElements, contentElement]
      : selectedContentElements.filter(item => item !== contentElement)

    setSelectedContentElements(newContentElements)

    // 해당 내용요소가 속한 영역 찾기
    let parentArea: string | null = null
    for (const [area, elements] of Object.entries(filters.contentElements)) {
      if (elements.includes(contentElement)) {
        parentArea = area
        break
      }
    }

    if (parentArea) {
      const areaElements = filters.contentElements[parentArea] || []

      // 해당 영역의 모든 내용요소가 선택되었는지 확인
      const allSelected = areaElements.every(el => newContentElements.includes(el))

      // 해당 영역의 내용요소가 하나도 선택되지 않았는지 확인
      const noneSelected = areaElements.every(el => !newContentElements.includes(el))

      setSelectedFilters(prev => {
        const currentAreas = prev.areas
        const areaIsSelected = currentAreas.includes(parentArea!)

        if (allSelected && !areaIsSelected) {
          // 모든 하위 내용요소가 체크되었으면 영역도 체크
          return {
            ...prev,
            areas: [...currentAreas, parentArea!]
          }
        } else if (noneSelected && areaIsSelected) {
          // 모든 하위 내용요소가 해제되었으면 영역도 해제
          return {
            ...prev,
            areas: currentAreas.filter(area => area !== parentArea)
          }
        }

        return prev
      })
    }
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

    // 영역이나 내용요소 중 하나는 반드시 선택되어야 함
    if (selectedFilters.areas.length === 0 && selectedContentElements.length === 0) {
      toast.error("영역 또는 내용요소를 선택해주세요.")
      return
    }

    setIsLoading(true)

    try {
      // 각 난이도별로 문제 요청
      const difficulties = [
        { level: 'easy', count: difficultyCount.easy },
        { level: 'medium', count: difficultyCount.medium },
        { level: 'hard', count: difficultyCount.hard }
      ]

      const newProblems: ProcessedProblem[] = []

      // 난이도별로 문제 수집
      for (const { level, count } of difficulties) {
        if (count > 0) {
          let collectedProblems: ProcessedProblem[] = []

          // 내용요소가 선택된 경우 각 내용요소별로 균등하게 검색
          if (selectedContentElements.length > 0) {
            // 각 내용요소에서 가져올 문제 수 계산 (균등 배분)
            const problemsPerElement = Math.ceil(count / selectedContentElements.length)

            // 모든 내용요소에서 문제 수집
            const problemsByElement: ProcessedProblem[][] = []

            for (const contentElement of selectedContentElements) {
              // 해당 내용요소의 실제 영역 찾기 (항상 내용요소로부터 추출)
              let areaForContentElement: string | undefined = undefined
              for (const [area, elements] of Object.entries(filters.contentElements)) {
                if (elements.includes(contentElement)) {
                  areaForContentElement = area
                  break
                }
              }

              // 영역을 찾지 못한 경우 스킵
              if (!areaForContentElement) {
                console.warn(`내용요소 "${contentElement}"의 영역을 찾을 수 없습니다.`)
                continue
              }

              const requestData = {
                school: "초등학교",
                grade: selectedFilters.grades[0],
                semester: selectedFilters.semesters[0],
                area: areaForContentElement,
                contentElement: contentElement,
                difficulty: level,
                limit: problemsPerElement * 2 // 넉넉하게 요청
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
                  if (data.problems.length > 0) {
                    problemsByElement.push(data.problems)
                    console.log(`${contentElement} (${level}): ${data.problems.length}개 수집`)
                  }
                }
              } catch (error) {
                console.error(`${contentElement} 검색 오류:`, error)
              }
            }

            // 각 내용요소에서 균등하게 문제 선택
            let selectedCount = 0
            let roundRobinIndex = 0

            while (selectedCount < count && problemsByElement.some(arr => arr.length > 0)) {
              // 현재 내용요소 배열에서 문제 가져오기
              if (problemsByElement[roundRobinIndex] && problemsByElement[roundRobinIndex]!.length > 0) {
                const problem = problemsByElement[roundRobinIndex]!.shift()!
                collectedProblems.push(problem)
                selectedCount++
              }

              // 다음 내용요소로 이동 (라운드 로빈)
              roundRobinIndex = (roundRobinIndex + 1) % problemsByElement.length
            }

            console.log(`${level} 난이도: ${selectedContentElements.length}개 내용요소에서 균등하게 ${collectedProblems.length}개 수집`)
          } else {
            // 내용요소가 선택되지 않은 경우 영역 전체에서 검색
            const requestData = {
              school: "초등학교",
              grade: selectedFilters.grades[0],
              semester: selectedFilters.semesters[0],
              area: selectedFilters.areas[0],
              difficulty: level,
              limit: count * 3 // 넉넉하게 검색 (랜덤 선택용)
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

                // 랜덤하게 섞은 후 필요한 만큼 선택
                const shuffled = [...data.problems].sort(() => Math.random() - 0.5)
                collectedProblems = shuffled.slice(0, count)

                console.log(`영역 전체에서 ${collectedProblems.length}개 문제 수집 (랜덤)`)
              } else {
                console.error(`${level} 난이도 영역 전체 검색 실패:`, response.status, await response.text())
              }
            } catch (error) {
              console.error('영역 전체 검색 오류:', error)
            }
          }

          // 수집한 문제들을 랜덤하게 섞기
          const shuffledProblems = [...collectedProblems].sort(() => Math.random() - 0.5)
          newProblems.push(...shuffledProblems)

          console.log(`${level} 난이도 최종 수집: ${collectedProblems.length}/${count}개 (랜덤 섞기 완료)`)
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

            {/* 학년/학기 미선택 시 안내 메시지 */}
            {(selectedFilters.grades.length === 0 || selectedFilters.semesters.length === 0) && (
              <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  먼저 학년과 학기를 선택해주세요
                </p>
              </div>
            )}

            {/* 학년/학기 선택 시 영역 및 내용요소 표시 */}
            {selectedFilters.grades.length > 0 && selectedFilters.semesters.length > 0 && (
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
                )}
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