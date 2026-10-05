/* 光年留影 Service Worker：外壳 network-first，图片 cache-first */
var VERSION = 'ly-v8.0.0';
var SHELL_CACHE = 'ly-shell-' + VERSION;
var PHOTO_CACHE = 'ly-photos-' + VERSION;
var SHELL = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './404.html'
];
self.addEventListener('install', function(e){
  e.waitUntil(caches.open(SHELL_CACHE).then(function(c){
    return Promise.all(SHELL.map(function(u){ return c.add(u).catch(function(){}); }));
  }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){
      if (k !== SHELL_CACHE && k !== PHOTO_CACHE){ return caches.delete(k); }
    }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET'){ return; }
  var url = new URL(req.url);
  if (url.origin !== location.origin){ return; }
  if (req.mode === 'navigate'){
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(SHELL_CACHE).then(function(c){ c.put('./index.html', copy); });
        return res;
      }).catch(function(){
        return caches.match(req).then(function(r){ return r || caches.match('./index.html'); });
      })
    );
    return;
  }
  if (url.pathname.indexOf('/photos/') !== -1){
    e.respondWith(
      caches.open(PHOTO_CACHE).then(function(c){
        return c.match(req).then(function(hit){
          if (hit){ return hit; }
          return fetch(req).then(function(res){
            if (res && res.status === 200){ c.put(req, res.clone()); }
            return res;
          });
        });
      })
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(function(hit){
      var net = fetch(req).then(function(res){
        if (res && res.status === 200){
          caches.open(SHELL_CACHE).then(function(c){ c.put(req, res.clone()); });
        }
        return res;
      }).catch(function(){ return hit; });
      return hit || net;
    })
  );
});
