const jwt = require(`jsonwebtoken`);
const bcrypt = require(`bcryptjs`);
const { promisify } = require("util");
const { OAuth2Client } = require("google-auth-library");

const { CLIENT_ID, JWT_SECRET, JWT_EXPIRES_IN } = require("../utils/config");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

const pool = require("../database/db");
const client = new OAuth2Client(CLIENT_ID);

const createToken = (userData) => {
  const jwtToken = jwt.sign(userData, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
  return jwtToken;
};

const verifyJwtToken = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }
  // 2) Verifying token
  const decoded = await promisify(jwt.verify)(token, JWT_SECRET);
  req.jwtPayload = { ...decoded };
  next();
});

const googleLogin = catchAsync(async (req, res, next) => {
  // Recieve token
  const { idToken } = req.body;
  if (!idToken) {
    return next(new AppError("User not logged in.", 403));
  }

  //Request Google API
  client
    .verifyIdToken({ idToken: idToken, audience: CLIENT_ID })
    .then(async (res) => {
      const { name, email, picture } = res.payload;

      //Query the Database
      const query = `SELECT A.*, B.name AS 'parentName' FROM users A,users B WHERE A.parent = B.email AND A.email= ?`;
      pool.query(query, [email], async (err, results) => {
        if (!results[0]) {
          createNewUnpaidUser(name, email, res);
        } else {
          const existingUser = results[0];

          const token = createToken(JSON.parse(JSON.stringify(existingUser)));
          res.status(200).json({
            status: "success",
            token,
          });
        }
      });
    });
});

const tempLogin = catchAsync(async (req, res, next) => {
  const { name, email } = req.body;
  if (!email) {
    return next(new AppError("User not logged in.", 403));
  }

  //Request Google API

  //Query the Database
  const query = `SELECT A.*, B.name AS 'parentName' FROM users A,users B WHERE A.parent = B.email AND A.email= ?`;
  pool.query(query, [email], async (err, results) => {
    if (!results[0]) {
      createNewUnpaidUser(name, email, res);
    } else {
      const existingUser = results[0];

      const token = createToken(JSON.parse(JSON.stringify(existingUser)));
      res.status(200).json({
        status: "success",
        token,
      });
    }
  });
});

const newUserData = (name, email) => {
  return (newUser = {
    name,
    email,
    parent: email,
    TTL: 7,
    TTD: 10,
    userLimit: 0,
    type: "unpaid",
    permission: "userAdmin",
    createdAt: new Date(),
    allowedUserList: [],
  });
};

const createNewUnpaidUser = (name, email, res) => {
  const newUserQuery = `INSERT INTO users (name,email,parent,createdAt,allowedUserList) VALUES ('${name}','${email}','${email}',current_timestamp(),JSON_ARRAY())`;

  pool.query(newUserQuery, (err) => {
    if (err) {
      throw new AppError(err.message, err.code);
    } else {
      //new User created successfully
      //send jwt with all the data;

      const token = createToken(newUserData(name, email));

      res.status(201).json({
        status: "success",
        token,
      });
    }
  });
};

const waitingUserResponse = catchAsync(async (req, res, next) => {
  const { response, password } = req.body;

  if (response === true && password) {
    //accepted with password

    const getPasswordQuery = `SELECT * FROM passwords WHERE email='${req.jwtPayload.parent}'`;

    pool.query(getPasswordQuery, async (err, results) => {
      if (!results[0]) {
        return nxet(new AppError("Parent Password Not Present", 500));
      } else {
        //compare the hash with password
        if (!(await bcrypt.compare(password, results[0].password))) {
          return next(new AppError("Your password is wrong.", 401));
        } else {
          waitingUserAccept(req.jwtPayload, res);
        }
      }
    });
  } else if (!password && response === false) {
    //rejected

    waitingUserReject(req.jwtPayload, res);
  } else {
    return next(new AppError("Response Or Password is missing", 400));
  }
});

const waitingUserAccept = catchAsync(async (user, res) => {
  //query to update user permission
  let updateQuery = `UPDATE users SET permission='normalUser' WHERE email='${user.email}'`;

  if (user.type == "unpaid") {
    updateQuery = `UPDATE users SET permission='normalUser',type='paid' WHERE email='${user.email}'`;

    deletePreviousRecordings();
  }

  pool.query(updateQuery, (err) => {
    if (err) {
      throw new AppError(err.sqlMessage, 500);
    }
  });

  //query to find parent of user
  const parentFindQuery = `SELECT * FROM users WHERE email = '${user.parent}'`;

  pool.query(parentFindQuery, (err, results) => {
    if (!results[0]) {
      throw new AppError("Parent not found", 500);
    } else {
      const idx = JSON.parse(results[0].allowedUserList).findIndex(
        (x) => x.email === user.email
      );

      if (!(idx >= 0)) {
        throw new AppError("User not found in parent list", 500);
      }

      //update the user allowed List
      const parentUpdateQuery = `UPDATE users SET allowedUserList = JSON_SET(allowedUserList,'$[${idx}].permission', 'normalUser') WHERE email='${user.parent}';`;

      pool.query(parentUpdateQuery, (err) => {
        if (err) {
          throw new AppError(err.sqlMessage, 500);
        } else {
          //all queries successfull=> send updated jwt to the waiting user
          user.permission = "normalUser";
          user.type = "paid";
          delete user.iat;
          delete user.exp;
          const token = createToken(user);

          res.status(200).json({
            status: "success",
            message: "Added to Organization Successfully",
            token,
          });
        }
      });
    }
  });
});

