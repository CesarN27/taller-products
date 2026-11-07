export interface Product {
  productId: string;
  sellerId: string; // quién lo vende
  name: string;
  description: string;
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}
