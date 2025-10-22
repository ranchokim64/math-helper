import { PrismaClient } from '@prisma/client'
import { getAllAreas, getAllContentElements } from './achievement-area-mapping'

const prisma = new PrismaClient()

async function testApiResponse() {
  try {
    console.log('=== API 응답 시뮬레이션 테스트 ===\n')

    // 1. 전체 문제 수 확인
    const totalCount = await prisma.problem.count()
    console.log(`총 문제 수: ${totalCount}개`)

    // 2. 영역별 실제 데이터 조회
    const areas = await prisma.problem.findMany({
      select: { area: true },
      where: {
        area: {
          not: null,
          notIn: ['', ' ']
        }
      },
      distinct: ['area']
    })

    console.log('\n=== 실제 데이터베이스의 영역 ===')
    areas.forEach(area => {
      console.log(`- ${area.area}`)
    })

    // 3. 내용요소별 실제 데이터 조회
    const contentElements = await prisma.problem.findMany({
      select: { contentElement: true },
      where: {
        contentElement: {
          not: null,
          notIn: ['', ' ']
        }
      },
      distinct: ['contentElement']
    })

    console.log('\n=== 실제 데이터베이스의 내용요소 ===')
    contentElements.forEach(ce => {
      console.log(`- ${ce.contentElement}`)
    })

    // 4. achievement-area-mapping에서 제공하는 전체 내용요소 목록
    console.log('\n=== 마스터 파일 기반 내용요소 목록 ===')
    const allContentElements = getAllContentElements()
    Object.keys(allContentElements).forEach(area => {
      console.log(`\n${area}:`)
      allContentElements[area].forEach(ce => {
        console.log(`  - ${ce}`)
      })
    })

    // 5. 영역별 내용요소 분포 (실제 문제 수와 함께)
    console.log('\n=== 영역별 내용요소 분포 (문제 수 포함) ===')
    const areaContentElements = await prisma.problem.groupBy({
      by: ['area', 'contentElement'],
      _count: { contentElement: true },
      where: {
        area: { not: null },
        contentElement: { not: null }
      }
    })

    const grouped: Record<string, Array<{contentElement: string, count: number}>> = {}
    areaContentElements.forEach(item => {
      const area = item.area as string
      if (!grouped[area]) grouped[area] = []
      grouped[area].push({
        contentElement: item.contentElement as string,
        count: item._count.contentElement
      })
    })

    Object.keys(grouped).forEach(area => {
      console.log(`\n${area}:`)
      grouped[area]
        .sort((a, b) => b.count - a.count) // 문제 수 많은 순으로 정렬
        .forEach(item => {
          console.log(`  - ${item.contentElement}: ${item.count}개`)
        })
    })

    // 6. 사용자 친화적 표시를 위한 최종 필터 데이터 구성
    console.log('\n=== 사용자에게 표시될 필터 옵션 ===')
    const userFriendlyFilters = {
      areas: areas.map(a => a.area).filter(Boolean).sort(),
      contentElements: allContentElements, // 마스터 파일 기반 전체 목록
      actualContentElements: contentElements.map(ce => ce.contentElement).filter(Boolean).sort(),
      totalProblems: totalCount
    }

    console.log('영역 옵션:', userFriendlyFilters.areas)
    console.log('\n전체 내용요소 옵션 (마스터 파일):')
    Object.keys(userFriendlyFilters.contentElements).forEach(area => {
      console.log(`  ${area}: ${userFriendlyFilters.contentElements[area].length}개`)
    })
    console.log('\n실제 데이터가 있는 내용요소:', userFriendlyFilters.actualContentElements.length, '개')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testApiResponse()