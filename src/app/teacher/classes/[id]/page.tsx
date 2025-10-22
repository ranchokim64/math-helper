'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Users,
  Copy,
  Settings,
  TrendingUp,
  BookOpen,
  Calendar,
  Clock,
  UserMinus,
  Plus,
  Edit,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface ClassInfo {
  id: string
  name: string
  code: string
  teacherId: string
  createdAt: string
  studentCount: number
  assignmentCount: number
  students?: Student[]
}

interface Student {
  id: string
  name: string
  email: string
  joinedAt: string
  lastActiveAt?: string
  completedAssignments: number
  averageScore: number
}

interface ClassStats {
  totalStudents: number
  activeStudents: number
  totalAssignments: number
  averageCompletionRate: number
  averageScore: number
  weeklyActivity: number
}

export default function ClassDetailPage() {
  const router = useRouter()
  const params = useParams()
  const classId = params?.id as string

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [stats, setStats] = useState<ClassStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Settings modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editedClassName, setEditedClassName] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (classId) {
      fetchClassData()
    }
  }, [classId])

  const fetchClassData = async () => {
    try {
      setIsLoading(true)

      // 클래스 기본 정보
      const classResponse = await fetch(`/api/teacher/classes/${classId}`)
      if (classResponse.ok) {
        const classData = await classResponse.json()
        setClassInfo(classData)
      }

      // 학생 목록
      const studentsResponse = await fetch(`/api/teacher/classes/${classId}/students`)
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json()
        setStudents(studentsData)
      }

      // 통계 정보
      const statsResponse = await fetch(`/api/teacher/classes/${classId}/stats`)
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

    } catch (error) {
      console.error('Error fetching class data:', error)
      toast.error('클래스 정보를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyClassCode = async () => {
    if (classInfo?.code) {
      try {
        await navigator.clipboard.writeText(classInfo.code)
        toast.success('클래스 코드가 복사되었습니다!')
      } catch (error) {
        toast.error('클래스 코드 복사에 실패했습니다.')
      }
    }
  }

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm('정말로 이 학생을 클래스에서 제거하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/teacher/classes/${classId}/students/${studentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('학생이 클래스에서 제거되었습니다.')
        fetchClassData() // 데이터 새로고침
      } else {
        toast.error('학생 제거에 실패했습니다.')
      }
    } catch (error) {
      toast.error('학생 제거 중 오류가 발생했습니다.')
    }
  }

  const handleOpenSettings = () => {
    if (classInfo) {
      setEditedClassName(classInfo.name)
      setIsSettingsOpen(true)
    }
  }

  const handleUpdateClass = async () => {
    if (!editedClassName.trim()) {
      toast.error('클래스 이름을 입력해주세요.')
      return
    }

    try {
      setIsUpdating(true)
      const response = await fetch(`/api/teacher/classes/${classId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editedClassName.trim()
        })
      })

      if (response.ok) {
        toast.success('클래스 정보가 성공적으로 수정되었습니다.')
        setIsSettingsOpen(false)
        fetchClassData() // 데이터 새로고침
      } else {
        const errorData = await response.json()
        toast.error(errorData.message || '클래스 정보 수정에 실패했습니다.')
      }
    } catch (error) {
      toast.error('클래스 정보 수정 중 오류가 발생했습니다.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteClass = async () => {
    try {
      const response = await fetch(`/api/teacher/classes/${classId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('클래스가 성공적으로 삭제되었습니다.')
        router.push('/teacher')
      } else {
        const errorData = await response.json()
        toast.error(errorData.message || '클래스 삭제에 실패했습니다.')
      }
    } catch (error) {
      toast.error('클래스 삭제 중 오류가 발생했습니다.')
    } finally {
      setIsDeleteDialogOpen(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">클래스 정보를 불러오는 중...</div>
      </div>
    )
  }

  if (!classInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">클래스를 찾을 수 없습니다</h2>
          <p className="text-gray-600 mb-4">요청하신 클래스가 존재하지 않거나 접근 권한이 없습니다.</p>
          <Button onClick={() => router.push('/teacher')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            대시보드로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/teacher')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>대시보드</span>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  {classInfo.name}
                  <Badge variant="outline" className="text-sm">
                    {classInfo.code}
                  </Badge>
                </h1>
                <p className="text-gray-600">
                  {stats?.totalStudents || 0}명의 학생 • {stats?.totalAssignments || 0}개의 과제
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyClassCode}
              >
                <Copy className="h-4 w-4 mr-2" />
                코드 복사
              </Button>
              <Button variant="outline" size="sm" onClick={handleOpenSettings}>
                <Settings className="h-4 w-4 mr-2" />
                설정
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="students">학생 관리</TabsTrigger>
            <TabsTrigger value="performance">성과 분석</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">총 학생</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalStudents || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.activeStudents || 0}명 활성
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">배정된 과제</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalAssignments || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    평균 완료율 {Math.round(stats?.averageCompletionRate || 0)}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">평균 점수</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(stats?.averageScore || 0)}</div>
                  <p className="text-xs text-muted-foreground">100점 만점</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">이번 주 활동</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.weeklyActivity || 0}</div>
                  <p className="text-xs text-muted-foreground">과제 제출</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>빠른 작업</CardTitle>
                  <CardDescription>
                    이 클래스와 관련된 주요 작업들
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" asChild>
                    <Link href={`/teacher/assignments/new?classId=${classId}`}>
                      <Plus className="h-4 w-4 mr-2" />
                      새 과제 배정하기
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/teacher?tab=assignments">
                      <BookOpen className="h-4 w-4 mr-2" />
                      과제 관리로 이동
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/teacher?tab=classes">
                      <Users className="h-4 w-4 mr-2" />
                      전체 클래스 보기
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>클래스 정보</CardTitle>
                  <CardDescription>
                    기본 클래스 정보
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">생성일</span>
                    <span className="text-sm font-medium">
                      {new Date(classInfo.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">클래스 코드</span>
                    <Badge variant="secondary">{classInfo.code}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">상태</span>
                    <Badge variant="default">활성</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">학생 관리</h2>
                <p className="text-sm text-gray-600">클래스에 참여한 학생들을 관리합니다</p>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyClassCode}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  클래스 코드 공유
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>학생 목록 ({students.length}명)</CardTitle>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      아직 참여한 학생이 없습니다
                    </h3>
                    <p className="text-gray-600 mb-4">
                      클래스 코드 <Badge variant="outline">{classInfo.code}</Badge>를 학생들과 공유하세요
                    </p>
                    <Button onClick={handleCopyClassCode}>
                      <Copy className="h-4 w-4 mr-2" />
                      클래스 코드 복사
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-medium">{student.name}</h4>
                            <span className="text-sm text-gray-500">{student.email}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>
                              <Calendar className="h-3 w-3 inline mr-1" />
                              가입: {new Date(student.joinedAt).toLocaleDateString()}
                            </span>
                            <span>완료한 과제: {student.completedAssignments}개</span>
                            <span>평균 점수: {student.averageScore}점</span>
                            {student.lastActiveAt && (
                              <span>
                                <Clock className="h-3 w-3 inline mr-1" />
                                최근 활동: {new Date(student.lastActiveAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveStudent(student.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">성과 분석</h2>
                <p className="text-sm text-gray-600">클래스 전체의 학습 성과를 분석합니다</p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/teacher?tab=assignments">
                    <BookOpen className="h-4 w-4 mr-2" />
                    과제별 상세 분석
                  </Link>
                </Button>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">과제 완료율</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold">{Math.round(stats?.averageCompletionRate || 0)}%</span>
                      <Badge variant={stats?.averageCompletionRate && stats.averageCompletionRate > 80 ? "default" : stats?.averageCompletionRate && stats.averageCompletionRate > 60 ? "secondary" : "destructive"}>
                        {stats?.averageCompletionRate && stats.averageCompletionRate > 80 ? "우수" : stats?.averageCompletionRate && stats.averageCompletionRate > 60 ? "보통" : "미흡"}
                      </Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.min(stats?.averageCompletionRate || 0, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-600">
                      전체 과제 중 {Math.round(stats?.averageCompletionRate || 0)}% 완료
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">평균 점수</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold">{Math.round(stats?.averageScore || 0)}점</span>
                      <Badge variant={stats?.averageScore && stats.averageScore > 85 ? "default" : stats?.averageScore && stats.averageScore > 70 ? "secondary" : "destructive"}>
                        {stats?.averageScore && stats.averageScore > 85 ? "우수" : stats?.averageScore && stats.averageScore > 70 ? "보통" : "미흡"}
                      </Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${Math.min((stats?.averageScore || 0), 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-600">
                      100점 만점 기준
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">참여도</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold">
                        {stats?.totalStudents ? Math.round((stats.activeStudents / stats.totalStudents) * 100) : 0}%
                      </span>
                      <Badge variant={stats?.totalStudents && stats.activeStudents && (stats.activeStudents / stats.totalStudents) > 0.8 ? "default" : "secondary"}>
                        {stats?.totalStudents && stats.activeStudents && (stats.activeStudents / stats.totalStudents) > 0.8 ? "활발" : "보통"}
                      </Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{ width: `${stats?.totalStudents ? Math.min((stats.activeStudents / stats.totalStudents) * 100, 100) : 0}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-600">
                      {stats?.activeStudents || 0}명 / {stats?.totalStudents || 0}명 활성
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>학습 현황</CardTitle>
                  <CardDescription>
                    클래스의 전반적인 학습 상태를 확인할 수 있습니다
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">총 제출물</span>
                    <span className="text-sm">{stats?.totalSubmissions || 0}개</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">채점 완료</span>
                    <span className="text-sm">{stats?.gradedSubmissions || 0}개</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">이번 주 활동</span>
                    <span className="text-sm">{stats?.weeklyActivity || 0}회</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">활성 학생 비율</span>
                    <span className="text-sm">
                      {stats?.totalStudents ? Math.round((stats.activeStudents / stats.totalStudents) * 100) : 0}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>차트 영역</CardTitle>
                  <CardDescription>
                    시간별 성과 변화를 시각화합니다
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-48 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-center">
                      <TrendingUp className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-500">성과 차트</p>
                      <p className="text-sm text-gray-400 mt-1">추후 구현 예정</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>클래스 설정</DialogTitle>
            <DialogDescription>
              클래스 정보를 수정하거나 삭제할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="className" className="text-right">
                클래스명
              </Label>
              <Input
                id="className"
                value={editedClassName}
                onChange={(e) => setEditedClassName(e.target.value)}
                className="col-span-3"
                placeholder="클래스 이름을 입력하세요"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              클래스 삭제
            </Button>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                취소
              </Button>
              <Button onClick={handleUpdateClass} disabled={isUpdating}>
                <Edit className="h-4 w-4 mr-2" />
                {isUpdating ? '저장 중...' : '저장'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>클래스를 삭제하시겠습니까?</DialogTitle>
            <DialogDescription>
              이 작업은 되돌릴 수 없습니다. 클래스와 관련된 모든 과제 및 제출물이 영구적으로 삭제되며,
              클래스에 속한 학생들은 자동으로 클래스에서 제거됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteClass}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}