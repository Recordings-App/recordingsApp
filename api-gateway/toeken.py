import time
import google.auth.crypt
import google.auth.jwt

def generate_jwt(sa_keyfile,sa_email):

    now = int(time.time())
    payload = {
    'iat': now,     # expires after 'expiry_length' seconds.
    "exp": now + expiry_length,     # iss must match 'issuer' in the security configuration in your
    # swagger spec (e.g. service account email). It can be any string.
    'iss': sa_email,    # aud must be either your Endpoints service name, or match the value
    # specified as the 'x-google-audience' in the OpenAPI document.
    'sub': sa_email,
    'email': sa_email
    }

    # sign with keyfile
    signer = google.auth.crypt.RSASigner.from_service_account_file(sa_keyfile)
    jwt = google.auth.jwt.encode(signer, payload)

return generate_jwt

#aud must be either your Endpoints service name, or match the value

#https://cloud.google.com/api-gateway/docs/authenticate-service-account
#https://stackoverflow.com/questions/60263373/postman-jwt-authentication-using-key-file

#https://cloud.google.com/api-gateway/docs/authenticate-service-account
#https://stackoverflow.com/questions/60263373/postman-jwt-authentication-using-key-file