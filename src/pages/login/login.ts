import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { SignupPage } from '../signup/signup';
import { HomePage } from '../home/home';
import { Todos } from '../../services/todos.service';
import {HttpClient, HttpHeaders} from "@angular/common/http";
import superlogin from "superlogin-client";
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

  login(){
    let credentials = {
      username: this.username,
      password: this.password
    };
    this.superLoginService.SuperLoginClient.login(credentials)
      .then(data => {
        // this.todoService.init();
        this.relationalService.init();
        this.nav.setRoot(RelationalPage);
      }, (err) => {
        console.log(err);
      })
    ;

  }

  launchSignup(){
    this.nav.push(SignupPage);
  }

}
