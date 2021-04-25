const jwt = require(`jsonwebtoken`);
const bcrypt = require(`bcryptjs`);
const mysql = require(`mysql`);
const { OAuth2Client } = require("google-auth-library");

const {
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  INSTANCE_CONNECTION_NAME,
  CLIENT_ID,
  JWT_SECRET,
  JWT_EXPIRES_IN,
} = require("/../utils/config");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

const pool = mysql.createPool({
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  socketPath: `/cloudsql/${INSTANCE_CONNECTION_NAME}`,
});

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
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
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

          const token = createToken(existingUser);
          res.status(200).json({
            status: "success",
            token,
          });
        }
      });
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
  const newUserQuery = `INSERT INTO users (name,email,parent,createdAt,allowedUserList) VALUES ('${name}','${email}','${email}',current_timestamp,JSON_ARRAY())`;

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

  if (response && password) {
    //accepted with password

    const getPasswordQuery = `SELECT * FROM passwords WHERE email='${req.jwtPayload.parent}'`;

    pool.query(getPasswordQuery, async (err, results) => {
      if (!results[0]) {
        throw new AppError("Parent Password Not Present", 500);
      } else {
        //compare the hash with password
        if (!(await bcrypt.compare(password, results[0].password))) {
          throw new AppError("Your password is wrong.", 401);
        } else {
          waitingUserAccept(req.jwtPayload, res);
        }
      }
    });
  } else if (!response) {
    //rejected

    waitingUserReject(req.jwtPayload, res);
  } else {
    throw new AppError("Response Or Password is missing", 400);
  }
});

