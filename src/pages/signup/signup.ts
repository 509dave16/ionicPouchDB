import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { HomePage } from '../home/home';
import {Todos} from "../../services/todos.service";
import {HttpClient, HttpHeaders} from "@angular/common/http";


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

  constructor(public nav: NavController, public http: HttpClient, public todoService: Todos) {

  }

  register(){

    // let headers = new HttpHeaders();
    // headers.append('Content-Type', 'application/json');
    // headers.set('Content-Type', 'application/json; charset=utf-8');
    const headers = {'Content-Type': 'application/json'};

    let user = {
      name: this.name,
      username: this.username,
      email: this.email,
      password: this.password,
      confirmPassword: this.confirmPassword
    };

    this.http.post('http://localhost:3000/auth/register', JSON.stringify(user), {headers})
      .subscribe(data => {
        this.todoService.init(data);
        this.nav.setRoot(HomePage);
      }, (err) => {
        console.log(err);
      });

  }

}