const waitingUserReject = catchAsync(async (user, res) => {
  //query to update user details
  const updateQuery = `UPDATE users SET parent='${user.email}',TTL=7,TTD=10,type='unpaid',permission='userAdmin',renewedAt=NULL WHERE email='${user.email}'`;

  pool.query(updateQuery, (err) => {
    if (err) {
      throw new AppError(err.sqlMessage, 500);
    }
  });

  //query to find parent of user
  const parentFindQuery = `SELECT * FROM users WHERE email = '${user.parent}'`;

  pool.query(parentFindQuery, (err, results) => {
    if (err) {
      throw new AppError(err.sqlMessage, 500);
    }

    if (!results[0]) {
      throw new AppError("Parent not found", 500);
    } else {
      const idx = JSON.parse(results[0].allowedUserList).findIndex(
        (x) => x.email === user.email
      );

      if (!(idx >= 0)) {
        throw new AppError("User not found in parent list", 500);
      }

      //update the user allowed List
      const parentUpdateQuery = `UPDATE users SET allowedUserList = JSON_REMOVE(allowedUserList,'$[${idx}]') WHERE email='${user.parent}';`;

      pool.query(parentUpdateQuery, (err) => {
        if (err) {
          throw new AppError(err.sqlMessage, 500);
        } else {
          //all queries successfull=> send updated jwt to the waiting user
          user.parent = user.email;
          user.TTL = 7;
          user.TTD = 10;
          user.userLimit = 0;
          user.type = "unpaid";
          user.permission = "userAdmin";
          user.renewedAt = null;
          delete user.iat;
          delete user.exp;
          const token = createToken(user);

          res.status(200).json({
            status: "success",
            message: "Reject Successfull",
            token,
          });
        }
      });
    }
  });
});

const deletePreviousRecordings = () => {
  //code to delete the previous recordings
  console.log("Deleting Recordings....");
};

const createNewPaidWaitingUser = catchAsync(async (name, email, parent) => {
  // const { name, email } = req.body;

  // console.log(name, email, parent);

  const newPaidWaitingUserQuery = `INSERT INTO users (name,email,parent,type,permission,TTL,TTD,createdAt,allowedUserList) VALUES ('${name}','${email}','${parent.email}','paid','waiting',${parent.TTL},${parent.TTD},current_timestamp(),JSON_ARRAY())`;

  pool.query(newPaidWaitingUserQuery, (err) => {
    if (err) {
      throw new AppError(err.sqlMessage, 500);
    }
  });
});

const addExisitingUserToList = catchAsync(async (email, parent) => {
  // const { name, email } = req.body;

  const updateUserQuery = `UPDATE users SET TTL=${parent.TTL}, TTD=${parent.TTD}, parent='${parent.email}', permission='waiting' WHERE email='${email}'`;

  pool.query(updateUserQuery, (err) => {
    if (err) {
      throw new AppError(err.sqlMessage, 500);
    }
  });
});

//----------------------------------------------------------------------
//Arkadiptas Part
const checkPasswordExists = catchAsync(async (req, res, next) => {
  const checkquery = `SELECT * FROM passwords WHERE email='${req.jwtPayload.email}'`;

  pool.query(checkquery, (err, response) => {
    if (err) {
      console.log(err);
      return next(new AppError(err.sqlMessage, 500));
    }

    if (!response[0]) {
      res.status(404).json({
        message: "User Admin does not have password, Ask to Set Up Password",
      });
    } else {
      res.status(200).json({
        message: "User Admin has a password, Ask for Password",
      });
    }
  });
});

const setUpPassword = catchAsync(async (req, res, next) => {
  const { password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 12);

  const addPassowordQuery = `INSERT INTO passwords (email,password) VALUES ('${req.jwtPayload.email}','${hashedPassword}')`;

  pool.query(addPassowordQuery, (err) => {
    if (err) {
      return next(new AppError("Error creating password", err.code));
    } else {
      res.status(201).json({
        status: "success",
        message: "Password added successfully, Allow to Add Users",
      });
    }
  });
});

