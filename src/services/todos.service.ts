import { Injectable } from '@angular/core';
import PouchDB from 'pouchdb';
import {SuperLoginService} from "./superlogin.service";

@Injectable()
export class Todos {

  data: any;
  db: any;
  remote: any;

  constructor(public superLoginService: SuperLoginService) {

  }

  init(){

    this.db = new PouchDB('todos');

    this.remote = this.superLoginService.SuperLoginClient.getDbUrl('supertest');
    console.log(this.remote);
    const remoteDB = new PouchDB(this.remote);

    let options = {
      live: true,
      retry: true,
      continuous: true
    };


    // this.db.sync(this.remote, options)
    this.db.replicate.to(remoteDB, options)
      .on('change', function (info) {
        // handle change
        console.log('info', info);
      }).on('paused', function (err) {
        // replication paused (e.g. replication up to date, user went offline)
        console.log('paused', err);
        // NOTE: This happens all the time should only log for more specific instances
        // NOTE: This is happening frequently due to inherited docs that don't exist in CouchDB that are somehow made available in PouchDB.
      }).on('active', function (data) {
        // replicate resumed (e.g. new changes replicating, user went back online)
        // console.log('active', data);
        // NOTE: This happens all the time should only log for more specific instances
      }).on('denied', function (err) {
        // a document failed to replicate (e.g. due to permissions)
        console.log('denied', err);
      }).on('complete', function (info) {
        // handle complete
        console.log('complete', info);
      }).on('error', function (err) {
        // handle error
        console.log('error', err);
      })
    ;
    this.db.replicate.from(remoteDB, options);
  }

  logout(){
    this.superLoginService.SuperLoginClient.logout('You have been logged out');

    this.data = null;

    this.db.destroy().then(() => {
      console.log("database removed");
    });
  }

  getTodos() {

    if (this.data) {
      return Promise.resolve(this.data);
    }

    return new Promise(resolve => {

      this.db.allDocs({

        include_docs: true

      }).then((result) => {

        this.data = [];

        let docs = result.rows.map((row) => {
          this.data.push(row.doc);
        });

        resolve(this.data);

        this.db.changes({live: true, since: 'now', include_docs: true}).on('change', (change) => {
          this.handleChange(change);
        });

      }).catch((error) => {

        console.log(error);

      });

    });

  }

  createTodo(todo){
    this.db.post(todo).then((result) => {
      console.log(result);
    }).catch((error) => {
      console.log(error);
    });
  }

  updateTodo(todo){
    this.db.put(todo).catch((err) => {
      console.log(err);
    });
  }

  deleteTodo(todo){
    this.db.remove(todo).catch((err) => {
      console.log(err);
    });
  }

  handleChange(change){

    let changedDoc = null;
    let changedIndex = null;

    this.data.forEach((doc, index) => {

      if(doc._id === change.id){
        changedDoc = doc;
        changedIndex = index;
      }

    });

    //A document was deleted
    if(change.deleted){
      this.data.splice(changedIndex, 1);
    }
    else {

      //A document was updated
      if(changedDoc){
        this.data[changedIndex] = change.doc;
      }

      //A document was added
      else {
        this.data.push(change.doc);
      }

    }

  }

}
