// 테스트용 이미지 파일 생성 스크립트
const fs = require('fs');
const path = require('path');

// 간단한 SVG 이미지 생성
function createTestImage(filename, content) {
  const svg = `
<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f0f0f0" stroke="#ccc" stroke-width="2"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="16" fill="#333">
    ${content}
  </text>
</svg>`.trim();

  fs.writeFileSync(path.join(__dirname, 'images', filename), svg);
  console.log(`생성됨: ${filename}`);
}

// 이미지 디렉토리 생성
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}
