import { BrowserModule, DomSanitizer } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule, MatCardModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatSelectModule,
  MatToolbarModule, MatIconModule, MatIconRegistry, MatMenuModule, MatRippleModule } from '@angular/material';
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
import { GridLayoutComponent } from './grid-layout/grid-layout.component';
import { MemberPageComponent } from './member-page/member-page.component';
import { PageGuardComponent } from './page-guard/page-guard.component';
import { PartRequestsPageComponent } from './part-requests-page/part-requests-page.component';
import { ContactInfoComponent } from './contact-info/contact-info.component';
import { ContactInfoPageComponent } from './contact-info-page/contact-info-page.component';
import { PlatformIdService } from './platform-id.service';

const appRoutes: Routes = [
  { path: '', redirectTo: '/public/home', pathMatch: 'full'},
  { path: 'public/home', component: HomePageComponent },
  { path: 'public/register', component: RecruitPageComponent },
  { path: 'private/contact', component: ContactInfoPageComponent },
  { path: 'private/members', component: MembersPageComponent },
  { path: 'private/members/:email', component: MemberPageComponent },
  { path: 'private/parts', component: PartRequestsPageComponent }
];

@NgModule({
  declarations: [
    AppComponent,
    TitleBarComponent,
    HomePageComponent,
    RecruitPageComponent,
    SlideshowBackgroundComponent,
    CenteredLayoutComponent,
    MembersPageComponent,
    GridLayoutComponent,
    MemberPageComponent,
    PageGuardComponent,
    PartRequestsPageComponent,
    ContactInfoComponent,
    ContactInfoPageComponent
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
    MatMenuModule,
    MatSelectModule,
    MatToolbarModule,
    RouterModule.forRoot(appRoutes, { enableTracing: false })
  ],
  providers: [
    PlatformIdService,
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
