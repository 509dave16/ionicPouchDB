import { Component } from '@angular/core';
import { NavController, IonicPage, LoadingController, AlertController } from 'ionic-angular';
import { Todos } from '../../services/todos.service';
import {HttpClient} from "@angular/common/http";
import {SuperLoginService} from "../../services/superlogin.service";
import {RelationalService} from "../../services/relational.service";
import {RxDBService} from "../../services/rx-db.service";

@IonicPage()
@Component({
  selector: 'page-login',
  templateUrl: 'login.html'
})
export class LoginPage {

  username: string;
  password: string;

  constructor(
    public nav: NavController,
    public http: HttpClient,
    public loadingCtrl: LoadingController,
    public alertCtrl: AlertController,
    public todoService: Todos,
    public superLoginService: SuperLoginService,
    public relationalService: RelationalService,
    public rxdbService: RxDBService,
  ) {

  }

  async login(){
    let credentials = {
      username: this.username,
      password: this.password
    };
    const loading = this.loadingCtrl.create({ content: 'Logging in'});
    loading.present();
    try {
      const data = await this.superLoginService.SuperLoginClient.login(credentials);
      await this.relationalService.init();
      loading.dismiss();
      this.nav.setRoot('RelationalPage');
    } catch(error) {
      loading.dismiss();
      let alert = this.alertCtrl.create({
        title: 'Login Error',
        subTitle: error.message,
        buttons: ['Dismiss']
      });
      alert.present();
    }
  }

  launchSignup(){
    this.nav.push('SignupPage');
  }

}
