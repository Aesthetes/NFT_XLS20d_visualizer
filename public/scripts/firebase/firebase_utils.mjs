import { Timestamp as FirebaseTimestamp
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

export const firebaseTimestampToDate = function(_timestamp_value){
  const _timestamp = new FirebaseTimestamp(_timestamp_value.seconds, _timestamp_value.nanoseconds);
  const _date = _timestamp.toDate();
  return _date;
}
export const dateToFirebaseTimestamp = function(_date_value){
  const _timestamp = new FirebaseTimestamp(_date_value.getSeconds(), _date_value.getMilliseconds() * 1000000);
  return _timestamp;
}
