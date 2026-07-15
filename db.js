(function(){
  'use strict';
  const DB_NAME='sspq8_clean_db';
  const DB_VERSION=1;
  let dbPromise;
  function openDB(){
    if(dbPromise) return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains('packages')) db.createObjectStore('packages',{keyPath:'id'});
        if(!db.objectStoreNames.contains('clients')) db.createObjectStore('clients',{keyPath:'id'});
        if(!db.objectStoreNames.contains('orders')) db.createObjectStore('orders',{keyPath:'id'});
        if(!db.objectStoreNames.contains('files')) {
          const s=db.createObjectStore('files',{keyPath:'id'});
          s.createIndex('orderId','orderId');
        }
        if(!db.objectStoreNames.contains('settings')) db.createObjectStore('settings',{keyPath:'key'});
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
    return dbPromise;
  }
  async function store(name,mode='readonly'){return (await openDB()).transaction(name,mode).objectStore(name)}
  async function get(name,key){const s=await store(name);return new Promise((r,j)=>{const q=s.get(key);q.onsuccess=()=>r(q.result||null);q.onerror=()=>j(q.error)})}
  async function getAll(name){const s=await store(name);return new Promise((r,j)=>{const q=s.getAll();q.onsuccess=()=>r(q.result||[]);q.onerror=()=>j(q.error)})}
  async function put(name,value){const s=await store(name,'readwrite');return new Promise((r,j)=>{const q=s.put(value);q.onsuccess=()=>r(value);q.onerror=()=>j(q.error)})}
  async function remove(name,key){const s=await store(name,'readwrite');return new Promise((r,j)=>{const q=s.delete(key);q.onsuccess=()=>r(true);q.onerror=()=>j(q.error)})}
  async function getByIndex(name,index,key){const s=await store(name);const i=s.index(index);return new Promise((r,j)=>{const q=i.getAll(key);q.onsuccess=()=>r(q.result||[]);q.onerror=()=>j(q.error)})}
  async function clear(name){const s=await store(name,'readwrite');return new Promise((r,j)=>{const q=s.clear();q.onsuccess=()=>r(true);q.onerror=()=>j(q.error)})}
  window.SSPDB={openDB,get,getAll,put,remove,getByIndex,clear};
})();
