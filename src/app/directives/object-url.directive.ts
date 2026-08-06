import { Directive, Input, OnChanges, OnDestroy, SimpleChanges, signal } from '@angular/core';

/**
 * Signal wrapper around URL.createObjectURL: pass a File (or null) via the
 * `appObjectUrl` input, read `.url()` to get the current blob URL. Handles
 * revocation on change/destroy so callers don't leak.
 */
@Directive({
  selector: '[appObjectUrl]',
  exportAs: 'objectUrl',
  standalone: true,
})
export class ObjectUrlDirective implements OnChanges, OnDestroy {
  @Input('appObjectUrl') file: File | null = null;
  private currentUrl: string | null = null;
  readonly url = signal<string | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['file']) return;
    this.revoke();
    if (this.file) {
      this.currentUrl = URL.createObjectURL(this.file);
      this.url.set(this.currentUrl);
    } else {
      this.url.set(null);
    }
  }

  ngOnDestroy(): void {
    this.revoke();
  }

  private revoke(): void {
    if (this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl);
      this.currentUrl = null;
    }
  }
}
