exports.dateBeautify = function(_date_obj: Date){
  return _date_obj.toLocaleString("it-IT", { timeZone: "Europe/Rome" });
}

exports.isUndefinedOrNull = function(_object: any){
  return (_object === undefined || _object === null);
}
