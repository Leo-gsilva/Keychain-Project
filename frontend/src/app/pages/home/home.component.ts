import { Component } from '@angular/core';
import { AboutComponent } from './components/about/about.component';
import { ContactComponent } from './components/contact/contact.component';
import { EmergencyComponent } from './components/emergency/emergency.component';
import { FaqComponent } from './components/faq/faq.component';
import { FooterComponent } from './components/footer/footer.component';
import { GalleryComponent } from './components/gallery/gallery.component';
import { HeaderComponent } from './components/header/header.component';
import { HeroComponent } from './components/hero/hero.component';
import { SecurityComponent } from './components/security/security.component';
import { ServicesComponent } from './components/services/services.component';
import { StepsComponent } from './components/steps/steps.component';
import { TipsComponent } from './components/tips/tips.component';

@Component({
  selector: 'app-home',
  imports: [
    HeaderComponent,
    HeroComponent,
    AboutComponent,
    ServicesComponent,
    EmergencyComponent,
    GalleryComponent,
    StepsComponent,
    SecurityComponent,
    TipsComponent,
    FaqComponent,
    ContactComponent,
    FooterComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {}
