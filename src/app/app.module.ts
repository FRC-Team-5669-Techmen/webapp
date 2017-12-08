import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MatButtonModule, MatToolbarModule } from '@angular/material';


import { AppComponent } from './app.component';
import { TitleBarComponent } from './title-bar/title-bar.component';
import { HomePageComponent } from './home-page/home-page.component';
import { RecruitPageComponent } from './recruit-page/recruit-page.component';

const appRoutes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'recruit', component: RecruitPageComponent }
];

@NgModule({
  declarations: [
    AppComponent,
    TitleBarComponent,
    HomePageComponent,
    RecruitPageComponent
  ],
  imports: [
    BrowserModule,
    MatButtonModule,
    MatToolbarModule,
    RouterModule.forRoot(appRoutes, { enableTracing: true })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
