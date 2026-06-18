const CACHE_NAME = "apontamento-v3";

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

        fetch(event.request)
            .then(response => {

                const clone = response.clone();

                caches.open(CACHE_NAME)
                    .then(cache =>
                        cache.put(event.request, clone)
                    );

                return response;

            })
            .catch(() =>
                caches.match(event.request)
            )

    );

});
