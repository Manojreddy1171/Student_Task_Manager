// js/firebase-config.js

// ========================================================================
// TODO: Replace this with your actual Firebase config from the Firebase Console
// ========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDU0CNzLhW5hfMTbr1R7Y25Byc1Ua-m-t8",
  authDomain: "taskacademy-12e79.firebaseapp.com",
  projectId: "taskacademy-12e79",
  storageBucket: "taskacademy-12e79.firebasestorage.app",
  messagingSenderId: "537888991564",
  appId: "1:537888991564:web:8ad75861b2a697a04fc7e9",
  measurementId: "G-W4GNTDNK37"
};

// Initialize Firebase only if it hasn't been already
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Global references for convenience
const auth = firebase.auth();
const db = firebase.firestore();
