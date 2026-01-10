// service-worker.js - VERSÃO BASE
const CACHE_NAME = 'portal-qssma-v1-' + new Date().getTime();
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './firebase.js',
  './manifest.json'
];

// ========== INSTALAÇÃO ==========
self.addEventListener('install', event => {
  console.log('📦 Service Worker: Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Cache aberto:', CACHE_NAME);
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        console.log('🚀 Instalação completa');
        return self.skipWaiting();
      })
  );
});

// ========== ATIVAÇÃO ==========
self.addEventListener('activate', event => {
  console.log('✅ Service Worker: Ativando...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cache => {
            if (cache !== CACHE_NAME) {
              console.log('🗑️ Removendo cache antigo:', cache);
              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// ========== FETCH ==========
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Ignorar requisições que não são GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Ignorar requisições do Firebase
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Se tem no cache, retorna
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Se não tem, busca na rede
        return fetch(event.request)
          .then(networkResponse => {
            // Se resposta inválida, retorna como está
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            
            // Clona a resposta para cache
            const responseToCache = networkResponse.clone();
            
            // Abre o cache e salva
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return networkResponse;
          })
          .catch(() => {
            // Se é uma navegação, retorna index.html
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            
            return new Response('Conteúdo indisponível offline');
          });
      })
  );
});

// ========== PUSH NOTIFICATIONS ==========
self.addEventListener('push', event => {
  let options = {
    body: 'Nova notificação do Portal QSSMA',
    icon: './assets/logo.jpg',
    badge: './assets/logo.jpg',
    vibrate: [100, 50, 100],
    data: {
      url: './'
    }
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.body || options.body;
      options.data = { ...options.data, ...data };
    } catch (e) {
      options.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification('Portal QSSMA', options)
  );
});

// ========== NOTIFICATION CLICK ==========
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(windowClients => {
        for (let client of windowClients) {
          if (client.url === './' && 'focus' in client) {
            return client.focus();
          }
        }
        
        if (clients.openWindow) {
          return clients.openWindow('./');
        }
      })
  );
});

console.log('✅ Service Worker carregado');
