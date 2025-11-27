import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageEditorComponent } from './components/image-editor/image-editor.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ImageEditorComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Creaition Image Editor';

  onImageGenerated(imageData: string): void {
    console.log('AI generated image received:', imageData);
  }
}
