class appError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.err=message;
        this.status = statusCode; 
        console.log(message);   
    }  
}
module.exports = appError;