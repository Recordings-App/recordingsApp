const catchAsnc = require('../utils/catchAsync');
const appError = require('../utils/appError');
const storageHelper = require('../storage_middleware/helpers');
const jwt = require('jsonwebtoken');
const config = require('../storage_middleware/googleconfig');

exports.new_record = catchAsnc( async (req,res,next) => {    
    var token= req.headers.authorization.split(' ')[1];
    
    const user=jwt.decode(token);
    //console.log(user);
    if(!req.body.recordingId) {
        return next(new appError('please include recording Id!!!', 403));
    }
    const filename = `${user.emailId}/${Date.now()}/${req.body.recordingId}`;

    console.log(filename);

    const url = await storageHelper.get_upload_url(filename)
    res.status(200).json({
        status:"success",
        upload_url:url,
        waring:"url is valid for only 10 minutes so upload fastly!!!"
    });
});


exports.get_url = catchAsnc( async (req,res,next) => {    

    const filename = req.body.filename;

    if(!req.body.filename) 
        return next(new appError('filename is not specified in request body!!!', 403));

    console.log(filename);

    const url = await storageHelper.get_read_url(filename)
    res.status(200).json({
        status:"success",
        read_url:url,
        waring: "url is valid for only 1 hour"
    });
});


exports.get_user_record = catchAsnc( async (req,res,next) => {
    var token= req.headers.authorization.split(' ')[1];
    const user=jwt.decode(token);

    const files=await storageHelper.get_all_files(user.emailId);

    if(!files.length) {
        return next(new appError('User have no recording!!!', 404));
    }

    var list=[];
    
    files.forEach(file => {
        list.push({name:file.name}) 
        });

    res.status(200).json({
        status:"success",
        data:list
    });
});


exports.get_employees_record = catchAsnc( async (req,res,next) => {
    var token= req.headers.authorization.split(' ')[1];
    const user=jwt.decode(token);

    if(user.AllowdeduserList.length > 0) {
        var list=[];

        for(let i=0;i<user.AllowdeduserList.length;i++) {
            const files= await storageHelper.get_all_files(user.AllowdeduserList[i]);
            var info=[];
            files.forEach(file => {
                info.push({name:file.name})
                });

            list.push({user:user.AllowdeduserList[i], data: info});
        }
        res.status(200).json({
            status:"success",
            data:list
        });
    }
    else {
        return next(new appError('currently you have no employee under you!!!', 404));
    }
});


exports.deleteFiles_of_user = catchAsnc( async(req,res,next) => {

    var token= req.headers.authorization.split(' ')[1];
    const user=jwt.decode(token);
    
    const msg=await storageHelper.delete_all_files(user.emailId);
    res.status(200).send(msg);
});
