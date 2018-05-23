import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { SignupPage } from '../signup/signup';
import { HomePage } from '../home/home';
import { Todos } from '../../services/todos.service';
import {HttpClient} from "@angular/common/http";
import {SuperLoginService} from "../../services/superlogin.service";
import {RelationalPage} from "../relational/relational";
import {RelationalService} from "../../services/relational.service";

@Component({
  selector: 'page-login',
  templateUrl: 'login.html'
})
export class LoginPage {

  username: string;
  password: string;

  constructor(public nav: NavController, public http: HttpClient, public todoService: Todos, public superLoginService: SuperLoginService, public relationalService: RelationalService) {

  }

  async login(){
    let credentials = {
      username: this.username,
      password: this.password
    };
    const data = await this.superLoginService.SuperLoginClient.login(credentials);
    await this.relationalService.init();
    this.nav.setRoot(RelationalPage);
  }

  launchSignup(){
    this.nav.push(SignupPage);
  }

}
