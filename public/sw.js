// 쌤스케치 Service Worker
const CACHE_NAME = 'ssam-sketch-v1'
const RUNTIME_CACHE = 'ssam-sketch-runtime'

// 캐시할 정적 리소스 (필수 리소스만)
const PRECACHE_URLS = [
  '/',
  '/offline.html'
]

// 설치 이벤트: 필수 리소스 캐시
self.addEventListener('install', (event) => {
  console.log('[SW] Install event')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Pre-caching offline page')
        return cache.addAll(PRECACHE_URLS)
      })
      .then(() => self.skipWaiting())
  )
})

// 활성화 이벤트: 이전 캐시 정리
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event')
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE
          })
          .map(cacheName => {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          })
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch 이벤트: Network First with Offline Fallback
self.addEventListener('fetch', (event) => {
  // POST 요청은 캐시하지 않음 (API 제출 등)
  if (event.request.method !== 'GET') {
    return
  }

  // Chrome extension requests 무시
  if (event.request.url.startsWith('chrome-extension://')) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 성공적인 응답만 캐시
        if (response && response.status === 200) {
          const responseClone = response.clone()
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // 네트워크 실패 시 캐시에서 찾기
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse
          }

          // HTML 페이지 요청이면 offline.html 반환
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('/offline.html')
          }

          return new Response('Network error', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' }
          })
        })
      })
  )
})