import { Component } from '@angular/core';
import {AlertController, IonicPage, LoadingController, NavController, NavParams} from 'ionic-angular';
import {RelationalService} from "../../services/relational.service";
import { DocModel, DocCollection } from 'ranksdb';

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
  authors: DocModel[] = [];
  books: DocCollection;
  bookTitle: string;
  authorId: string;
  detachAuthorId: string;
  detachBookId: string;
  newAuthorId: string;
  constructor(
    public relationalService: RelationalService,
    public navCtrl: NavController,
    public navParams: NavParams,
    public loadCtrl: LoadingController,
    public alertCtrl: AlertController,
  ) {
    this.init();
  }

  async init() {
    await this.relationalService.troubleshoot();
    const author: DocModel = await this.relationalService.seedTestData();
    this.initializeData(author);
  }

  async initializeData(author: DocModel) {
    this.authors = [author];
    this.books = await author.get('books') as DocCollection;
  }

  resetData() {
    this.authors = [];
    this.books = [];
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad RelationalPage');
  }

  async addBookToAuthor() {
    let errorMessage = '';
    if (!this.authorId) { errorMessage += 'Must enter a number for Author Id\n'; }
    if (!this.bookTitle) { errorMessage += 'Must enter a title for the book\n'; }
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
    try {
      const author: DocModel = await this.relationalService.addBookToAuthor({ title: this.bookTitle}, parseInt(this.authorId));
      this.initializeData(author);
    } catch (e) {
      console.log(e);
    }
    this.bookTitle = '';
    this.authorId = '';
    loading.dismiss();
  }

  async removeAllData() {
    const loading = this.loadCtrl.create({ content: 'Removing all docs'});
    loading.present();
    await this.relationalService.removeAllData();
    this.resetData();
    loading.dismiss();
  }

  async removeBookFromAuthor() {
    let errorMessage = '';
    if (!this.detachAuthorId) { errorMessage += 'Must enter a number for Author Id\n'; }
    if (!this.detachBookId) { errorMessage += 'Must enter a number for the Book Id\n'; }
    if (errorMessage) {
      let alert = this.alertCtrl.create({
        title: 'Validation Errors',
        subTitle: errorMessage,
        buttons: ['Dismiss']
      });
      alert.present();
      return;
    }
    const loading = this.loadCtrl.create({ content: 'Removing Book from Author'});
    loading.present();
    try {
      const author: DocModel = await this.relationalService.removeBookFromAuthor(parseInt(this.detachBookId), parseInt(this.detachAuthorId));
      this.initializeData(author);
    } catch(e) {
      console.log(e);
    }
    this.detachBookId = '';
    this.detachAuthorId = '';
    loading.dismiss();
  }

  async addAuthor() {
    let errorMessage = '';
    if (!this.newAuthorId) { errorMessage += 'Must enter a number for Author Id\n'; }
    if (errorMessage) {
      let alert = this.alertCtrl.create({
        title: 'Validation Errors',
        subTitle: errorMessage,
        buttons: ['Dismiss']
      });
      alert.present();
      return;
    }
    const loading = this.loadCtrl.create({ content: 'Adding Author'});
    loading.present();
    try {
      const author: DocModel = await this.relationalService.createAuthor(this.newAuthorId);
      this.newAuthorId = '';
    } catch (e) {
      console.log(e);
    }
    loading.dismiss();
  }
}
