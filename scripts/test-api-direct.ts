// 직접 API 테스트
const testData = {
  area: "수와 연산",
  difficulty: "easy",
  limit: 5
}

async function testApiDirect() {
  try {
    console.log('=== 직접 API 테스트 ===')
    console.log('요청 데이터:', JSON.stringify(testData, null, 2))

    const response = await fetch('http://localhost:3004/api/problems', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(testData)
    })

    console.log('응답 상태:', response.status)

    const responseData = await response.json()
    console.log('응답 데이터:', JSON.stringify(responseData, null, 2))

    if (responseData.total > 0) {
      console.log('성공: 문제를 찾았습니다!')
      responseData.problems.forEach((p: any, i: number) => {
        console.log(`${i + 1}. ${p.id}: ${p.grade} ${p.difficulty}`)
      })
    } else {
      console.log('실패: 문제를 찾을 수 없습니다.')
      console.log('디버그 정보:', responseData.debug)
    }

  } catch (error) {
    console.error('오류:', error)
  }
}

testApiDirect()