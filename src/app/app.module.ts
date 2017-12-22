import { BrowserModule, DomSanitizer } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule, MatCardModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatSelectModule,
  MatToolbarModule, MatIconModule, MatIconRegistry } from '@angular/material';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule, Routes } from '@angular/router';


import { AppComponent } from './app.component';
import { TitleBarComponent } from './title-bar/title-bar.component';
import { HomePageComponent } from './home-page/home-page.component';
import { RecruitPageComponent } from './recruit-page/recruit-page.component';
import { SlideshowBackgroundComponent } from './slideshow-background/slideshow-background.component';
import { WebappBackendService } from './webapp-backend.service';
import { YoloClientService } from './yolo-client.service';
import { CenteredLayoutComponent } from './centered-layout/centered-layout.component';
import { MembersPageComponent } from './members-page/members-page.component';

const appRoutes: Routes = [
  { path: '', redirectTo: '/public/home', pathMatch: 'full'},
  { path: 'public/home', component: HomePageComponent },
  { path: 'public/register', component: RecruitPageComponent },
  { path: 'private/members', component: MembersPageComponent },
  { path: 'private/logout', component: HomePageComponent },
  { path: 'private/parts', component: HomePageComponent }
];

@NgModule({
  declarations: [
    AppComponent,
    TitleBarComponent,
    HomePageComponent,
    RecruitPageComponent,
    SlideshowBackgroundComponent,
    CenteredLayoutComponent,
    MembersPageComponent
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
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatToolbarModule,
    RouterModule.forRoot(appRoutes, { enableTracing: false })
  ],
  providers: [
    WebappBackendService,
    YoloClientService
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(matIconRegistry: MatIconRegistry, domSanitizer: DomSanitizer) {
    matIconRegistry.addSvgIconSet(domSanitizer.bypassSecurityTrustResourceUrl('./assets/mdi.svg'));
  }
}
