import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NavegacionComponent } from './componentes/navegacion/navegacion';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavegacionComponent], 
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('appLlenadoDC3');
}