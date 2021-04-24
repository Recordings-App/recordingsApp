require('dotenv').config()
const express = require('express');
const app =express();
const logger = require('morgan');
const storeAPI = require('./routes/store');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(logger('dev'));

app.use('/Store', storeAPI);

app.use((req, res, next) =>  {
  const err= new Error(`Path ${req.url} not found!!!`);
  err.status=404;
  next(err);
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json(err.message);
});


const port = process.env.port || 3000;
app.listen(port, () => {
    console.log(`app is ruuning on http://localhost:${port}`);
});
