import { Component } from '@angular/core';
import {AlertController, IonicPage, LoadingController, NavController, NavParams} from 'ionic-angular';
import {RelationalService} from "../../services/relational.service";
import {ResourceModel} from "../../classes/ResourceModel";
import {ResourceCollection} from "../../classes/ResourceCollection";
import {SideloadedDataManager} from "../../classes/SideloadedDataManager";

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
    const author: ResourceModel = await this.relationalService.seedTestData();
    this.initializeData(author);
    this.relationalService.troubleshoot();
  }

  initializeData(author: ResourceModel) {
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
    const dm: SideloadedDataManager = await this.relationalService.addBookToAuthor({ title: this.bookTitle}, parseInt(this.authorId));
    const author: ResourceModel = dm.getModelRoot();
    this.initializeData(author);
    this.bookTitle = '';
    this.authorId = '';
    loading.dismiss();
  }
}
