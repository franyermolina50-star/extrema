import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  CATEGORY_LABELS,
  CONTENT_CARDS,
  GALLERY_SLIDES,
  PRODUCTS,
  PSE_BANKS,
  Product,
  ProductBadge,
  ProductCategory
} from '../../data/store-data';

type FilterCategory = ProductCategory | 'todos';
type ModalTab = 'descripcion' | 'beneficios' | 'video';
type PaymentMethod = 'transferencia' | 'credito' | 'pse';

interface CartItem extends Product {
  qty: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnDestroy {
  @ViewChild('sliderTrack') sliderTrack?: ElementRef<HTMLDivElement>;

  readonly products = PRODUCTS;
  readonly gallerySlides = GALLERY_SLIDES;
  readonly contentCards = CONTENT_CARDS;
  readonly pseBanks = PSE_BANKS;

  readonly filters: Array<{ key: FilterCategory; label: string }> = [
    { key: 'todos', label: 'Todos' },
    { key: 'proteina', label: 'Proteina' },
    { key: 'creatina', label: 'Creatina' },
    { key: 'preworkout', label: 'Pre-Workout' },
    { key: 'vitaminas', label: 'Vitaminas' },
    { key: 'quemador', label: 'Quemadores' }
  ];

  currentFilter: FilterCategory = 'todos';
  cart: CartItem[] = [];
  currentProduct: Product | null = null;

  mobileMenuOpen = false;
  cartOpen = false;
  productModalOpen = false;
  checkoutOpen = false;

  modalQty = 1;
  activeModalTab: ModalTab = 'descripcion';

  paymentMethod: PaymentMethod = 'transferencia';
  selectedBank = '';

  toastMessage = '';
  toastVisible = false;

  private toastTimer?: ReturnType<typeof setTimeout>;
  private isDraggingSlider = false;
  private dragStartX = 0;
  private dragScrollLeft = 0;

  ngOnDestroy(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.unlockScroll();
  }

  get filteredProducts(): Product[] {
    if (this.currentFilter === 'todos') {
      return this.products;
    }
    return this.products.filter((product) => product.cat === this.currentFilter);
  }

  get cartCount(): number {
    return this.cart.reduce((total, item) => total + item.qty, 0);
  }

  get cartTotal(): number {
    return this.cart.reduce((total, item) => total + item.price * item.qty, 0);
  }

  get modalStars(): string {
    if (!this.currentProduct) {
      return '';
    }
    return `${'★'.repeat(this.currentProduct.stars)}${'☆'.repeat(5 - this.currentProduct.stars)}`;
  }

  filterProducts(category: FilterCategory): void {
    this.currentFilter = category;
  }

  categoryLabel(category: ProductCategory): string {
    return CATEGORY_LABELS[category];
  }

  badgeLabel(badge: ProductBadge): string {
    if (badge === 'hot') {
      return 'HOT';
    }
    if (badge === 'new') {
      return 'Nuevo';
    }
    if (badge === 'sale') {
      return 'Oferta';
    }
    return '';
  }

  formatPrice(value: number): string {
    return `$${value.toLocaleString('es-CO')}`;
  }

  shortDescription(text: string): string {
    if (text.length <= 90) {
      return text;
    }
    return `${text.slice(0, 90)}...`;
  }

  scrollToSection(sectionId: string): void {
    if (typeof document === 'undefined') {
      return;
    }
    this.mobileMenuOpen = false;
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  }

  toggleMobile(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  scrollSlider(direction: 1 | -1): void {
    this.sliderTrack?.nativeElement.scrollBy({
      left: direction * 340,
      behavior: 'smooth'
    });
  }

  onSliderMouseDown(event: MouseEvent): void {
    if (!this.sliderTrack) {
      return;
    }
    this.isDraggingSlider = true;
    const track = this.sliderTrack.nativeElement;
    this.dragStartX = event.pageX - track.offsetLeft;
    this.dragScrollLeft = track.scrollLeft;
  }

  openModal(product: Product): void {
    this.currentProduct = product;
    this.modalQty = 1;
    this.activeModalTab = 'descripcion';
    this.productModalOpen = true;
    this.syncScrollLock();
  }

  closeModal(): void {
    this.productModalOpen = false;
    this.syncScrollLock();
  }

  setModalTab(tab: ModalTab): void {
    this.activeModalTab = tab;
  }

  changeQty(delta: number): void {
    this.modalQty = Math.min(99, Math.max(1, this.modalQty + delta));
  }

  setModalQty(event: Event): void {
    const input = event.target as HTMLInputElement;
    const parsed = Number(input.value);
    this.modalQty = Number.isFinite(parsed) ? Math.min(99, Math.max(1, parsed)) : 1;
  }

  addCurrentProductToCart(): void {
    if (!this.currentProduct) {
      return;
    }
    this.addToCart(this.currentProduct, this.modalQty);
    this.closeModal();
  }

  addToCart(product: Product, qty = 1): void {
    const existing = this.cart.find((item) => item.id === product.id);
    if (existing) {
      existing.qty += qty;
    } else {
      this.cart.push({ ...product, qty });
    }

    this.showToast(`Producto agregado: ${product.name}`);
  }

  removeFromCart(productId: number): void {
    this.cart = this.cart.filter((item) => item.id !== productId);
  }

  toggleCart(): void {
    this.cartOpen = !this.cartOpen;
    if (this.cartOpen) {
      this.checkoutOpen = false;
      this.productModalOpen = false;
    }
    this.syncScrollLock();
  }

  closeCart(): void {
    this.cartOpen = false;
    this.syncScrollLock();
  }

  openCheckout(): void {
    if (!this.cart.length) {
      this.showToast('Tu carrito esta vacio');
      return;
    }

    this.cartOpen = false;
    this.checkoutOpen = true;
    this.syncScrollLock();
  }

  closeCheckout(): void {
    this.checkoutOpen = false;
    this.syncScrollLock();
  }

  selectPayment(method: PaymentMethod): void {
    this.paymentMethod = method;
  }

  selectBank(bank: string): void {
    this.selectedBank = bank;
  }

  formatCard(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/\D/g, '').slice(0, 16);
    input.value = cleaned.replace(/(.{4})/g, '$1 ').trim();
  }

  processPayment(): void {
    if (!this.cart.length) {
      this.showToast('Tu carrito esta vacio');
      return;
    }

    this.cart = [];
    this.checkoutOpen = false;
    this.syncScrollLock();
    this.showToast('Pedido procesado. Te contactaremos pronto.');
  }

  onOverlayClick(event: MouseEvent, overlay: 'product' | 'checkout'): void {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (overlay === 'product') {
      this.closeModal();
      return;
    }

    this.closeCheckout();
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.isDraggingSlider = false;
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isDraggingSlider || !this.sliderTrack) {
      return;
    }

    event.preventDefault();
    const track = this.sliderTrack.nativeElement;
    const x = event.pageX - track.offsetLeft;
    track.scrollLeft = this.dragScrollLeft - (x - this.dragStartX);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.mobileMenuOpen = false;
    this.cartOpen = false;
    this.productModalOpen = false;
    this.checkoutOpen = false;
    this.syncScrollLock();
  }

  private showToast(message: string): void {
    this.toastMessage = message;
    this.toastVisible = true;

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    this.toastTimer = setTimeout(() => {
      this.toastVisible = false;
    }, 3000);
  }

  private syncScrollLock(): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (this.cartOpen || this.productModalOpen || this.checkoutOpen) {
      document.body.style.overflow = 'hidden';
      return;
    }

    this.unlockScroll();
  }

  private unlockScroll(): void {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }
}
