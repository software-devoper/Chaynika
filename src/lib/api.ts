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
import { Product, Group, Subgroup, Bill, CustomerDue, Customer, PartyDue } from "../types";

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
function cleanData(data: any): any {
  if (data === undefined) return null;
  if (data === null) return null;
  if (typeof data === 'number' && isNaN(data)) return 0;
  if (Array.isArray(data)) {
    return data.map(item => cleanData(item));
  }
  if (typeof data === 'object') {
    const cleaned: any = {};
    Object.keys(data).forEach(key => {
      const val = cleanData(data[key]);
      if (val !== undefined && val !== null) {
        cleaned[key] = val;
      }
    });
    return cleaned;
  }
  return data;
}

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
      return await addDoc(collection(db, path), cleanData({ name, createdAt: Date.now() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  update: async (id: string, name: string) => {
    const path = `groups/${id}`;
    try {
      return await updateDoc(doc(db, "groups", id), cleanData({ name }));
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
      return await addDoc(collection(db, path), cleanData({ groupId, name, createdAt: Date.now() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  update: async (id: string, name: string) => {
    const path = `subgroups/${id}`;
    try {
      return await updateDoc(doc(db, "subgroups", id), cleanData({ name }));
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
      await setDoc(docRef, cleanData(customer), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },
  delete: async (phone: string) => {
    const path = `customers/${phone}`;
    try {
      await deleteDoc(doc(db, "customers", phone));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
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
      return await addDoc(collection(db, path), cleanData({ ...product, updatedAt: Date.now() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  update: async (id: string, product: Partial<Product>) => {
    const path = `products/${id}`;
    try {
      return await updateDoc(doc(db, "products", id), cleanData({ ...product, updatedAt: Date.now() }));
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
        const billNoStr = lastBill.billNo || "";
        const match = billNoStr.match(/(\d+)/);
        if (match) {
          lastBillNo = parseInt(match[1], 10);
        }
      }
      const newBillNo = `${lastBillNo + 1}`;
      
      // Remove 'id' from bill object before saving to Firestore
      const { id, ...billWithoutId } = bill;
      
      // Create a new document reference with an auto-generated ID
      const billRef = await addDoc(collection(db, path), cleanData({ ...billWithoutId, billNo: newBillNo, date: Date.now() }));
      
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
          const multiplier = item.selectedUnitType === "secondary" && item.conversionRate ? item.conversionRate : 1;
          const decrementQty = item.qty * multiplier;
          
          await updateDoc(productRef, {
            stock: increment(-decrementQty)
          });
        } catch (error) {
          console.error(`Failed to update stock for product ${item.productId}:`, error);
          // Don't fail the whole bill if stock update fails, but log it
        }
      }

      // Update customer dues
      // We use (grandTotal - paidAmount) because it accounts for manual overrides of previousDue in the UI
      const finalDueAmount = bill.grandTotal - bill.paidAmount;
      const productNamesStr = bill.items.map(item => item.productName).join(", ");
      if (finalDueAmount !== 0 || bill.dueAmount > 0) {
        const duePath = `dues/${bill.customerPhone}`;
        try {
          const dueRef = doc(db, "dues", bill.customerPhone);
          const dueSnap = await getDoc(dueRef);
          
          if (dueSnap.exists()) {
            const data = dueSnap.data();
            let updatedProductNames = data.productNames || "";
            const existingNames = updatedProductNames.split(", ").filter(Boolean);
            const newNames = productNamesStr.split(", ").filter(Boolean);
            const combined = Array.from(new Set([...existingNames, ...newNames]));
            updatedProductNames = combined.join(", ");

            await updateDoc(dueRef, cleanData({
              amount: finalDueAmount, // Use the definitive balance from the bill form
              lastBillDate: Date.now(),
              additionalPhones: bill.additionalPhones || [],
              productNames: updatedProductNames
            }));
          } else {
            await setDoc(dueRef, cleanData({
              customerPhone: bill.customerPhone,
              customerName: bill.customerName,
              customerAddress: bill.customerAddress,
              amount: Math.max(0, finalDueAmount),
              lastBillDate: Date.now(),
              additionalPhones: bill.additionalPhones || [],
              productNames: productNamesStr
            }));
          }
        } catch (error) {
          console.error(`Failed to update dues for ${bill.customerPhone}:`, error);
        }
      }

      return billRef;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  update: async (billId: string, updatedBill: Bill, oldBill: Bill) => {
    const path = `bills/${billId}`;
    try {
      // 1. Update Bill Document
      const { id, ...billData } = updatedBill;
      await updateDoc(doc(db, "bills", billId), cleanData(billData));

      // 2. Adjust Stock
      const stockChanges: Record<string, number> = {};
      oldBill.items.forEach(item => {
        const multiplier = item.selectedUnitType === "secondary" && item.conversionRate ? item.conversionRate : 1;
        stockChanges[item.productId] = (stockChanges[item.productId] || 0) + (item.qty * multiplier);
      });
      updatedBill.items.forEach(item => {
        const multiplier = item.selectedUnitType === "secondary" && item.conversionRate ? item.conversionRate : 1;
        stockChanges[item.productId] = (stockChanges[item.productId] || 0) - (item.qty * multiplier);
      });

      for (const [productId, change] of Object.entries(stockChanges)) {
        if (change !== 0) {
          try {
            await updateDoc(doc(db, "products", productId), {
              stock: increment(change)
            });
          } catch (e) {
            console.error("Failed to update stock for product", productId, e);
          }
        }
      }

      // 3. Adjust Customer Dues
      if (oldBill.customerPhone === updatedBill.customerPhone) {
        // Calculate the difference in the final balance of this bill.
        // This accounts for changes in subtotal, paidAmount, AND manual previousDue edits.
        const oldBillBalance = oldBill.grandTotal - oldBill.paidAmount;
        const newBillBalance = updatedBill.grandTotal - updatedBill.paidAmount;
        const dueDifference = newBillBalance - oldBillBalance;

        if (dueDifference !== 0) {
          const dueRef = doc(db, "dues", updatedBill.customerPhone);
          const dueSnap = await getDoc(dueRef);
          if (dueSnap.exists()) {
            await updateDoc(dueRef, {
              amount: increment(dueDifference),
              lastBillDate: Date.now()
            });
          }
        }
      } else {
        // If customer changed
        const oldBillBalance = oldBill.grandTotal - oldBill.paidAmount;
        if (oldBillBalance !== 0) {
          await updateDoc(doc(db, "dues", oldBill.customerPhone), {
            amount: increment(-oldBillBalance)
          });
        }
        const newBillBalance = updatedBill.grandTotal - updatedBill.paidAmount;
        if (newBillBalance !== 0) {
          const dueRef = doc(db, "dues", updatedBill.customerPhone);
          const dueSnap = await getDoc(dueRef);
          if (dueSnap.exists()) {
            await updateDoc(dueRef, {
              amount: increment(newBillBalance),
              lastBillDate: Date.now()
            });
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  delete: async (id: string) => {
    const path = `bills/${id}`;
    console.log(`Attempting to delete bill at path: ${path}`);
    try {
      const billRef = doc(db, "bills", id);
      const billSnap = await getDoc(billRef);
      if (!billSnap.exists()) {
        throw new Error("Bill not found");
      }
      const bill = billSnap.data() as Bill;

      // 1. Revert Stock
      for (const item of bill.items) {
        const productRef = doc(db, "products", item.productId);
        const multiplier = item.selectedUnitType === "secondary" && item.conversionRate ? item.conversionRate : 1;
        const revertQty = item.qty * multiplier;
        await updateDoc(productRef, {
          stock: increment(revertQty)
        });
      }

      // 2. Revert Customer Dues
      const dueAmount = bill.dueAmount; // Current bill's contribution to total due
      if (dueAmount !== 0) {
        const dueRef = doc(db, "dues", bill.customerPhone);
        const dueSnap = await getDoc(dueRef);
        if (dueSnap.exists()) {
          await updateDoc(dueRef, {
            amount: increment(-dueAmount),
            lastBillDate: Date.now()
          });
        }
      }

      // 3. Delete Document
      const result = await deleteDoc(billRef);
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
  getOne: async (phone: string) => {
    const path = `dues/${phone}`;
    try {
      const docSnap = await getDoc(doc(db, "dues", phone));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as CustomerDue;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
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
      
      const currentDue = Number(dueSnap.data().amount) || 0;
      const newDue = Math.max(0, currentDue - (Number(amountPaid) || 0));
      
      const batch = writeBatch(db);
      
      // 1. Update the due document
      batch.update(dueRef, cleanData({
        amount: newDue
      }));
      
      // 2. Update bills to reflect the payment
      const allPhones = [phone, ...additionalPhones];
      const billsQuery = query(collection(db, "bills"), where("customerPhone", "in", allPhones));
      const billsSnapshot = await getDocs(billsQuery);
      
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

export const partyDueApi = {
  getAll: (callback: (dues: PartyDue[]) => void) => {
    const path = "partyDues";
    const q = query(collection(db, path), orderBy("lastPurchaseDate", "desc"));
    return onSnapshot(q, (snapshot) => {
      const dues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PartyDue));
      callback(dues);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },
  markPaid: async (id: string) => {
    const path = `partyDues/${id}`;
    try {
      await deleteDoc(doc(db, "partyDues", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
  addOrUpdate: async (groupId: string, partyName: string, dueChange: number, productNames?: string, isNewParty: boolean = false) => {
    const path = `partyDues/${groupId}`;
    const safeDueChange = isNaN(dueChange) ? 0 : dueChange;
    try {
      let dueRef = doc(db, "partyDues", groupId);
      let dueSnap = await getDoc(dueRef);
      
      if (!dueSnap.exists() && !isNewParty) {
        const legacyRef = doc(db, "partyDues", partyName);
        const legacySnap = await getDoc(legacyRef);
        if (legacySnap.exists()) {
          dueRef = legacyRef;
          dueSnap = legacySnap;
        }
      }

      if (dueSnap.exists()) {
        const data = dueSnap.data();
        let updatedProductNames = data.productNames || "";
        if (productNames) {
          const existingNames = updatedProductNames.split(", ").filter(Boolean);
          const newNames = productNames.split(", ").filter(Boolean);
          const combined = Array.from(new Set([...existingNames, ...newNames]));
          updatedProductNames = combined.join(", ");
        }

        await updateDoc(dueRef, cleanData({
          amount: increment(safeDueChange),
          lastPurchaseDate: Date.now(),
          ...(productNames ? { productNames: updatedProductNames } : {})
        }));
      } else {
        await setDoc(dueRef, cleanData({
          groupId,
          partyName,
          amount: Math.max(0, safeDueChange),
          lastPurchaseDate: Date.now(),
          productNames: productNames || ""
        }));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
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
      await setDoc(docRef, cleanData({ password: hashedPassword }), { merge: true });
    } catch (error: any) {
      console.error("Error updating password:", error);
      throw new Error("Failed to update password. Please check your permissions.");
    }
  },
  getBusinessInfo: async () => {
    try {
      const docRef = doc(db, "settings", "business");
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      console.error("Error fetching business info:", error);
      return null;
    }
  },
  updateBusinessInfo: async (info: any) => {
    try {
      const docRef = doc(db, "settings", "business");
      await setDoc(docRef, cleanData(info), { merge: true });
    } catch (error) {
      console.error("Error updating business info:", error);
      throw new Error("Failed to update business info.");
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

export const cashSaleApi = {
  getAll: (callback: (sales: any[]) => void) => {
    const path = "cashSales";
    const q = query(collection(db, path), orderBy("date", "desc"));
    return onSnapshot(q, (snapshot) => {
      const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(sales);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },
  create: async (sale: any) => {
    const path = "cashSales";
    try {
      const saleRef = await addDoc(collection(db, path), cleanData({ ...sale, date: Date.now() }));
      
      // Update stock
      const productRef = doc(db, "products", sale.productId);
      await updateDoc(productRef, {
        stock: increment(-sale.qty)
      });
      
      return saleRef;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  delete: async (id: string) => {
    const path = `cashSales/${id}`;
    try {
      return await deleteDoc(doc(db, "cashSales", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};

export const cleanupApi = {
  runCleanup: async () => {
    if (!auth.currentUser) {
      console.log("Cleanup skipped: User not authenticated.");
      return;
    }

    const now = Date.now();
    const fifteenDaysAgo = now - (15 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);

    try {
      // 1. Cleanup Cash Sales (older than 15 days)
      const cashSalesRef = collection(db, "cashSales");
      const oldCashSalesQuery = query(cashSalesRef, where("date", "<", fifteenDaysAgo));
      const cashSalesSnapshot = await getDocs(oldCashSalesQuery);
      
      if (!cashSalesSnapshot.empty) {
        const batch = writeBatch(db);
        cashSalesSnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`Cleaned up ${cashSalesSnapshot.size} old cash sales.`);
      }

      // 2. Cleanup Credit Sales (older than 90 days AND fully paid)
      const billsRef = collection(db, "bills");
      const oldBillsQuery = query(
        billsRef, 
        where("date", "<", ninetyDaysAgo)
      );
      const billsSnapshot = await getDocs(oldBillsQuery);

      if (!billsSnapshot.empty) {
        const batch = writeBatch(db);
        let count = 0;
        billsSnapshot.forEach((doc) => {
          const data = doc.data();
          // Filter for fully paid bills in memory to avoid requiring a composite index
          if (data.dueAmount === 0) {
            batch.delete(doc.ref);
            count++;
          }
        });
        
        if (count > 0) {
          await batch.commit();
          console.log(`Cleaned up ${count} old fully paid bills.`);
        }
      }
    } catch (error: any) {
      console.error("Cleanup failed:", error.message || error);
    }
  }
};
