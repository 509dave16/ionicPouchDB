import { NgModule } from '@angular/core';
import { ListComponent } from './list/list';
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
@NgModule({
	declarations: [ListComponent],
	imports: [CommonModule, FormsModule],
	exports: [
	  CommonModule,
    FormsModule,
	  ListComponent,
  ]
})
export class ComponentsModule {}
