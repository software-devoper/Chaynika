import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use named database if provided, otherwise default
const config = firebaseConfig as any;
const dbId = config.firestoreDatabaseId || "(default)";
console.log("Initializing Firestore with database ID:", dbId);

// Modern way to enable offline persistence (supports multiple browser tabs)
export const db = initializeFirestore(
  app, 
  {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  },
  config.firestoreDatabaseId && config.firestoreDatabaseId !== "(default)" ? config.firestoreDatabaseId : undefined
);


// Test connection to Firestore
import { getDocFromServer, doc } from "firebase/firestore";
// async function testConnection() {
//   try {
//     await getDocFromServer(doc(db, 'settings', 'access'));
//     console.log("Firestore connection test successful.");
//   } catch (error: any) {
//     if (error.message?.includes('client is offline') || error.code === 'unavailable') {
//       console.error("Firestore connection failed: The client is offline or the database is unavailable.");
//     } else if (error.message?.includes('NOT_FOUND') || error.code === 'not-found') {
//       console.log("Firestore connection test: Document not found, but connection is established.");
//     }
//   }
// }
// testConnection();

export default app;