const waitingUserAccept = catchAsync(async (user, res) => {
  //query to update user permission
  const updateQuery = `UPDATE users SET permission='normalUser' WHERE email='${user.email}'`;

  pool.query(updateQuery, (err) => {
    if (err) {
      throw new AppError(err.message, err.code);
    }
  });

  if (user.type == "unpaid") {
    deletePreviousRecordings();
  }

  //query to find parent of user
  const parentFindQuery = `SELECT * FROM users WHERE email = '${user.parent}'`;

  pool.query(parentFindQuery, (err, results) => {
    if (!results[0]) {
      throw new AppError("Parent not found", 500);
    } else {
      const idx = results[0].allowedUserList.findIndex(
        (x) => x.email === user.email
      );

      if (!(idx >= 0)) {
        throw new AppError("User not found in parent list", 500);
      }

      //update the user allowed List
      const parentUpdateQuery = `UPDATE users SET allowedUserList = JSON_SET(allowedUserList,'$[${idx}].permission', 'normalUser') WHERE email='${user.parent}';`;

      pool.query(parentUpdateQuery, (err) => {
        if (err) {
          throw new AppError(err.message, err.code);
        } else {
          //all queries successfull=> send updated jwt to the waiting user
          user.permission = "normalUser";
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
  const updateQuery = `UPDATE users SET parent=${user.email},TTL=7,TTD=10,type='unpaid',permission='userAdmin',renewedAt=NULL WHERE email='${user.email}'`;

  pool.query(updateQuery, (err) => {
    if (err) {
      throw new AppError(err.message, err.code);
    }
  });

  //query to find parent of user
  const parentFindQuery = `SELECT * FROM users WHERE email = ${user.parent}`;

  pool.query(parentFindQuery, (err, results) => {
    if (!results[0]) {
      throw new AppError("Parent not found", 500);
    } else {
      const idx = results[0].allowedUserList.findIndex(
        (x) => x.email === user.email
      );

      if (!(idx >= 0)) {
        throw new AppError("User not found in parent list", 500);
      }

      //update the user allowed List
      const parentUpdateQuery = `UPDATE users SET allowedUserList = JSON_REMOVE(allowedUserList,'$[${idx}]) WHERE email='${user.parent}';`;

      pool.query(parentUpdateQuery, (err) => {
        if (err) {
          throw new AppError(err.message, err.code);
        } else {
          //all queries successfull=> send updated jwt to the waiting user
          user.parent = user.email;
          user.TTL = 7;
          user.TTD = 10;
          user.userLimit = 0;
          user.type = "unpaid";
          user.permission = "userAdmin";
          user.renewedAt = null;
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

  const newPaidWaitingUerQuery = `INSERT INTO users (name,email,parent,type,permission,TTL,TTD,createdAt,renewedAt,allowedUserList) VALUES ('${name}','${email}','${parent.email}','paid','waiting',${parent.TTl},${parent.TTD},current_timestamp,${parent.renewedAt},JSON_ARRAY())`;

  pool.query(newPaidWaitingUserQuery, (err) => {
    if (err) {
      throw new AppError(err.message, err.code);
    }
  });
});

const addExisitingUserToList = catchAsync(async (email, parent) => {
  // const { name, email } = req.body;

  const updateUserQuery = `UPDATE users SET parent='${parent.email}', permission='waiting',renewedAt=${parent.renewedAt} WHERE email='${email}'`;

  pool.query(updateUserQuery, (err) => {
    if (err) {
      throw new AppError(err.message, err.code);
    }
  });
});

//----------------------------------------------------------------------
//Arkadiptas Part
const checkPasswordExists = catchAsync(async (req, res, next) => {
  const checkquery = `SELECT * FROM passwords WHERE email=${req.jwtPayload.email}`;

  pool.query(checkquery, (err, res) => {
    if (!res[0]) {
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

  const addPassowordQuery = `INSERT INTO passwords (email,password) VALUES (${req.jwtPayload.email},${hashedPassword})`;

  pool.query(addPassowordQuery, (err) => {
    if (err) {
      throw new AppError("Error creating password", err.code);
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

  const passwordQuery = `SELECT * FROM passwords WHERE email=${req.jwtPayload.email}`;

  pool.query(passwordQuery, async (err, res) => {
    if (!res[0]) {
      throw new AppError("Password does not exist", 400);
    } else {
      if (!(await bcrypt.compare(password, res[0].password))) {
        throw new AppError("Your password is wrong.", 401);
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

  let allowedEmails;
  let responseMessage;
  const newList = req.jwtPayload.allowedUserList;

  for (let user in users) {
    const findQuery = `SELECT * FROM users WHERE email=${user.email}`;

    pool.query(findQuery, async (err, res) => {
      if (!res[0]) {
        //user does not exist
        await createNewPaidWaitingUser(user.name, user.email, req.jwtPayload);

        allowedEmails =
          allowedEmails + `{"email":"${user.email}","permission":"waiting"},`;
        newList.push({ email: user.email, permission: "waiting" });
      } else {
        //exisiting user

        if (res[0].type === "unpaid" && res[0].permission === "userAdmin") {
          await addExisitingUserToList(user.email, req.jwtPayload);
          newList.push({ email: user.email, permission: "waiting" });

          allowedEmails =
            allowedEmails + `{"email":"${user.email}","permission":"waiting"},`;
        } else {
          responseMessage =
            responseMessage + `Cannot Add ${email} to allowed users.\n`;
        }
      }
    });
  }

  responseMessage = responseMessage + `All other users Added successfully\n`;

  allowedEmails = allowedEmails.slice(0, -1);
  const parentModifyString = `UPDATE users SET allowedUserList = JSON_MERGE_PRESERVE(allowedUserList, CAST('[${allowedEmails}]' AS JSON)) WHERE email='${req.jwtPayload.email}'`;

  pool.query(parentModifyString, (err) => {
    if (err) {
      throw new AppError("Cannot Update Parent", err.code);
    } else {
      req.jwtPayload.allowedUserList = newList;
      const token = createToken(req.jwtPayload);

      res.status(200).json({
        status: "success",
        message: responseMessage,
        token,
      });
    }
  });
});

const removeUsers = catchAsync(async (req, res, next) => {
  const { emails } = req.body;

  const newList = req.jwtPayload.allowedUserList;

  for (emails in emails) {
    await removeUser(email, req.jwtPayload.email);
    const idx = newList.findIndex((x) => x.email === email);

    newList.splice(idx, 1);
  }
  req.jwtPayload.allowedUserList = newList;
  const token = createToken(req.jwtPayload);

  res.status(200).json({
    status: "success",
    message: "Users removed successfully",
    token,
  });
});

const removeUser = catchAsync(async (email, parent) => {
  //query to update user permission
  const updateQuery = `UPDATE users SET permission='accessRevoked' WHERE email='${email}' AND parent='${parent}'`;

  pool.query(updateQuery, (err) => {
    if (err) {
      throw new AppError(err.message, err.code);
    }
  });

  //query to find parent of user
  const parentFindQuery = `SELECT * FROM users WHERE email = '${parent}'`;

  pool.query(parentFindQuery, (err, results) => {
    if (!results[0]) {
      throw new AppError("Parent not found", 500);
    } else {
      const idx = results[0].allowedUserList.findIndex(
        (x) => x.email === email
      );

      if (!(idx >= 0)) {
        throw new AppError("User not found in parent list", 500);
      }

      //update the user allowed List
      const parentUpdateQuery = `UPDATE users SET allowedUserList = JSON_REMOVE(allowedUserList,'$[${idx}]) WHERE email='${parent}';`;

      pool.query(parentUpdateQuery, (err) => {
        if (err) {
          throw new AppError(err.message, err.code);
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
};
