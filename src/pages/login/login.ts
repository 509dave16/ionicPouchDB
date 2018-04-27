import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { SignupPage } from '../signup/signup';
import { HomePage } from '../home/home';
import { Todos } from '../../services/todos.service';
import {HttpClient, HttpHeaders} from "@angular/common/http";

@Component({
  selector: 'page-login',
  templateUrl: 'login.html'
})
export class LoginPage {

  username: string;
  password: string;

  constructor(public nav: NavController, public http: HttpClient, public todoService: Todos) {

  }

  login(){
    //
    // let headers = new HttpHeaders();
    // headers.append('Content-Type', 'application/json');
    const headers = {'Content-Type': 'application/json'};


    let credentials = {
      username: this.username,
      password: this.password
    };

    this.http.post('http://localhost:3000/auth/login', JSON.stringify(credentials), {headers })
      .subscribe(data => {
        this.todoService.init(data);
        this.nav.setRoot(HomePage);
      }, (err) => {
        console.log(err);
      });

  }

  launchSignup(){
    this.nav.push(SignupPage);
  }

}
