import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorState } from '../../models/image-editor.model';

interface PropertyChangeEvent {
  property: string;
  value: any;
}

@Component({
  selector: 'app-properties-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './properties-panel.component.html',
  styleUrls: ['./properties-panel.component.scss']
})
export class PropertiesPanelComponent implements OnChanges {
  @Input() isMobile = false;
  @Input() state: EditorState | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() propertyChange = new EventEmitter<PropertyChangeEvent>();

  // 本地状态
  public brushColor = '#000000';
  public brushWidth = 5;
  public brushOpacity = 100;

  // 形状属性
  public shapeFillColor = '#000000';
  public shapeStrokeColor = '#000000';
  public shapeStrokeWidth = 2;

  // 文本属性
  public textColor = '#000000';
  public fontSize = 16;
  public fontFamily = 'strokeWeight';
  public fontWeight = 60;
  public fontSlant = 0;

  // 滤镜属性
  public brightness = 100;
  public contrast = 100;
  public saturation = 100;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['state'] && this.state) {
      this.brushColor = this.state.brushColor;
      this.brushWidth = this.state.brushWidth;
    }
  }

  closePanel(): void {
    this.close.emit();
  }

  onColorChange(event: any, property: string): void {
    const value = event.target.value;
    this.propertyChange.emit({ property, value });
  }

  onRangeChange(event: any, property: string): void {
    const value = parseInt(event.target.value, 10);
    this.propertyChange.emit({ property, value });
  }

  onFontWeightChange(weight: number): void {
    this.propertyChange.emit({ property: 'fontWeight', value: weight });
  }

  onFontSlantChange(slant: number): void {
    this.propertyChange.emit({ property: 'fontSlant', value: slant });
  }
}
