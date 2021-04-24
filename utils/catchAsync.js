module.exports = fcn => (req,res,next) => {
    return fcn(req,res,next).catch(err => next(err));
} 
