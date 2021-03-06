import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import {IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';
import { SplashScreen } from '@ionic-native/splash-screen';

import { MyApp } from './app.component';
import { HomePage } from '../pages/home/home';
import {PouchdbService} from "../services/pouchdb.service";
import {NetworkService} from "../services/network.service";
import {Todos} from "../services/todos.service";
import {LoginPage} from "../pages/login/login";
import {SignupPage} from "../pages/signup/signup";
import {StatusBar} from "@ionic-native/status-bar";
import {HttpClientModule} from "@angular/common/http";
import {TestPage} from "../pages/test/test";
import {SuperLoginService} from "../services/superlogin.service";
import {RelationalService} from "../services/relational.service";
import {RelationalPage} from "../pages/relational/relational";
import {RxDBService} from "../services/rx-db.service";
import {RxDbPage} from "../pages/rx-db/rx-db";

@NgModule({
  declarations: [
    MyApp
  ],
  imports: [
    HttpClientModule,
    BrowserModule,
    IonicModule.forRoot(MyApp)
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
  ],
  providers: [
    SuperLoginService,
    NetworkService,
    PouchdbService,
    Todos,
    StatusBar,
    SplashScreen,
    {provide: ErrorHandler, useClass: IonicErrorHandler},
    RelationalService,
    RxDBService,
  ]
})
export class AppModule {}
