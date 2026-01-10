// service-worker.js - VERSÃO COMPLETA
const CACHE_NAME = 'portal-qssma-v1-' + new Date().getTime();
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './firebase.js',
  './manifest.json',
  './assets/logo.jpg'
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
      .catch(error => {
        console.error('❌ Erro na instalação:', error);
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
        console.log('✨ Cache limpo');
        return self.clients.claim();
      })
      .catch(error => {
        console.error('❌ Erro na ativação:', error);
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
      url.hostname.includes('gstatic.com')) {
    return;
  }
  
  // Ignorar requisições de analytics
  if (url.hostname.includes('google-analytics')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Se tem no cache, retorna do cache
        if (cachedResponse) {
          console.log('📦 Servindo do cache:', event.request.url);
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
                console.log('💾 Salvando no cache:', event.request.url);
              })
              .catch(error => {
                console.error('❌ Erro ao salvar no cache:', error);
              });
            
            return networkResponse;
          })
          .catch(error => {
            console.error('❌ Erro na requisição:', error);
            
            // Se é uma navegação, retorna index.html
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            
            // Para imagens, retorna placeholder
            if (event.request.destination === 'image') {
              return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#f0f0f0"/><text x="200" y="150" font-family="Arial" font-size="20" text-anchor="middle" fill="#999">Imagem não disponível offline</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            }
            
            return new Response('Conteúdo indisponível offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// ========== PUSH NOTIFICATIONS ==========
self.addEventListener('push', event => {
  console.log('📬 Push recebido:', event);
  
  let options = {
    body: 'Nova notificação do Portal QSSMA',
    icon: './assets/logo.jpg',
    badge: './assets/logo.jpg',
    vibrate: [100, 50, 100],
    data: {
      url: './',
      timestamp: Date.now()
    },
    actions: [
      { action: 'open', title: 'Abrir Portal' },
      { action: 'close', title: 'Fechar' }
    ]
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.body || options.body;
      options.title = data.title || 'Portal QSSMA';
      options.data = { ...options.data, ...data };
      
      if (data.icon) {
        options.icon = data.icon;
      }
      
    } catch (e) {
      options.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(options.title || 'Portal QSSMA', options)
  );
});

// ========== NOTIFICATION CLICK ==========
self.addEventListener('notificationclick', event => {
  console.log('🔔 Notificação clicada:', event.notification.tag);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data.url || './';
  
  event.waitUntil(
    clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    })
      .then(windowClients => {
        // Verifica se já existe uma janela/tab aberta
        for (let client of windowClients) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Se não existe, abre nova janela/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// ========== BACKGROUND SYNC ==========
self.addEventListener('sync', event => {
  console.log('🔄 Background Sync:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(
      syncData()
        .then(() => {
          console.log('✅ Sync concluído');
          // Enviar notificação
          self.registration.showNotification('Portal QSSMA', {
            body: 'Dados sincronizados com sucesso!',
            icon: './assets/logo.jpg'
          });
        })
        .catch(error => {
          console.error('❌ Erro no sync:', error);
        })
    );
  }
});

// Função de sincronização de dados
async function syncData() {
  console.log('🔄 Sincronizando dados...');
  
  // Aqui você implementaria a lógica de sincronização
  // Exemplo: enviar dados offline para o servidor
  
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  
  const syncPromises = keys.map(async request => {
    // Implementar lógica de sync para cada requisição
    console.log('Sincronizando:', request.url);
  });
  
  return Promise.all(syncPromises);
}

// ========== PERIODIC SYNC ==========
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-content') {
    console.log('🔄 Periodic Sync: Atualizando conteúdo');
    event.waitUntil(updateContent());
  }
});

async function updateContent() {
  console.log('🔄 Atualizando conteúdo em background...');
  
  try {
    // Atualizar cache com conteúdo mais recente
    const cache = await caches.open(CACHE_NAME);
    const updatePromises = CORE_ASSETS.map(async asset => {
      try {
        const response = await fetch(asset);
        if (response.ok) {
          await cache.put(asset, response);
          console.log(`✅ Atualizado: ${asset}`);
        }
      } catch (error) {
        console.error(`❌ Erro ao atualizar ${asset}:`, error);
      }
    });
    
    await Promise.all(updatePromises);
    
  } catch (error) {
    console.error('❌ Erro no periodic sync:', error);
  }
}

console.log('✅ Service Worker carregado e pronto');

// Funções auxiliares
function isCacheable(request) {
  const url = new URL(request.url);
  
  // Cache apenas de nossa origem
  if (url.origin !== location.origin) {
    return false;
  }
  
  // Cache de arquivos estáticos
  const cacheableExtensions = ['.html', '.css', '.js', '.json', '.jpg', '.png', '.svg', '.woff', '.woff2', '.ttf'];
  return cacheableExtensions.some(ext => url.pathname.endsWith(ext));
}
