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
    const author: ResourceModel = await this.relationalService.seedTestData();
    this.initializeData(author);
  }

  async initializeData(author: ResourceModel) {
    this.authors = [author];
    this.books = author.get('books') as ResourceCollection;
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
    const author: ResourceModel = await this.relationalService.addBookToAuthor({ title: this.bookTitle}, parseInt(this.authorId));
    this.initializeData(author);
    this.bookTitle = '';
    this.authorId = '';
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
    const author: ResourceModel = await this.relationalService.removeBookFromAuthor(parseInt(this.detachBookId), parseInt(this.detachAuthorId));
    this.initializeData(author);
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
    const author: ResourceModel = await this.relationalService.createAuthor(this.newAuthorId);
    this.newAuthorId = '';
    loading.dismiss();
  }
}
