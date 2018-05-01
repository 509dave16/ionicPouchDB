import {Component, ViewChild} from '@angular/core';
import {Nav, Platform} from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { HomePage } from '../pages/home/home';
import {LoginPage} from "../pages/login/login";
import {TestPage} from "../pages/test/test";
import {SignupPage} from "../pages/signup/signup";
@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  // rootPage:any = LoginPage;
  private pages = {
    'LoginPage' : LoginPage,
    'TestPage' : TestPage,
    'SignupPage' : SignupPage,
    'HomePage' : HomePage,
  };
  /**
   * This form of grabbing a component from the view by the Template Reference Variable
   * is kind of janky. But it's only way I have found so far to successfully set the
   * rootPage(aka current page) dynamically based on if the User is authenticated
   * @refer https://stackoverflow.com/questions/40732608/changing-ionic-2-root-programmatically
   */
  @ViewChild('rootNavComponent') private rootNavComponent: Nav;

  constructor(platform: Platform, statusBar: StatusBar, splashScreen: SplashScreen) {
    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      statusBar.styleDefault();
      splashScreen.hide();
    });
  }

  gotoPage(pageKey) {
    const page = this.pages[pageKey];
    this.rootNavComponent.setRoot(page, {});
  }
}

