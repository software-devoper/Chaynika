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
  secondaryUnit?: string;
  conversionRate?: number;
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
  productNames?: string;
  amount: number;
  lastBillDate: number;
}

export interface PartyDue {
  id: string;
  groupId?: string;
  partyName: string;
  productNames?: string;
  amount: number;
  lastPurchaseDate: number;
}

export interface BillItem {
  productId: string;
  productName: string;
  qty: number;
  price: number;
  purchaseRate?: number;
  wholesaleRate?: number;
  total: number;
  mrp: number;
  unit?: string;
  secondaryUnit?: string;
  conversionRate?: number;
  hasSecondaryUnit?: boolean;
  selectedUnitType?: "primary" | "secondary";
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
  previousDue: number;
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

export interface CashSale {
  id: string;
  productId: string;
  productName: string;
  qty: number;
  purchaseRate: number;
  wholesaleRate?: number;
  mrp: number;
  amount: number;
  date: number;
}
