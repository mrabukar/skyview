export interface Vendor {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { purchases: number };
}

export interface CreateVendorInput {
  name: string;
}

export interface UpdateVendorInput {
  name?: string;
  isActive?: boolean;
}
