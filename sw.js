const CACHE_NAME = "apontamento-v2";

const arquivos = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./logo.png",
    "./manifest.json",
    "./icons/icon-192.png",
    "./icons/icon-512.png"
];

self.addEventListener("install", event => {

    event.waitUntil(

        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(arquivos))
            .then(() => self.skipWaiting())

    );

});

self.addEventListener("activate", event => {

    event.waitUntil(

        caches.keys()
            .then(chaves =>
                Promise.all(
                    chaves
                        .filter(chave => chave !== CACHE_NAME)
                        .map(chave => caches.delete(chave))
                )
            )
            .then(() => self.clients.claim())

    );

});

self.addEventListener("fetch", event => {

    event.respondWith(

        caches.match(event.request)
            .then(response => {

                return response || fetch(event.request);

            })

    );

});
