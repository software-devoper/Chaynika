export interface Product {
  id: string;
  name: string;
  groupId: string;
  groupName: string;
  stock: number;
  purchaseRate: number;
  mrp: number;
  unit: string;
  updatedAt: number;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
}

export interface Customer {
  name: string;
  phone: string;
  address?: string;
  email?: string;
}

export interface CustomerDue {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  amount: number;
  lastBillDate: number;
}

export interface BillItem {
  productId: string;
  productName: string;
  qty: number;
  price: number;
  total: number;
}

export interface Bill {
  id: string;
  billNo: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
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
