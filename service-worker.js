const CACHE_NAME = 'vetmed-cache-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/importacao_gatos.json',
  '/medications.json',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Todos os recursos foram cacheados');
        return self.skipWaiting();
      })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', event => {
  // Ignora requisições de chrome-extension
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - retorna resposta do cache
        if (response) {
          return response;
        }

        // Clone da requisição
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // Verifica se a resposta é válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone da resposta
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(() => {
          // Se falhar e for uma requisição HTML, retorna a página offline
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('/index.html');
          }
          // Para outros tipos de arquivo, pode retornar um fallback
          return new Response('Offline - Aplicação PWA', {
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});

// Atualização do Service Worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Toma controle de todas as páginas
      return self.clients.claim();
    })
  );
  
  // Envia mensagem para notificar que o cache foi atualizado
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'CACHE_UPDATED',
        message: 'Cache atualizado para versão v3'
      });
    });
  });
});

// Lida com mensagens do cliente
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
