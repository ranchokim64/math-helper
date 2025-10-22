import { MathProblemAPI, ProcessedProblem, ProblemFilter } from "@/types"
import { difficultyToKorean, problemTypeToKorean } from "@/lib/utils"

// 공공 API 기본 설정
const MATH_API_BASE_URL = process.env.MATH_API_BASE_URL || "https://api.example.com"
const MATH_API_KEY = process.env.MATH_API_KEY || ""

// 임시 샘플 데이터 (실제 API 연동 전 테스트용)
const SAMPLE_PROBLEMS: MathProblemAPI[] = [
  {
    raw_data_info: {
      raw_data_name: "4e711dd6-c69f-4ac9-aedb-9d2676eb1706",
      date: "2024-10-18",
      publisher: "2차 저작",
      publication_year: "2022-08-01",
      school: "초등학교",
      grade: "3학년",
      semester: "2학기",
      subject: "수학",
      revision_year: "2015"
    },
    source_data_info: {
      source_data_name: "S3_초등_3_008547",
      "2009_achievement_standard": [" "],
      "2015_achievement_standard": [
        "[4수01-05] 곱하는 수가 한 자리 수 또는 두 자리 수인 곱셈의 계산 원리를 이해하고 그 계산을 할 수 있다."
      ],
      "2022_achievement_standard": [
        "[4수01-04] 곱하는 수가 한 자리 수 또는 두 자리 수인 곱셈의 계산 원리를 이해하고 그 계산을 할 수 있다."
      ],
      level_of_difficulty: "하",
      types_of_problems: "객관식"
    },
    learning_data_info: [
      {
        class_num: 2,
        class_name: "문항(텍스트)",
        class_info_list: [
          {
            Type: "Bounding_Box",
            Type_value: [[64, 4.42, 754, 38.42]],
            text_description: "색칠된 부분은 실제 어떤 수의 곱인지를 찾아 선택하세요."
          },
          {
            Type: "Bounding_Box",
            Type_value: [[516.65, 94.38, 641.37, 251.38]],
            text_description: "㉠ $2 \\times 6$ ㉡ $2 \\times 60$ ㉢ $20 \\times 6$ ㉣ $200 \\times 6$"
          }
        ]
      },
      {
        class_num: 1,
        class_name: "문항(이미지)",
        class_info_list: [
          {
            Type: "Bounding_Box",
            Type_value: [[256.73, 51.06, 396.25, 296.82]],
            text_description: "$ \\begin{array}{c|ccc} && 3 & 2 & 4 \\\\ \\times & && & 6\\\\ \\hline & & & 2 & 4\\\\ && 1 & 2 & 0 \\\\ &1 & 8 & 0 &0 \\\\ \\hline & 1 & 9 & 4 & 4 \\end{array} $"
          }
        ]
      },
      {
        class_num: 1,
        class_name: "해설(텍스트)",
        class_info_list: [
          {
            Type: "Bounding_Box",
            Type_value: [[53, 361, 892, 389]],
            text_description: "색칠된 부분은 곱해지는 수 324에서 십의 자리의 20과 곱하는 수 6의 곱입니다."
          }
        ]
      }
    ]
  },
  {
    raw_data_info: {
      raw_data_name: "sample-fraction-problem",
      date: "2024-10-20",
      publisher: "교육부",
      publication_year: "2023-03-01",
      school: "초등학교",
      grade: "4학년",
      semester: "1학기",
      subject: "수학",
      revision_year: "2022"
    },
    source_data_info: {
      source_data_name: "S4_초등_4_012345",
      "2009_achievement_standard": [" "],
      "2015_achievement_standard": [
        "[4수02-01] 분수의 의미와 표현을 이해한다."
      ],
      "2022_achievement_standard": [
        "[4수02-01] 분수의 의미와 표현을 이해한다."
      ],
      level_of_difficulty: "중",
      types_of_problems: "주관식"
    },
    learning_data_info: [
      {
        class_num: 1,
        class_name: "문항(텍스트)",
        class_info_list: [
          {
            Type: "Bounding_Box",
            Type_value: [[50, 50, 700, 120]],
            text_description: "다음 그림에서 색칠된 부분을 분수로 나타내세요."
          }
        ]
      },
      {
        class_num: 1,
        class_name: "문항(이미지)",
        class_info_list: [
          {
            Type: "Bounding_Box",
            Type_value: [[100, 150, 500, 350]],
            text_description: "원이 8등분된 그림에서 3개가 색칠된 모습"
          }
        ]
      }
    ]
  }
]

/**
 * 공공 API에서 수학 문제 데이터를 가져오는 함수
 */
