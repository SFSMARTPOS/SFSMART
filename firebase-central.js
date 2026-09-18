/* SF SMART POS — Firebase Central Database Bridge
 * Keeps the existing v19 application logic intact while making its business
 * data central through Cloud Firestore. LocalStorage remains a browser cache.
 */
(function(){
  'use strict';
  const firebaseConfig = {
    apiKey: "AIzaSyArG-Aa2h5nWghJl84NJxPzNRQavuePv_c",
    authDomain: "smart-ce68a.firebaseapp.com",
    projectId: "smart-ce68a",
    storageBucket: "smart-ce68a.firebasestorage.app",
    messagingSenderId: "443018456967",
    appId: "1:443018456967:web:3aa95be00eb8308c846d22"
  };

  const COLLECTION='sfCentralData';
  const META='__meta__';
  const PREFIXES=['sf_smart_pos_','rasith_mobile_'];
  const EXACT=['sf_theme_mode'];
  const original={
    getItem:Storage.prototype.getItem,
    setItem:Storage.prototype.setItem,
    removeItem:Storage.prototype.removeItem
  };
  let suppress=false;
  let bootFinished=false;
  let db=null;
  let unsub=null;
  const pendingLocalWrites=new Set();
  let readyResolve;
  const ready=new Promise(r=>readyResolve=r);
  window.SF_FIREBASE_READY=ready;
  window.SF_FIREBASE_STATUS='connecting';

  function relevant(key){
    return EXACT.includes(String(key)) || PREFIXES.some(p=>String(key).startsWith(p));
  }
  function docId(key){return String(key).replaceAll('/','__slash__');}
  function keyFromId(id){return String(id).replaceAll('__slash__','/');}
  function setLocal(key,value){
    suppress=true;
    try{ original.setItem.call(localStorage,key,value); }
    finally{suppress=false;}
  }
  function removeLocal(key){
    suppress=true;
    try{ original.removeItem.call(localStorage,key); }
    finally{suppress=false;}
  }
  function getLocal(key){return original.getItem.call(localStorage,key)}
  function allLocal(){
    const out={};
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k && relevant(k)) out[k]=getLocal(k);
    }
    return out;
  }

  function queueRemoteWrite(key,value){
    if(suppress || !bootFinished || !db || !relevant(key)) return;
    pendingLocalWrites.add(String(key));
    db.collection(COLLECTION).doc(docId(key)).set({
      key:String(key), value:String(value), updatedAt:firebase.firestore.FieldValue.serverTimestamp()
    },{merge:true}).catch(e=>console.warn('Firebase save failed for '+key,e));
  }
  function queueRemoteDelete(key){
    if(suppress || !bootFinished || !db || !relevant(key)) return;
    pendingLocalWrites.add(String(key));
    db.collection(COLLECTION).doc(docId(key)).delete().catch(e=>console.warn('Firebase delete failed for '+key,e));
  }

  Storage.prototype.setItem=function(key,value){
    const result=original.setItem.call(this,key,value);
    if(this===localStorage) queueRemoteWrite(key,value);
    return result;
  };
  Storage.prototype.removeItem=function(key){
    const result=original.removeItem.call(this,key);
    if(this===localStorage) queueRemoteDelete(key);
    return result;
  };

  async function init(){
    try{
      if(!window.firebase) throw new Error('Firebase SDK did not load.');
      const app=firebase.apps.length?firebase.app():firebase.initializeApp(firebaseConfig);
      db=firebase.firestore(app);
      window.SF_FIREBASE_DB=db;

      // Optional anonymous sign-in. This is useful when Firestore rules require
      // request.auth != null. If Anonymous Auth is not enabled yet, the app can
      // still work with a development/test rule set.
      try{await firebase.auth().signInAnonymously();}catch(e){
        console.warn('Firebase anonymous authentication is not enabled yet. Firestore rules must permit the app during setup.',e);
      }

      window.SF_FIREBASE_STATUS='connected';
    }catch(e){
      console.error('Firebase initialization failed:',e);
      window.SF_FIREBASE_STATUS='error';
      window.SF_FIREBASE_ERROR=e;
    }
  }

  async function finishBoot(){
    await init();
    if(!db){
      bootFinished=true; readyResolve(false); return false;
    }

    try{
      const snap=await db.collection(COLLECTION).get();
      const remote={};
      snap.forEach(d=>{
        if(d.id===META) return;
        const x=d.data();
        if(x && typeof x.key==='string' && typeof x.value==='string') remote[x.key]=x.value;
      });
      const local=allLocal();
      const remoteKeys=Object.keys(remote);
      const hasRemote=remoteKeys.length>0;

      let hydratedFromRemote=false;
      if(hasRemote){
        suppress=true;
        try{
          // Remote is the source of truth once central data exists.
          remoteKeys.forEach(k=>original.setItem.call(localStorage,k,remote[k]));
          Object.keys(local).forEach(k=>{if(!(k in remote)) original.removeItem.call(localStorage,k)});
          hydratedFromRemote=remoteKeys.some(k=>local[k]!==remote[k]) || Object.keys(local).some(k=>!(k in remote));
        }finally{suppress=false;}
      }else{
        // First browser becomes the initial migration source.
        const batch=db.batch();
        Object.entries(local).forEach(([k,v])=>{
          batch.set(db.collection(COLLECTION).doc(docId(k)),{key:k,value:String(v),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
        });
        batch.set(db.collection(COLLECTION).doc(META),{initializedAt:firebase.firestore.FieldValue.serverTimestamp(),version:1});
        await batch.commit();
      }

      bootFinished=true;
      readyResolve(true);

      // The main app reads its state synchronously during startup. If central
      // data replaced the browser cache, reload exactly once so all in-memory
      // variables (users, companies, products, etc.) are rebuilt from Firebase.
      if(hydratedFromRemote && sessionStorage.getItem('SF_FIREBASE_HYDRATED_RELOAD')!=='1'){
        sessionStorage.setItem('SF_FIREBASE_HYDRATED_RELOAD','1');
        setTimeout(()=>location.reload(),50);
        return true;
      }
      sessionStorage.removeItem('SF_FIREBASE_HYDRATED_RELOAD');

      if(unsub)unsub();
      unsub=db.collection(COLLECTION).onSnapshot(s=>{
        if(!bootFinished) return;
        let externalChange=false;
        suppress=true;
        try{
          s.docChanges().forEach(ch=>{
            if(ch.doc.id===META) return;
            const x=ch.doc.data();
            if(!x || typeof x.key!=='string') return;
            const key=x.key;
            const wasLocal=pendingLocalWrites.has(key);
            pendingLocalWrites.delete(key);
            if(!wasLocal) externalChange=true;
            if(ch.type==='removed') original.removeItem.call(localStorage,key);
            else if(typeof x.value==='string') original.setItem.call(localStorage,key,x.value);
          });
        }finally{suppress=false;}
        if(externalChange && sessionStorage.getItem('SF_FIREBASE_REMOTE_RELOAD')!=='1'){
          sessionStorage.setItem('SF_FIREBASE_REMOTE_RELOAD','1');
          setTimeout(()=>location.reload(),300);
        }
      },e=>{
        console.error('Firebase realtime listener error:',e);
        window.SF_FIREBASE_STATUS='error';
      });
      return true;
    }catch(e){
      console.error('Firebase central database boot failed:',e);
      window.SF_FIREBASE_STATUS='error';
      bootFinished=true;
      readyResolve(false);
      return false;
    }
  }

  window.SF_FIREBASE_BOOTSTRAP_APP_DONE=function(){
    if(window.__SF_FIREBASE_BOOT_STARTED) return window.SF_FIREBASE_BOOT_PROMISE;
    window.__SF_FIREBASE_BOOT_STARTED=true;
    window.__SF_FIREBASE_BOOT_PROMISE=finishBoot().then(ok=>{
      const el=document.getElementById('firebaseConnectionStatus');
      if(el){el.textContent=ok?'Firebase Central Database: Connected':'Firebase Central Database: Offline';el.className=ok?'firebase-status ok':'firebase-status error';}
      return ok;
    });
    return window.__SF_FIREBASE_BOOT_PROMISE;
  };
})();
