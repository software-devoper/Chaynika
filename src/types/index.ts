export interface Product {
  id: string;
  name: string;
  groupId: string;
  groupName: string;
  subgroupId: string;
  subgroupName: string;
  stock: number;
  purchaseRate: number;
  wholesaleRate: number;
  mrp: number;
  unit: string;
  updatedAt: number;
}

export interface Group {
  id: string;
  name: string;
  createdAt: number;
}

export interface Subgroup {
  id: string;
  groupId: string;
  name: string;
  createdAt: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  additionalPhones?: string[];
  address?: string;
  email?: string;
}

export interface CustomerDue {
  id: string;
  customerName: string;
  customerPhone: string;
  additionalPhones?: string[];
  customerAddress: string;
  amount: number;
  lastBillDate: number;
}

export interface PartyDue {
  id: string;
  partyName: string;
  amount: number;
  lastPurchaseDate: number;
}

export interface BillItem {
  productId: string;
  productName: string;
  qty: number;
  price: number;
  mrp?: number;
  total: number;
}

export interface Bill {
  id: string;
  billNo: string;
  customerName: string;
  customerPhone: string;
  additionalPhones?: string[];
  customerAddress: string;
  customerEmail?: string;
  items: BillItem[];
  subtotal: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  date: number;
}

export interface AuthSession {
  phone: string;
  otpHash: string;
  createdAt: number;
  expiresAt: number;
}
