import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule, MatCardModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatSelectModule,
  MatToolbarModule } from '@angular/material';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule, Routes } from '@angular/router';


import { AppComponent } from './app.component';
import { TitleBarComponent } from './title-bar/title-bar.component';
import { HomePageComponent } from './home-page/home-page.component';
import { RecruitPageComponent } from './recruit-page/recruit-page.component';
import { SlideshowBackgroundComponent } from './slideshow-background/slideshow-background.component';
import { WebappBackendService } from './webapp-backend.service';

const appRoutes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'recruit', component: RecruitPageComponent }
];

@NgModule({
  declarations: [
    AppComponent,
    TitleBarComponent,
    HomePageComponent,
    RecruitPageComponent,
    SlideshowBackgroundComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    HttpClientModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatToolbarModule,
    RouterModule.forRoot(appRoutes, { enableTracing: true })
  ],
  providers: [
    WebappBackendService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
