import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyBpNovo6h7UExEO7mZ8CLHpmjcqGdrxZIU",
  authDomain: "myshelflife-a62ec.firebaseapp.com",
  projectId: "myshelflife-a62ec",
  storageBucket: "myshelflife-a62ec.firebasestorage.app",
  messagingSenderId: "180228135839",
  appId: "1:180228135839:web:7f1592a2f489f84983fbaa",
  measurementId: "G-ESTF6ZY1YE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
