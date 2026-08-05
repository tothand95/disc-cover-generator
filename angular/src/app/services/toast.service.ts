import { Injectable, computed, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  readonly id: number;
  readonly kind: ToastKind;
  readonly message: string;
}

const DEFAULT_TTL_MS = 4000;

/**
 * Global toast queue. Components push messages via `show()` / `error()` /
 * `success()`; the ToastContainer renders them and calls `dismiss()` when
 * a toast times out or the user clicks it away.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _items = signal<readonly Toast[]>([]);
  private nextId = 1;

  readonly items = computed(() => this._items());

  show(message: string, kind: ToastKind = 'info', ttlMs = DEFAULT_TTL_MS): number {
    const id = this.nextId++;
    this._items.update((list) => [...list, { id, kind, message }]);
    if (ttlMs > 0) {
      setTimeout(() => this.dismiss(id), ttlMs);
    }
    return id;
  }

  success(message: string, ttlMs?: number): number {
    return this.show(message, 'success', ttlMs);
  }

  error(message: string, ttlMs = 6000): number {
    return this.show(message, 'error', ttlMs);
  }

  info(message: string, ttlMs?: number): number {
    return this.show(message, 'info', ttlMs);
  }

  dismiss(id: number): void {
    this._items.update((list) => list.filter((t) => t.id !== id));
  }

  clear(): void {
    this._items.set([]);
  }
}