const checkPassword = catchAsync(async (req, res, next) => {
  const { password } = req.body;

  const passwordQuery = `SELECT * FROM passwords WHERE email='${req.jwtPayload.email}'`;

  pool.query(passwordQuery, async (err, response) => {
    if (!response[0]) {
      return next(new AppError("Password does not exist", 400));
    } else {
      if (!(await bcrypt.compare(password, response[0].password))) {
        return next(new AppError("Your password is wrong.", 401));
      } else {
        res.status(200).json({
          status: "success",
          message: "Allow to add users",
        });
      }
    }
  });
});

const addUsers = catchAsync(async (req, res, next) => {
  const { users } = req.body;

  let allowedEmails = "";
  let responseMessage = "";
  const newList = JSON.parse(req.jwtPayload.allowedUserList);

  let op = 0;
  const operation = () => {
    ++op;
    if (op === users.length) {
      responseMessage =
        responseMessage + `All other users Added successfully\n`;

      allowedEmails = allowedEmails.slice(0, -1);
      const parentModifyString = `UPDATE users SET allowedUserList = JSON_MERGE_PRESERVE(allowedUserList, CAST('[${allowedEmails}]' AS JSON)) WHERE email='${req.jwtPayload.email}'`;

      pool.query(parentModifyString, (err) => {
        if (err) {
          console.log(err);
          return next(new AppError("Cannot Update Parent", 500));
        } else {
          req.jwtPayload.allowedUserList = newList;
          delete req.jwtPayload.iat;
          delete req.jwtPayload.exp;

          const token = createToken(req.jwtPayload);

          res.status(200).json({
            status: "success",
            message: responseMessage,
            token,
          });
        }
      });
    }
  };

  for (let i = 0; i < users.length; i++) {
    const user = users[i];

    const findQuery = `SELECT * FROM users WHERE email='${user.email}'`;

    pool.query(findQuery, async (err, response) => {
      console.log(response);
      if (!response[0]) {
        //user does not exist
        createNewPaidWaitingUser(user.name, user.email, req.jwtPayload);

        allowedEmails = allowedEmails.concat(
          `{"email":"${user.email}","permission":"waiting"},`
        );
        newList.push({ email: user.email, permission: "waiting" });
        operation();
      } else {
        //exisiting user

        if (
          response[0].type === "unpaid" &&
          response[0].permission === "userAdmin"
        ) {
          addExisitingUserToList(user.email, req.jwtPayload);
          newList.push({ email: user.email, permission: "waiting" });

          allowedEmails = allowedEmails.concat(
            `{"email":"${user.email}","permission":"waiting"},`
          );
        } else {
          responseMessage =
            responseMessage + `Cannot Add ${user.email} to allowed users.\n`;
        }
        operation();
      }
    });
  }
});

const removeUsers = catchAsync(async (req, res, next) => {
  const { emails } = req.body;
  const newList = JSON.parse(req.jwtPayload.allowedUserList);

  let op = 0;
  const operation = () => {
    ++op;
    if (op === emails.length) {
      req.jwtPayload.allowedUserList = newList;
      delete req.jwtPayload.iat;
      delete req.jwtPayload.exp;
      const token = createToken(req.jwtPayload);

      res.status(200).json({
        status: "success",
        message: "Users removed successfully",
        token,
      });
    }
  };

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    removeUser(email, req.jwtPayload.email);
    const idx = newList.findIndex((x) => x.email === email);

    newList.splice(idx, 1);
    operation();
  }
});

const removeUser = catchAsync(async (email, parent) => {
  //query to update user permission
  const updateQuery = `UPDATE users SET permission='accessRevoked' WHERE email='${email}' AND parent='${parent}'`;

  pool.query(updateQuery, (err) => {
    if (err) {
      throw new AppError(err.sqlMessage, err.code);
    }
  });

  //query to find parent of user
  const parentFindQuery = `SELECT * FROM users WHERE email = '${parent}'`;

  pool.query(parentFindQuery, (err, results) => {
    if (!results[0]) {
      throw new AppError("Parent not found", 500);
    } else {
      const idx = JSON.parse(results[0].allowedUserList).findIndex(
        (x) => x.email === email
      );

      if (!(idx >= 0)) {
        return new AppError("User not found in parent list", 500);
      }

      //update the user allowed List
      const parentUpdateQuery = `UPDATE users SET allowedUserList = JSON_REMOVE(allowedUserList,'$[${idx}]') WHERE email='${parent}'`;

      pool.query(parentUpdateQuery, (err) => {
        if (err) {
          throw new AppError(err.sqlMessage, 500);
        }
      });
    }
  });
});

module.exports = {
  verifyJwtToken,
  googleLogin,
  waitingUserResponse,
  checkPasswordExists,
  setUpPassword,
  checkPassword,
  addUsers,
  removeUsers,
  tempLogin,
};
