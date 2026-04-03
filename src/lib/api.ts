import axios from "axios";
import bcrypt from "bcryptjs";
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
  increment,
  limit,
  writeBatch
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { Product, Group, Subgroup, Bill, CustomerDue, Customer } from "../types";

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
  verifyToken: (idToken: string) => api.post("/auth/verify-token", { idToken }),
  verifyMasterPassword: (password: string) => api.post("/auth/verify-master-password", { password }),
  setMasterPassword: (newPassword: string) => api.post("/auth/set-master-password", { newPassword }),
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

export const subgroupApi = {
  getAll: (callback: (subgroups: Subgroup[]) => void) => {
    const path = "subgroups";
    const q = query(collection(db, path), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const subgroups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subgroup));
      callback(subgroups);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },
  getByGroup: (groupId: string, callback: (subgroups: Subgroup[]) => void) => {
    const path = "subgroups";
    const q = query(collection(db, path), where("groupId", "==", groupId), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const subgroups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subgroup));
      callback(subgroups);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },
  add: async (groupId: string, name: string) => {
    const path = "subgroups";
    try {
      return await addDoc(collection(db, path), { groupId, name, createdAt: Date.now() });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  update: async (id: string, name: string) => {
    const path = `subgroups/${id}`;
    try {
      return await updateDoc(doc(db, "subgroups", id), { name });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  delete: async (id: string) => {
    const path = `subgroups/${id}`;
    try {
      return await deleteDoc(doc(db, "subgroups", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
};

export const customerApi = {
  getAll: (callback: (customers: Customer[]) => void) => {
    const path = "customers";
    const q = query(collection(db, path));
    return onSnapshot(q, (snapshot) => {
      const customers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      callback(customers);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },
  addOrUpdate: async (customer: Omit<Customer, "id">) => {
    const path = `customers/${customer.phone}`;
    try {
      const docRef = doc(db, "customers", customer.phone);
      await setDoc(docRef, customer, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
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
      const bills = snapshot.docs.map(doc => {
        const data = doc.data();
        // Ensure id is set from Firestore document ID, overriding any potential id field in data
        return { ...data, id: doc.id } as Bill;
      });
      callback(bills);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },
  create: async (bill: Bill) => {
    const path = "bills";
    try {
      const billsSnapshot = await getDocs(query(collection(db, path), orderBy("date", "desc"), limit(1)));
      let lastBillNo = 0;
      if (!billsSnapshot.empty) {
        const lastBill = billsSnapshot.docs[0].data() as Bill;
        const match = lastBill.billNo.match(/(\d+)/);
        if (match) {
          lastBillNo = parseInt(match[1], 10);
        }
      }
      const newBillNo = `${lastBillNo + 1}`;
      
      // Remove 'id' from bill object before saving to Firestore
      const { id, ...billWithoutId } = bill;
      
      // Create a new document reference with an auto-generated ID
      const billRef = await addDoc(collection(db, path), { ...billWithoutId, billNo: newBillNo, date: Date.now() });
      
      // Save/Update customer details
      if (bill.customerPhone) {
        await customerApi.addOrUpdate({
          name: bill.customerName,
          phone: bill.customerPhone,
          address: bill.customerAddress,
          email: bill.customerEmail,
          additionalPhones: bill.additionalPhones
        });
      }

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

      // Update customer dues
      const dueChange = bill.subtotal - bill.paidAmount;
      if (dueChange !== 0 || bill.dueAmount > 0) {
        const duePath = `dues/${bill.customerPhone}`;
        try {
          const dueRef = doc(db, "dues", bill.customerPhone);
          const dueSnap = await getDoc(dueRef);
          
          if (dueSnap.exists()) {
            await updateDoc(dueRef, {
              amount: increment(dueChange),
              lastBillDate: Date.now(),
              additionalPhones: bill.additionalPhones || []
            });
          } else {
            await setDoc(dueRef, {
              customerPhone: bill.customerPhone,
              customerName: bill.customerName,
              customerAddress: bill.customerAddress,
              amount: Math.max(0, dueChange),
              lastBillDate: Date.now(),
              additionalPhones: bill.additionalPhones || []
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
    console.log(`Attempting to delete bill at path: ${path}`);
    try {
      const result = await deleteDoc(doc(db, "bills", id));
      console.log(`Successfully deleted bill: ${id}`);
      return result;
    } catch (error) {
      console.error(`Failed to delete bill: ${id}`, error);
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
  markPaid: async (phone: string, additionalPhones: string[]) => {
    const path = `dues/${phone}`;
    try {
      // 1. Delete the due document
      await deleteDoc(doc(db, "dues", phone));
      
      // 2. Update all bills for this phone number and additional phone numbers to set dueAmount to 0
      const allPhones = [phone, ...additionalPhones];
      const billsQuery = query(collection(db, "bills"), where("customerPhone", "in", allPhones));
      const billsSnapshot = await getDocs(billsQuery);
      
      const batch = writeBatch(db);
      billsSnapshot.forEach((doc) => {
        batch.update(doc.ref, { dueAmount: 0 });
      });
      await batch.commit();
      
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
  updateDueAmount: async (phone: string, additionalPhones: string[], amountPaid: number) => {
    const path = `dues/${phone}`;
    try {
      const dueRef = doc(db, "dues", phone);
      const dueSnap = await getDoc(dueRef);
      
      if (!dueSnap.exists()) {
        throw new Error("Due document not found");
      }
      
      const currentDue = dueSnap.data().amount;
      const newDue = Math.max(0, currentDue - amountPaid);
      
      // 1. Update the due document
      await updateDoc(dueRef, {
        amount: newDue
      });
      
      // 2. Update bills to reflect the payment
      const allPhones = [phone, ...additionalPhones];
      const billsQuery = query(collection(db, "bills"), where("customerPhone", "in", allPhones), orderBy("date", "desc"));
      const billsSnapshot = await getDocs(billsQuery);
      
      const batch = writeBatch(db);
      let remainingPayment = amountPaid;
      
      billsSnapshot.forEach((doc) => {
        if (remainingPayment <= 0) return;
        
        const bill = doc.data() as Bill;
        if (bill.dueAmount > 0) {
          const paymentForThisBill = Math.min(remainingPayment, bill.dueAmount);
          batch.update(doc.ref, { dueAmount: increment(-paymentForThisBill) });
          remainingPayment -= paymentForThisBill;
        }
      });
      
      await batch.commit();
      
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
};

export const settingsApi = {
  verifyAccessPassword: async (password: string) => {
    const defaultPassword = "Chayanika@2026";
    try {
      const docRef = doc(db, "settings", "access");
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        if (password === defaultPassword) return true;
        return false;
      }

      const data = docSnap.data();
      if (!data || !data.password) {
        if (password === defaultPassword) return true;
        return false;
      }

      const hashedPassword = data.password;
      
      if (typeof hashedPassword === "string" && hashedPassword.startsWith("$2")) {
        return await bcrypt.compare(password, hashedPassword);
      } else {
        if (password === hashedPassword) {
          // Migrate to hashed password
          const newHash = await bcrypt.hash(password, 10);
          await setDoc(docRef, { password: newHash }, { merge: true });
          return true;
        }
      }
      return false;
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      if (errorMsg.includes("NOT_FOUND") || errorMsg.includes("PERMISSION_DENIED") || errorMsg.includes("permission-denied")) {
        if (password === defaultPassword) return true;
        return false;
      }
      console.error("Error verifying password:", error);
      return false;
    }
  },
  updateAccessPassword: async (newPassword: string) => {
    try {
      const docRef = doc(db, "settings", "access");
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await setDoc(docRef, { password: hashedPassword }, { merge: true });
    } catch (error: any) {
      console.error("Error updating password:", error);
      throw new Error("Failed to update password. Please check your permissions.");
    }
  }
};

export const profileApi = {
  get: async (uid: string) => {
    const path = `profiles/${uid}`;
    try {
      const docRef = doc(db, "profiles", uid);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      if (errorMsg.includes("NOT_FOUND") || error.code === "not-found") {
        return null;
      }
      if (errorMsg.includes("PERMISSION_DENIED") || error.code === "permission-denied" || errorMsg.includes("insufficient permissions")) {
        return null;
      }
      handleFirestoreError(error, OperationType.GET, path);
    }
  },
  update: async (uid: string, fullName: string) => {
    const path = `profiles/${uid}`;
    try {
      const docRef = doc(db, "profiles", uid);
      await setDoc(docRef, { fullName, lastAccess: Date.now() }, { merge: true });
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      if (errorMsg.includes("NOT_FOUND") || error.code === "not-found") {
        // Silently ignore if database is not found so user can still log in
        return;
      }
      if (errorMsg.includes("PERMISSION_DENIED") || error.code === "permission-denied" || errorMsg.includes("insufficient permissions")) {
        // Silently ignore if permission denied so user can still log in
        return;
      }
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
};
