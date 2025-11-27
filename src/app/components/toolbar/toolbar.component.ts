import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AIPanelComponent } from '../ai-panel/ai-panel.component';

interface Tool {
  id: string;
  name: string;
  icon: string;
  category: 'draw' | 'shape' | 'text' | 'filter' | 'ai';
}

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule, AIPanelComponent],
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss']
})
export class ToolbarComponent {
  @Input() isMobile = false;
  @Output() toolSelected = new EventEmitter<string>();
  @Output() propertiesToggled = new EventEmitter<void>();
  @Output() aiToggled = new EventEmitter<void>();

  public activeTool = 'brush';
  public showAIPanel = false; // 添加缺失的属性

  public tools: Tool[] = [
    { id: 'brush', name: 'Brush', icon: 'brush', category: 'draw' },
    { id: 'eraser', name: 'Eraser', icon: 'clear', category: 'draw' },
    { id: 'rectangle', name: 'Rectangle', icon: 'crop_square', category: 'shape' },
    { id: 'circle', name: 'Circle', icon: 'circle', category: 'shape' },
    { id: 'text', name: 'Text', icon: 'text_fields', category: 'text' },
    { id: 'filter', name: 'Filter', icon: 'photo_filter', category: 'filter' },
    { id: 'ai', name: 'AI Generate', icon: 'auto_awesome', category: 'ai' }
  ];

  public categories = [
    { id: 'draw', name: 'Draw', icon: 'edit' },
    { id: 'shape', name: 'Shapes', icon: 'shapes' },
    { id: 'text', name: 'Text', icon: 'title' },
    { id: 'filter', name: 'Filters', icon: 'tune' },
    { id: 'ai', name: 'AI Tools', icon: 'smart_toy' }
  ];

  public activeCategory = 'draw';

  selectTool(toolId: string): void {
    this.activeTool = toolId;
    this.toolSelected.emit(toolId);

    if (toolId === 'ai') {
      this.toggleAIPanel();
    }
  }

  selectCategory(categoryId: string): void {
    this.activeCategory = categoryId;
  }

  getCategoryTools(): Tool[] {
    return this.tools.filter(tool => tool.category === this.activeCategory);
  }

  toggleProperties(): void {
    this.propertiesToggled.emit();
  }

  toggleAIPanel(): void {
    this.showAIPanel = !this.showAIPanel;
    this.aiToggled.emit();
  }

  closeAIPanel(): void {
    this.showAIPanel = false;
    if (this.activeTool === 'ai') {
      this.activeTool = 'brush';
    }
  }
}
