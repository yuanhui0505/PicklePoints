import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, enableIndexedDbPersistence } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyD_qrL3rPmF5GDc8CvuAkFUQPttO3HYMiM",
  authDomain: "picklepoints.firebaseapp.com",
  projectId: "picklepoints",
  storageBucket: "picklepoints.firebasestorage.app",
  messagingSenderId: "791327624154",
  appId: "1:791327624154:web:7f52d75a145e4f5e9d8ee3"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

enableIndexedDbPersistence(db).catch(err => {
  if (err.code === 'failed-precondition') console.warn('Firestore persistence: multiple tabs open');
  else if (err.code === 'unimplemented') console.warn('Firestore persistence: not supported in this browser');
});
