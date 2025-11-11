import { Directive, HostBinding, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[appFocusBorder]',
  standalone: true
})
export class FocusBorderDirective {
  @Input('appFocusBorder') color: string = '#00adb5';

  @HostBinding('style.transition') transition = 'box-shadow 0.2s ease, border-color 0.2s ease';
  @HostBinding('style.borderColor') borderColor = 'rgba(255,255,255,0.2)';
  @HostBinding('style.outline') outline = 'none';
  @HostBinding('style.boxShadow') boxShadow = 'none';

  @HostListener('focus')
  onFocus(): void {
    this.borderColor = this.color;
    this.boxShadow = `0 0 0 3px ${this.hexToRgba(this.color, 0.25)}`;
  }

  @HostListener('blur')
  onBlur(): void {
    this.borderColor = 'rgba(255,255,255,0.2)';
    this.boxShadow = 'none';
  }

  private hexToRgba(hex: string, alpha: number): string {
    const sanitized = hex.replace('#', '');
    if (sanitized.length !== 6) {
      return `rgba(0,173,181,${alpha})`;
    }

    const bigint = parseInt(sanitized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

