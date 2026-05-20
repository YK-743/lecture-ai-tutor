import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD_5KFL6viWk4bVsh6FM4m2V8J857P8-MI",
  authDomain: "lecture-ai-tutor.firebaseapp.com",
  projectId: "lecture-ai-tutor",
  storageBucket: "lecture-ai-tutor.firebasestorage.app",
  messagingSenderId: "429832397145",
  appId: "1:429832397145:web:fb1e9da566ac272bd32c48"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();