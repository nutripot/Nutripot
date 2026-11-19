// ============================================================================
// BusinessHub Enterprise - ProductService
// Catalog management, SKU uniqueness verification, inventory balance sync
// ============================================================================

import {
  IProductService,
  IProductRepository,
  IInventoryRepository,
  IAuditRepository,
  Product,
} from '@/types';

export class ProductService implements IProductService {
  constructor(
    private prodRepo: IProductRepository,
    private invRepo: IInventoryRepository,
    private auditRepo: IAuditRepository
  ) {}

  async create(
    data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>,
    userId: string
  ): Promise<Product> {
    const existing = await this.prodRepo.findBySku(data.sku);
    if (existing) {
      throw { code: 'DUPLICATE_SKU', message: `Product with SKU '${data.sku}' already exists`, statusCode: 409 };
    }

    const productId = 'prd_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const created = await this.prodRepo.create({
      ...data,
      id: productId,
      isActive: true,
    });

    // Initialize 0-balance row in inventory_balances
    await this.invRepo.updateBalance(productId, 0, data.costPricePaise);

    await this.auditRepo.log({
      userId,
      action: 'PRODUCT_CREATED',
      entityType: 'products',
      entityId: productId,
      newValuesJson: JSON.stringify({ sku: created.sku, name: created.name }),
    });

    return created;
  }

  async update(id: string, data: Partial<Product>, userId: string): Promise<Product> {
    const existing = await this.prodRepo.findById(id);
    if (!existing) {
      throw { code: 'NOT_FOUND', message: 'Product not found', statusCode: 404 };
    }

    if (data.sku && data.sku.toLowerCase() !== existing.sku.toLowerCase()) {
      const duplicate = await this.prodRepo.findBySku(data.sku);
      if (duplicate) {
        throw { code: 'DUPLICATE_SKU', message: `Product with SKU '${data.sku}' already exists`, statusCode: 409 };
      }
    }

    const updated = await this.prodRepo.update(id, data);

    await this.auditRepo.log({
      userId,
      action: 'PRODUCT_UPDATED',
      entityType: 'products',
      entityId: id,
      oldValuesJson: JSON.stringify(existing),
      newValuesJson: JSON.stringify(updated),
    });

    return updated;
  }

  async deactivate(id: string, userId: string): Promise<void> {
    const existing = await this.prodRepo.findById(id);
    if (!existing) {
      throw { code: 'NOT_FOUND', message: 'Product not found', statusCode: 404 };
    }

    await this.prodRepo.softDelete(id);

    await this.auditRepo.log({
      userId,
      action: 'PRODUCT_DEACTIVATED',
      entityType: 'products',
      entityId: id,
    });
  }

  async getById(id: string): Promise<Product | null> {
    return await this.prodRepo.findById(id);
  }

  async list(params: { search?: string; categoryId?: string; limit?: number; offset?: number }): Promise<{ items: Product[]; total: number }> {
    const items = await this.prodRepo.list({ ...params, isActive: true });
    const total = await this.prodRepo.count({ ...params, isActive: true });
    return { items, total };
  }
}
