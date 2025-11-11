import { Directive, HostBinding, Input, OnChanges, SimpleChanges } from '@angular/core';
import { TipoUsuario } from '../../core/models/user.model';

@Directive({
  selector: '[appRoleBadge]',
  standalone: true
})
export class RoleBadgeDirective implements OnChanges {
  @Input('appRoleBadge') role: TipoUsuario | string | undefined;

  @HostBinding('style.display') display = 'inline-block';
  @HostBinding('style.padding') padding = '0.35rem 0.75rem';
  @HostBinding('style.borderRadius') borderRadius = '999px';
  @HostBinding('style.fontWeight') fontWeight = '600';
  @HostBinding('style.fontSize') fontSize = '0.75rem';
  @HostBinding('style.letterSpacing') letterSpacing = '0.05em';
  @HostBinding('style.textTransform') textTransform = 'uppercase';
  @HostBinding('style.border') border = '1px solid transparent';

  @HostBinding('style.background') background = 'rgba(255,255,255,0.1)';
  @HostBinding('style.color') color = '#e2e8f0';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['role']) {
      this.actualizarEstilos();
    }
  }

  private actualizarEstilos(): void {
    switch ((this.role || '').toString().toLowerCase()) {
      case 'paciente':
        this.background = 'rgba(34, 197, 94, 0.18)';
        this.color = '#6fffb0';
        this.border = '1px solid rgba(34, 197, 94, 0.35)';
        break;
      case 'especialista':
        this.background = 'rgba(0, 173, 181, 0.18)';
        this.color = '#4de0ff';
        this.border = '1px solid rgba(0, 173, 181, 0.35)';
        break;
      case 'administrador':
        this.background = 'rgba(220, 53, 69, 0.18)';
        this.color = '#ff7a8a';
        this.border = '1px solid rgba(220, 53, 69, 0.35)';
        break;
      default:
        this.background = 'rgba(148, 163, 184, 0.2)';
        this.color = '#e2e8f0';
        this.border = '1px solid rgba(148, 163, 184, 0.3)';
        break;
    }
  }
}

