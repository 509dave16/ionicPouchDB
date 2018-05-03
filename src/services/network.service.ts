import {Injectable} from "../../node_modules/@angular/core";
import {Platform} from "../../node_modules/ionic-angular/platform/platform";

@Injectable()
export class NetworkService {
  public host: string;
  public protocol: string;

  constructor(private platform: Platform) {
    if(platform.is('android')) {
      this.host = '10.0.2.2';
    } else {
      this.host = 'localhost';
    }
    this.protocol = 'http';
  }

  public buildUrl(path: string, port: number = 0, credentials = '', host: string = null) {
    const determinedHost: string = host ? host : this.host;
    let url: string =  `${this.protocol}://${determinedHost}`;
    if (port) {
      url += `:${port}`;
    }
    url += path;
    return url;
  }
}
