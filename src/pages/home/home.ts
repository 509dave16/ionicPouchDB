import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import {PouchdbService, Todo} from "../../services/pouchdb.service";
import uuidv4 from 'uuid/v4';
import AllDocsResponse = PouchDB.Core.AllDocsResponse;
import PouchDB from 'pouchdb';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  public todos: AllDocsResponse<Todo>;
  public lastTodoDoc: PouchDB.Core.ExistingDocument<Todo>;
  constructor(public navCtrl: NavController, public pouchdbService: PouchdbService) {
   this.fetchTodos();
  }

  private fetchTodos() {
    this.pouchdbService.getTodos().then((response: PouchDB.Core.AllDocsResponse<Todo>) => {
      this.todos = response;
      const numOfRows = this.todos.rows.length;
      if (!numOfRows) {
        return;
      }
      const row = this.todos.rows[numOfRows - 1];
      this.lastTodoDoc = row.doc;
    }, () => {
    })
  }

  public addDefaultTodo() {
    const todo: Todo = {
      _id: uuidv4(),
      title: 'Learn Pouch DB',
      completed: false,
    };
    this.pouchdbService.addTodo(todo).then((response: PouchDB.Core.Response) => {
      console.log('Added todo!');
      this.fetchTodos();
    }, (error: PouchDB.Core.Error) => {
      console.log(error.message);
    });
  }

  public deleteLastTodo() {
    if (!this.lastTodoDoc) {
      return;
    }
    this.pouchdbService.deleteTodo(this.lastTodoDoc).then((response: PouchDB.Core.Response) => {
      console.log('Removed todo!');
      this.fetchTodos();
    }, (error: PouchDB.Core.Error) => {
      console.log(error.message);
    });
  }
}
