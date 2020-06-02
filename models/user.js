const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: false
  },
  token: {
    type: String,
    required: false,
    default: null
  },
  active: {
    type: Boolean,
    default: false
  },
  genActivateDate: {
    type: Date,
    default: Date.now
  },
  favourites: [{
    email: String,
    context: String,
    createdAt: {
      type: Date,
      default: Date.now()
    }
  }],
  googleId: {
    type: Number,
    default: null
  },
  faceBookId: {
    type: Number,
    default: null
  },
  createdDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = User = mongoose.model('User', UserSchema);
