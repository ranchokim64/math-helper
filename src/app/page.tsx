"use client"

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, Video, BarChart3 } from "lucide-react";
import { InstallAppButton } from "@/components/pwa/install-app-button";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            쌤스케치
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            학생들의 수학 문제 풀이 과정을 녹화하여 교사가 피드백을 제공하는
            혁신적인 온라인 학습 플랫폼입니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg">
              <Link href="/login">시작하기</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/register">회원가입</Link>
            </Button>
            <InstallAppButton
              variant="secondary"
              size="lg"
              className="border-2 border-green-500 text-green-700 hover:bg-green-50"
            />
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardHeader>
              <BookOpen className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle>공공API 문제</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                교육부 공공 API를 통한 다양한 수학 문제를 학년별, 난이도별로 제공
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Video className="h-8 w-8 text-green-600 mb-2" />
              <CardTitle>풀이 과정 녹화</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                실시간 필기와 함께 문제 풀이 과정을 자동으로 녹화하여 저장
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-purple-600 mb-2" />
              <CardTitle>클래스 관리</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                교사가 쉽게 클래스를 생성하고 학생들을 관리할 수 있는 시스템
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-orange-600 mb-2" />
              <CardTitle>피드백 시스템</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                교사가 학생의 풀이 과정을 검토하고 개별 피드백을 제공
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            어떻게 작동하나요?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">클래스 참여</h3>
              <p className="text-gray-600">
                교사가 제공한 클래스 코드로 간편하게 가입하고 과제를 확인
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">문제 풀이</h3>
              <p className="text-gray-600">
                화면에 직접 필기하며 문제를 해결하는 과정이 자동으로 녹화
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">피드백 받기</h3>
              <p className="text-gray-600">
                교사로부터 개인별 맞춤 피드백과 점수를 받아 학습 개선
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
