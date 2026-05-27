import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCOmbVjc3l5F_WoFu0Z9MOJ1ixiDA6Eiew",
  authDomain: "memory-app-aded7.firebaseapp.com",
  projectId: "memory-app-aded7",
  storageBucket: "memory-app-aded7.firebasestorage.app",
  messagingSenderId: "844203304420",
  appId: "1:844203304420:web:be366c059bd1c30b1f13f1"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);