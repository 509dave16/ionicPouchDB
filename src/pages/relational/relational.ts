import { Component } from '@angular/core';
import {AlertController, IonicPage, LoadingController, NavController, NavParams} from 'ionic-angular';
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
  book: { id: number, title };
  authorId: number;
  constructor(
    public relationalService: RelationalService,
    public navCtrl: NavController,
    public navParams: NavParams,
    public loadCtrl: LoadingController,
    public alertCtrl: AlertController,
  ) {
    this.book = { id: undefined, title: ''};
    relationalService.seedTestData().then((author: ResourceModel) => {
      this.authors = [author];
      this.books = author.get('books') as ResourceCollection;
    })
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad RelationalPage');
  }

  async addBookToAuthor() {
    let errorMessage = '';
    if (!this.authorId) errorMessage += 'Must enter a number for Author Id\n';
    if (!this.book.id) errorMessage += 'Must enter a number for Book Id\n';
    if (!this.book.title) errorMessage += 'Must enter a title for the book\n';
    if (errorMessage) {
      let alert = this.alertCtrl.create({
        title: 'Validation Errors',
        subTitle: errorMessage,
        buttons: ['Dismiss']
      });
      alert.present();
      return;
    }
    const loading = this.loadCtrl.create({ content: 'Creating Book for Author'});
    loading.present();
    await this.relationalService.addBookToAuthor(this.book, this.authorId);
    this.book = { id: undefined, title: '' };
    this.authorId = undefined;
    loading.dismiss();
  }
}
