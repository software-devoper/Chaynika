import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

// Old Firebase Configuration (chayanika-inventory-prod)
const oldFirebaseConfig = {
  apiKey: "AIzaSyDXPqx1j2j9KQlEVbo5jnJ_ab8amnx44bc",
  authDomain: "chayanika-inventory-prod.firebaseapp.com",
  projectId: "chayanika-inventory-prod",
  storageBucket: "chayanika-inventory-prod.firebasestorage.app",
  messagingSenderId: "876885170454",
  appId: "1:876885170454:web:8bbb40043602e613be9837",
  measurementId: "G-H0X8FW5SSM"
};

// Initialize the old app if it hasn't been initialized yet
const oldApp = !getApps().find(app => app.name === "oldApp") 
  ? initializeApp(oldFirebaseConfig, "oldApp")
  : getApp("oldApp");

export const oldDb = getFirestore(oldApp);
export const oldAuth = getAuth(oldApp);

export async function fetchOldData(collectionName: string) {
  // Ensure we are authenticated on the old app
  if (!oldAuth.currentUser) {
    await signInAnonymously(oldAuth);
  }
  
  const querySnapshot = await getDocs(collection(oldDb, collectionName));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
