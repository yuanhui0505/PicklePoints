import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { initializeFirestore, persistentLocalCache, memoryLocalCache } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyD_qrL3rPmF5GDc8CvuAkFUQPttO3HYMiM",
  authDomain: "picklepoints.firebaseapp.com",
  projectId: "picklepoints",
  storageBucket: "picklepoints.firebasestorage.app",
  messagingSenderId: "791327624154",
  appId: "1:791327624154:web:7f52d75a145e4f5e9d8ee3"
};

const app = initializeApp(firebaseConfig);

let db;
try {
  db = initializeFirestore(app, { localCache: persistentLocalCache() });
} catch {
  db = initializeFirestore(app, { localCache: memoryLocalCache() });
}
export { db };
