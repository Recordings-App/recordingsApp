const express = require('express');
const store = express.Router();
const storecontroller = require('../controllers/storecontroller');
const auth = require('../utils/auth');

//to get a url for posting a new recording
store.post('/new_record', auth.verifytoken, storecontroller.new_record);

//to get a url for reading a existing recording
store.post('/get_url', auth.verifytoken, storecontroller.get_url);

//to get all recordings of user.
store.get('/user_records', auth.verifytoken, storecontroller.get_user_record);

//to get all recordings of employees.
store.get('/employees_records', auth.verifytoken, storecontroller.get_employees_record);

//to delete all files related to user.
store.get('/delete_records', auth.verifytoken, storecontroller.deleteFiles_of_user);

module.exports = store;