import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { HomePage } from '../home/home';
import {Todos} from "../../services/todos.service";
import {HttpClient} from "@angular/common/http";
import {SuperLoginService} from "../../services/superlogin.service";
import { RelationalService } from '../../services/relational.service';


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

  constructor(public nav: NavController, public http: HttpClient, public todoService: Todos, public superLoginService: SuperLoginService, public relationalService: RelationalService) {

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
    try {
      const data = await this.superLoginService.SuperLoginClient.register(user);
      await this.relationalService.init();
    } catch(e) {
      console.log(e);
    }
    this.nav.setRoot(HomePage);
  }

}
