#!/bin/bash
GOOGLE_PROJECT_ID=recordingapp-311116
CLOUD_RUN_SERVICE=user-api
INSTANCE_CONNECTION_NAME=recordingapp-311116:asia-south1:recordings-app
DB_USER=root
DB_PASSWORD=83C9zj8ffHKhjcKq
DB_NAME=user_database

gcloud builds submit --tag gcr.io/$GOOGLE_PROJECT_ID/$CLOUD_RUN_SERVICE \
    --project $PROJECT_ID \ 

gcloud run deploy $CLOUD_RUN_SERVICE \
    --image gcr.io/$GOOGLE_PROJECT_ID/$CLOUD_RUN_SERVICE \ 
    --add-cloudsql-instances $INSTANCE_CONNECTION_NAME \
    --update-env-vars INSTANCE_CONNECTION_NAME=$INSTANCE_CONNECTION_NAME,DB_PASSWORD=$DB_PASSWORD,DB_NAME=$DB_NAME,DB_USER=$DB_USER \
    --platform managed \
    --allow unauthenticated \ 
    --project $GOOGLE_PROJECT_ID \