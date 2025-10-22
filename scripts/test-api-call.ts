// 실제 API 호출 테스트
const testData = {
  school: "초등학교",
  grade: "3학년",
  semester: "2학기",
  area: "수와 연산",
  contentElement: "세 자리 수 범위의 나눗셈",
  difficulty: "easy",
  limit: 5
}

async function testApiCall() {
  try {
    console.log('=== API 호출 테스트 ===')
    console.log('요청 데이터:', JSON.stringify(testData, null, 2))

    const response = await fetch('http://localhost:3004/api/problems', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': '' // 실제로는 브라우저에서 쿠키가 자동으로 전송됨
      },
      body: JSON.stringify(testData)
    })

    console.log('응답 상태:', response.status)
    console.log('응답 헤더:', Object.fromEntries(response.headers.entries()))

    const responseText = await response.text()
    console.log('응답 본문:', responseText)

    if (response.ok) {
      const data = JSON.parse(responseText)
      console.log('파싱된 데이터:', data)
    }

  } catch (error) {
    console.error('API 호출 오류:', error)
  }
}

testApiCall()