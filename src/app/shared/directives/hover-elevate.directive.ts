import { Directive, HostBinding, HostListener } from '@angular/core';

@Directive({
  selector: '[appHoverElevate]',
  standalone: true
})
export class HoverElevateDirective {
  @HostBinding('style.transition') transition = 'transform 0.25s ease, box-shadow 0.25s ease';
  @HostBinding('style.boxShadow') boxShadow = '0 12px 24px rgba(0, 0, 0, 0.25)';
  @HostBinding('style.transform') transform = 'translateY(0)';

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.transform = 'translateY(-6px)';
    this.boxShadow = '0 18px 36px rgba(0, 173, 181, 0.25)';
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.transform = 'translateY(0)';
    this.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.25)';
  }
}

