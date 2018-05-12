import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import {RelationalService} from "../../services/relational.service";
import {ResourceModel} from "../../classes/ResourceModel";
import {ResourceCollection} from "../../classes/ResourceCollection";

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

  authors: ResourceModel[] = [];
  books: ResourceCollection;
  constructor(public relationalService: RelationalService, public navCtrl: NavController, public navParams: NavParams) {
    relationalService.seedTestData().then((author: ResourceModel) => {
      this.authors = [author];
      this.books = author.getCollection('books');
    })
  }


  ionViewDidLoad() {
    console.log('ionViewDidLoad RelationalPage');
  }
}
