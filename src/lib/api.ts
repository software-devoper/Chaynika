import axios from "axios";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  getDoc,
  setDoc,
  serverTimestamp,
  increment
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { Product, Group, Bill, CustomerDue } from "../types";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

export const authApi = {
  sendOtp: (phone: string) => api.post("/auth/send-otp", { phone }),
  verifyOtp: (phone: string, otp: string) => api.post("/auth/verify-otp", { phone, otp }),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
};

// Firestore Helpers
export const groupApi = {
  getAll: (callback: (groups: Group[]) => void) => {
    const path = "groups";
    const q = query(collection(db, path), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
      callback(groups);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },
  add: async (name: string) => {
    const path = "groups";
    try {
      return await addDoc(collection(db, path), { name, createdAt: Date.now() });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  update: async (id: string, name: string) => {
    const path = `groups/${id}`;
    try {
      return await updateDoc(doc(db, "groups", id), { name });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  delete: async (id: string) => {
    const path = `groups/${id}`;
    try {
      return await deleteDoc(doc(db, "groups", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
};

export const productApi = {
  getAll: (callback: (products: Product[]) => void) => {
    const path = "products";
    const q = query(collection(db, path), orderBy("updatedAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      callback(products);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },
  add: async (product: Omit<Product, "id">) => {
    const path = "products";
    try {
      return await addDoc(collection(db, path), { ...product, updatedAt: Date.now() });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  update: async (id: string, product: Partial<Product>) => {
    const path = `products/${id}`;
    try {
      return await updateDoc(doc(db, "products", id), { ...product, updatedAt: Date.now() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  delete: async (id: string) => {
    const path = `products/${id}`;
    try {
      return await deleteDoc(doc(db, "products", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
};

export const billApi = {
  getAll: (callback: (bills: Bill[]) => void) => {
    const path = "bills";
    const q = query(collection(db, path), orderBy("date", "desc"));
    return onSnapshot(q, (snapshot) => {
      const bills = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bill));
      callback(bills);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },
  create: async (bill: Omit<Bill, "id">) => {
    const path = "bills";
    try {
      const billRef = await addDoc(collection(db, path), { ...bill, date: Date.now() });
      
      // Update stock for each item
      for (const item of bill.items) {
        const productPath = `products/${item.productId}`;
        try {
          const productRef = doc(db, "products", item.productId);
          await updateDoc(productRef, {
            stock: increment(-item.qty)
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, productPath);
        }
      }

      // Update customer dues if any
      if (bill.dueAmount > 0) {
        const duePath = `dues/${bill.customerPhone}`;
        try {
          const dueRef = doc(db, "dues", bill.customerPhone);
          const dueSnap = await getDoc(dueRef);
          
          if (dueSnap.exists()) {
            await updateDoc(dueRef, {
              amount: increment(bill.dueAmount),
              lastBillDate: Date.now()
            });
          } else {
            await setDoc(dueRef, {
              customerPhone: bill.customerPhone,
              customerName: bill.customerName,
              customerAddress: bill.customerAddress,
              amount: bill.dueAmount,
              lastBillDate: Date.now()
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, duePath);
        }
      }

      return billRef;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  delete: async (id: string) => {
    const path = `bills/${id}`;
    try {
      return await deleteDoc(doc(db, "bills", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
};

export const dueApi = {
  getAll: (callback: (dues: CustomerDue[]) => void) => {
    const path = "dues";
    const q = query(collection(db, path), orderBy("lastBillDate", "desc"));
    return onSnapshot(q, (snapshot) => {
      const dues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomerDue));
      callback(dues);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },
  markPaid: async (phone: string) => {
    const path = `dues/${phone}`;
    try {
      return await deleteDoc(doc(db, "dues", phone));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
};
