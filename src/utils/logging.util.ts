const logObject = (obj: any, headerMessage: string = '') => {
  if(headerMessage) {
    console.log(headerMessage);
  }
  for(const key of Object.keys(obj)) {
    console.log(`${key} : ${obj[key]}`)
  }
};

export const LoggingUtil = {
  logObject
};