export async function fetchMathProblems(filter?: ProblemFilter): Promise<MathProblemAPI[]> {
  try {
    // 실제 API 호출 (현재는 샘플 데이터 반환)
    if (MATH_API_BASE_URL && MATH_API_KEY) {
      // const response = await fetch(`${MATH_API_BASE_URL}/problems`, {
      //   headers: {
      //     'Authorization': `Bearer ${MATH_API_KEY}`,
      //     'Content-Type': 'application/json',
      //   },
      //   method: 'POST',
      //   body: JSON.stringify(filter),
      // })
      //
      // if (!response.ok) {
      //   throw new Error('Failed to fetch problems from API')
      // }
      //
      // return await response.json()
    }

    // 필터링 적용 (샘플 데이터)
    let filteredProblems = [...SAMPLE_PROBLEMS]

    if (filter) {
      if (filter.school) {
        filteredProblems = filteredProblems.filter(p =>
          p.raw_data_info.school === filter.school
        )
      }
      if (filter.grade) {
        filteredProblems = filteredProblems.filter(p =>
          p.raw_data_info.grade === filter.grade
        )
      }
      if (filter.semester) {
        filteredProblems = filteredProblems.filter(p =>
          p.raw_data_info.semester === filter.semester
        )
      }
      if (filter.difficulty) {
        filteredProblems = filteredProblems.filter(p =>
          difficultyToKorean(p.source_data_info.level_of_difficulty) === filter.difficulty
        )
      }
      if (filter.type) {
        filteredProblems = filteredProblems.filter(p =>
          problemTypeToKorean(p.source_data_info.types_of_problems) === filter.type
        )
      }
    }

    return filteredProblems
  } catch (error) {
    console.error('Error fetching math problems:', error)
    throw new Error('수학 문제를 불러오는 중 오류가 발생했습니다.')
  }
}

/**
 * 원본 API 데이터를 서비스에서 사용할 형태로 변환
 */
export function processMathProblem(apiProblem: MathProblemAPI): ProcessedProblem {
  const { raw_data_info, source_data_info, learning_data_info } = apiProblem

  // 라벨링 데이터를 섹션별로 분류
  const sections = learning_data_info.map((dataInfo, index) => {
    const sectionType = dataInfo.class_name.includes('문항(텍스트)') ? 'question' :
                       dataInfo.class_name.includes('문항(이미지)') ? 'image' :
                       dataInfo.class_name.includes('해설') ? 'explanation' : 'choices'

    return {
      type: sectionType as 'question' | 'choices' | 'explanation' | 'image',
      content: dataInfo.class_info_list.map(info => info.text_description).join('\n'),
      boundingBox: dataInfo.class_info_list[0]?.Type_value[0],
      position: index
    }
  })

  return {
    id: source_data_info.source_data_name,
    imageUrl: `/api/problems/image/${raw_data_info.raw_data_name}`, // 이미지 API 엔드포인트
    difficulty: difficultyToKorean(source_data_info.level_of_difficulty) as 'easy' | 'medium' | 'hard',
    type: problemTypeToKorean(source_data_info.types_of_problems) as 'multiple_choice' | 'subjective',
    grade: raw_data_info.grade,
    semester: raw_data_info.semester,
    subject: raw_data_info.subject,
    metadata: source_data_info,
    sections
  }
}

/**
 * 여러 문제를 한번에 처리
 */
export function processMathProblems(apiProblems: MathProblemAPI[]): ProcessedProblem[] {
  return apiProblems.map(processMathProblem)
}

/**
 * 문제 ID로 특정 문제 조회
 */
export async function getMathProblemById(id: string): Promise<ProcessedProblem | null> {
  try {
    const problems = await fetchMathProblems()
    const problem = problems.find(p => p.source_data_info.source_data_name === id)

    if (!problem) {
      return null
    }

    return processMathProblem(problem)
  } catch (error) {
    console.error('Error fetching problem by ID:', error)
    return null
  }
}

/**
 * 필터 옵션을 위한 메타데이터 조회
 */
export async function getMathProblemFilters() {
  try {
    const problems = await fetchMathProblems()

    const schools = [...new Set(problems.map(p => p.raw_data_info.school))]
    const grades = [...new Set(problems.map(p => p.raw_data_info.grade))]
    const semesters = [...new Set(problems.map(p => p.raw_data_info.semester))]
    const difficulties = [...new Set(problems.map(p => p.source_data_info.level_of_difficulty))]
    const types = [...new Set(problems.map(p => p.source_data_info.types_of_problems))]

    return {
      schools,
      grades,
      semesters,
      difficulties,
      types
    }
  } catch (error) {
    console.error('Error fetching problem filters:', error)
    return {
      schools: [],
      grades: [],
      semesters: [],
      difficulties: [],
      types: []
    }
  }
}