// service-worker.js - VERSÃO CORRIGIDA
const CACHE_NAME = 'portal-qssma-v2-' + new Date().getTime();
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './firebase.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  console.log('📦 Service Worker: Instalando Portal QSSMA...');
  
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
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Ignorar requisições que não são GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Ignorar requisições do Firebase
  const url = new URL(event.request.url);
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Retorna do cache se existir
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Busca na rede
        return fetch(event.request)
          .then(networkResponse => {
            // Verifica se a resposta é válida
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            
            // Clone a resposta para cache
            const responseToCache = networkResponse.clone();
            
            // Cache apenas para nossos arquivos
            if (url.origin === self.location.origin) {
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            
            return networkResponse;
          })
          .catch(error => {
            console.log('🌐 Offline - Erro na rede:', error);
            
            // Se for navegação, retorna index.html
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

self.addEventListener('push', event => {
  console.log('📬 Push notification recebida');
  
  const options = {
    body: 'Nova notificação do Portal QSSMA',
    icon: './logo.jpg',
    badge: './logo.jpg',
    vibrate: [100, 50, 100],
    data: {
      url: './'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('Portal QSSMA', options)
  );
});

self.addEventListener('notificationclick', event => {
  console.log('👆 Notificação clicada');
  
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(windowClients => {
        // Focar em janela existente
        for (let client of windowClients) {
          if (client.url === './' && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Abrir nova janela
        if (clients.openWindow) {
          return clients.openWindow('./');
        }
      })
  );
});
