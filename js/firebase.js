import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA_13zAjJFX_MMtiDeuAqENhyhiiYFRvrs",
  authDomain: "book-ass-478ea.firebaseapp.com",
  projectId: "book-ass-478ea",
  storageBucket: "book-ass-478ea.firebasestorage.app",
  messagingSenderId: "462659453430",
  appId: "1:462659453430:web:15b824d9e81d95f77007d7",
  measurementId: "G-GR3XYR6F0Z"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
