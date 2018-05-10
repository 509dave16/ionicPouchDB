import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { RelationalPage } from './relational';

@NgModule({
  declarations: [
    RelationalPage,
  ],
  imports: [
    IonicPageModule.forChild(RelationalPage),
  ],
})
export class RelationalPageModule {}
