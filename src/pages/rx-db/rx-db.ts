import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import RxDB from 'rxdb';

/**
 * Generated class for the RxDbPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-rx-db',
  templateUrl: 'rx-db.html',
})
export class RxDbPage {

  constructor(public navCtrl: NavController, public navParams: NavParams) {
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad RxDbPage');
  }

}
