import {
  Directive,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';

export interface ContainerSize {
  width: number;
  height: number;
}

/**
 * Attaches a ResizeObserver to the host element and exposes its size as a
 * signal. Import via `hostDirectives` on a component that needs its own
 * dimensions, or use it directly with `#ref="containerSize"`.
 */
@Directive({
  selector: '[appContainerSize]',
  exportAs: 'containerSize',
  standalone: true,
})
export class ContainerSizeDirective implements OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly _size = signal<ContainerSize>({ width: 0, height: 0 });
  private readonly ro: ResizeObserver;

  readonly size = computed(() => this._size());

  constructor() {
    const el = this.host.nativeElement;
    const update = () =>
      this._size.set({ width: el.clientWidth, height: el.clientHeight });
    this.ro = new ResizeObserver(update);
    this.ro.observe(el);
    queueMicrotask(update);
  }

  ngOnDestroy(): void {
    this.ro.disconnect();
  }
}
