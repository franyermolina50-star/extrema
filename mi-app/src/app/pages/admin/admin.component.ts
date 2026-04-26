import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CATEGORY_LABELS, PRODUCTS, Product, ProductCategory } from '../../data/store-data';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent {
  readonly products = PRODUCTS;

  get totalProducts(): number {
    return this.products.length;
  }

  get avgPrice(): string {
    const total = this.products.reduce((sum, product) => sum + product.price, 0);
    return this.formatPrice(Math.round(total / this.products.length));
  }

  get hotProducts(): number {
    return this.products.filter((product) => product.badge === 'hot').length;
  }

  get categoryRows(): Array<{ category: ProductCategory; label: string; count: number }> {
    const categories: ProductCategory[] = ['proteina', 'creatina', 'preworkout', 'vitaminas', 'quemador'];

    return categories.map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      count: this.products.filter((product) => product.cat === category).length
    }));
  }

  badgeLabel(product: Product): string {
    if (product.badge === 'hot') {
      return 'HOT';
    }
    if (product.badge === 'new') {
      return 'NUEVO';
    }
    if (product.badge === 'sale') {
      return 'OFERTA';
    }
    return 'ESTANDAR';
  }

  formatPrice(value: number): string {
    return `$${value.toLocaleString('es-CO')}`;
  }
}
