// 새로운 필터링 로직 테스트
const testCases = [
  {
    name: "영역만 선택 (내용요소 없음)",
    request: {
      school: "초등학교",
      grade: "3학년",
      semester: "2학기",
      area: "수와 연산",
      difficulty: "easy",
      limit: 5
    }
  },
  {
    name: "영역 + 특정 내용요소 선택",
    request: {
      school: "초등학교",
      grade: "3학년",
      semester: "2학기",
      area: "수와 연산",
      contentElement: "세 자리 수 범위의 나눗셈",
      difficulty: "easy",
      limit: 3
    }
  },
  {
    name: "도형과 측정 영역 전체",
    request: {
      area: "도형과 측정",
      difficulty: "easy",
      limit: 5
    }
  }
]

async function testFilteringLogic() {
  console.log('=== 새로운 필터링 로직 테스트 ===\n')

  for (const testCase of testCases) {
    console.log(`### ${testCase.name} ###`)
    console.log('요청:', JSON.stringify(testCase.request, null, 2))

    try {
      const response = await fetch('http://localhost:3004/api/problems/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(testCase.request)
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`결과: ${data.total}개 문제 발견`)

        if (data.total > 0) {
          console.log('샘플 문제들:')
          data.problems.slice(0, 3).forEach((p: any, i: number) => {
            console.log(`  ${i + 1}. ${p.id}: ${p.area} > ${p.grade} ${p.difficulty}`)
          })
        }

        console.log('디버그 정보:', JSON.stringify(data.debug, null, 2))
      } else {
        console.log('응답 오류:', response.status)
      }
    } catch (error) {
      console.error('요청 오류:', error)
    }

    console.log('\n' + '='.repeat(50) + '\n')
  }
}

testFilteringLogic()