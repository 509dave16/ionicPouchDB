import {Component, ViewChild} from '@angular/core';
import {Nav, Platform} from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import {SuperLoginService} from "../services/superlogin.service";
import {Todos} from "../services/todos.service";
import {RelationalService} from "../services/relational.service";
import PouchDB from 'pouchdb';
import RelationalPouch from 'relational-pouch';
import PouchDbFind from 'pouchdb-find';
import {RxDBService} from "../services/rx-db.service";
import RxDB from "rxdb";
import pouchdbAdapterIdb from "pouchdb-adapter-idb";
import 'rxjs';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  // rootPage:any = LoginPage;
  private pages = {
    'LoginPage' : 'LoginPage',
    'TestPage' : 'TestPage',
    'SignupPage' : 'SignupPage',
    'HomePage' : 'HomePage',
    'RxDbPage': 'RxDbPage',
  };
  /**
   * This form of grabbing a component from the view by the Template Reference Variable
   * is kind of janky. But it's only way I have found so far to successfully set the
   * rootPage(aka current page) dynamically based on if the User is authenticated
   * @refer https://stackoverflow.com/questions/40732608/changing-ionic-2-root-programmatically
   */
  @ViewChild('rootNavComponent') private rootNavComponent: Nav;

  constructor(platform: Platform, statusBar: StatusBar, splashScreen: SplashScreen, superLoginService: SuperLoginService, todoService: Todos, relationalService: RelationalService, rxdbService: RxDBService) {
    this.init(platform, statusBar, splashScreen, superLoginService, todoService, relationalService, rxdbService);
  }

  private async init(platform: Platform, statusBar: StatusBar, splashScreen: SplashScreen, superLoginService: SuperLoginService, todoService: Todos, relationalService: RelationalService, rxdbService: RxDBService) {
    await platform.ready();
    PouchDB.plugin(RelationalPouch);
    PouchDB.plugin(PouchDbFind);
    RxDB.plugin(pouchdbAdapterIdb);

    if (superLoginService.SuperLoginClient.authenticated()) {
      await relationalService.init();
      await rxdbService.init();
      this.rootNavComponent.setRoot('RelationalPage', {});
    } else {
      this.rootNavComponent.setRoot('LoginPage', {});
    }
    // Okay, so the platform is ready and our plugins are available.
    // Here you can do any higher level native things you might need.
    statusBar.styleDefault();
    splashScreen.hide();
  }


  gotoPage(pageKey) {
    const page = this.pages[pageKey];

    this.rootNavComponent.setRoot(page, {});
  }
}

