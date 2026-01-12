// service-worker.js - PORTAL QSSMA
const CACHE_NAME = 'portal-qssma-v1-' + new Date().getTime();
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './firebase.js',
  './manifest.json',
  './logo.jpg'
];

// ========== INSTALAÇÃO ==========
self.addEventListener('install', event => {
  console.log('📦 Service Worker: Instalando Portal QSSMA...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Cache aberto:', CACHE_NAME);
        return Promise.all(
          CORE_ASSETS.map(asset => {
            return cache.add(asset).catch(error => {
              console.log('⚠️ Não pôde cachear:', asset, error);
              return false;
            });
          })
        );
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
        console.log('🎯 Claiming clients');
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
      url.hostname.includes('googleapis') ||
      url.hostname.includes('google-analytics')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Se tem no cache, retorna
        if (cachedResponse) {
          console.log('📦 Retornando do cache:', url.pathname);
          return cachedResponse;
        }
        
        // Se não tem, busca na rede
        console.log('🌐 Buscando na rede:', url.pathname);
        
        return fetch(event.request)
          .then(networkResponse => {
            // Se resposta inválida, retorna como está
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            
            // Clona a resposta para cache
            const responseToCache = networkResponse.clone();
            
            // Salva no cache se for nosso arquivo
            if (url.origin === self.location.origin) {
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                  console.log('💾 Salvo no cache:', url.pathname);
                });
            }
            
            return networkResponse;
          })
          .catch(() => {
            // Se offline e é uma página, retorna offline page
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            
            return new Response('Conecte-se à internet para usar o Portal QSSMA', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// ========== PUSH NOTIFICATIONS ==========
self.addEventListener('push', event => {
  console.log('📬 Push notification recebida');
  
  let options = {
    body: 'Nova notificação do Portal QSSMA',
    icon: './logo.jpg',
    badge: './logo.jpg',
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
  console.log('👆 Notificação clicada');
  
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

console.log('✅ Service Worker Portal QSSMA carregado');
