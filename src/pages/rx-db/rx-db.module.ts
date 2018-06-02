import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { RxDbPage } from './rx-db';

@NgModule({
  declarations: [
    RxDbPage,
  ],
  imports: [
    IonicPageModule.forChild(RxDbPage),
  ],
})
export class RxDbPageModule {}
