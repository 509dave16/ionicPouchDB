import { Component } from '@angular/core';
import { NavController, IonicPage, AlertController, LoadingController } from 'ionic-angular';
import {Todos} from "../../services/todos.service";
import {HttpClient} from "@angular/common/http";
import {SuperLoginService} from "../../services/superlogin.service";
import { RelationalService } from '../../services/relational.service';

@IonicPage()
@Component({
  selector: 'page-signup',
  templateUrl: 'signup.html'
})
export class SignupPage {

  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;

  constructor(public nav: NavController, public alertCtrl: AlertController, public loadingCtrl: LoadingController, public http: HttpClient, public todoService: Todos, public superLoginService: SuperLoginService, public relationalService: RelationalService) {

  }

  async register(){
    const headers = {'Content-Type': 'application/json'};

    let user = {
      name: this.name,
      username: this.username,
      email: this.email,
      password: this.password,
      confirmPassword: this.confirmPassword
    };
    const loading = this.loadingCtrl.create({ content: 'Registering'});
    loading.present();
    try {
      const data = await this.superLoginService.SuperLoginClient.register(user);
      await this.relationalService.init();
      loading.dismiss();
      this.nav.setRoot('RelationalPage');
    } catch(error) {
      loading.dismiss();
      let alert = this.alertCtrl.create({
        title: 'Registration Error',
        subTitle: error.message,
        buttons: ['Dismiss']
      });
      alert.present();
    }
  }

}
