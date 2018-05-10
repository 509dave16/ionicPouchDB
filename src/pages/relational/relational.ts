import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import {RelationalService} from "../../services/relational.service";

/**
 * Generated class for the RelationalPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-relational',
  templateUrl: 'relational.html',
})
export class RelationalPage {

  authors: any[] = [];
  books: any[] = [];
  constructor(public relationalService: RelationalService, public navCtrl: NavController, public navParams: NavParams) {
    relationalService.seedTestData().then(() => {
      relationalService.getTestData().then((data) => {
        this.authors = data.authors;
        this.books = data.books;
      })
    });

  }


  ionViewDidLoad() {
    console.log('ionViewDidLoad RelationalPage');
  }
}
