const {Storage} = require('@google-cloud/storage');
const config = require('./googleconfig');
const path = require('path');

const storage = new Storage({
    keyFilename: path.join(__dirname, config.keyPath),
    projectId: config.PROJECT_ID
  });

/*  storage.getBuckets()
  .then(x=> console.log(x))
  .catch(err => console.log(err));*/

const bucket = storage.bucket(config.CLOUD_BUCKET);

//allow temporary uploading of the file with outgoing Content-Type: application/octet-stream header.
exports.get_upload_url = async (fileName) => {
    const options = {
        version: 'v4',
        action: 'write',
        expires: Date.now() + 10 * 60 * 1000, // 10 minutes
        contentType: 'application/octet-stream',
      };
    const [url] = await bucket.file(fileName).getSignedUrl(options);    
    //"curl -X PUT -H 'Content-Type: application/octet-stream' " +`--upload-file my-file '${url}'`

    return url;
};

//allow temporary reading access for uploaded url
exports.get_read_url = async (fileName) => {
  const options = {
      version: 'v2', // defaults to 'v2' if missing.
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60, // one hour
    };
  const [url] = await bucket.file(fileName).getSignedUrl(options); 


  return url;
};


//get all files for user
exports.get_all_files = async (emailId) => {
    const [files]= await bucket.getFiles({ prefix: `${emailId}/`});
    return files;
};


//delete all files for user
exports.delete_all_files = async (emailId) => {

    const [files] = await bucket.getFiles({ prefix: `${emailId}/`});

    if(!files.length)
      return `${emailId} has no data!!!`;

    files.forEach(file => {
        file.delete();
        console.log(`gs://${config.CLOUD_BUCKET}/${file.name} deleted`);
    });

    return `data related with ${emailId} deleted successfully!!!`;
};