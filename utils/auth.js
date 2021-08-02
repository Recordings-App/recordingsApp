const jwt = require('jsonwebtoken');
const config = require('../storage_middleware/googleconfig');

exports.verifytoken = async (req,res,next) => {
    const secretkey= config.secretKey;
    var token= req.headers.authorization;
    
    if(!token) {
        const err=new Error('token is invalid!!!');
        err.status=403;
        return next(err);
    }

    token=token.split(' ')[1];

    jwt.verify(token,secretkey,(err, decoded) => {
        if(err) {
            console.log( err.message)
            err.status=401;
            next(err);
        }
        else {
           // console.log(decoded);
            next();
        }
    })
};
