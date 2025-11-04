
const CACHE_NAME = 'fencing-scout-cache-v1';
// Adicionando os ícones à lista de arquivos para cache
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/icon-192.svg',
  '/icon-512.svg'
];

// Evento de instalação: abre o cache e adiciona os arquivos principais
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

// Evento de ativação: limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Evento de fetch: serve arquivos do cache primeiro, com fallback para a rede
self.addEventListener('fetch', event => {
  // Ignorar requisições que não são GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Ignorar requisições ao Firebase
  if (event.request.url.includes('firebase')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se encontrarmos no cache, retornamos
        if (response) {
          return response;
        }

        // Se não, buscamos na rede
        return fetch(event.request).then(
          networkResponse => {
            // Não armazenamos em cache requisições de extensões do Chrome
            if (event.request.url.startsWith('chrome-extension://')) {
              return networkResponse;
            }
            
            // Resposta válida, clonamos e armazenamos no cache
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(error => {
          console.error("Fetch falhou; você provavelmente está offline.", error);
          // Opcional: retornar uma página offline padrão
        });
      })
  );
});