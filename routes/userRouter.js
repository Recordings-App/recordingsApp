const express = require("express");

const router = express.Router();

const {
  verifyJwtToken,
  googleLogin,
  waitingUserResponse,
  checkPasswordExists,
  setUpPassword,
  checkPassword,
  addUsers,
  removeUsers,
  tempLogin,
} = require("../controllers/userController");

//Login
router.post("/login", googleLogin);

router.post("/tempLogin", tempLogin);

//Check JWT token at every request
router.use(verifyJwtToken);

//Waiting User Response
router.patch("/waitingResponse", waitingUserResponse);

//Password Verification for add/delete
router.get("/addDelete/passExist", checkPasswordExists);

//create New Password if didnt exsit before
router.post("/addDelete/passSet", setUpPassword);

//check the passoword
router.get("/addDelete/passCheck", checkPassword);

//add users
router.patch("/addDelete/add", addUsers);

//remove Users
router.patch("/addDelete/remove", removeUsers);

module.exports = router;
