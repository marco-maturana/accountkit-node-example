// Get our dependencies
const fs = require('fs');
const Guid = require('guid');
const express = require('express');
const bodyParser = require("body-parser");
const Mustache  = require('mustache');
const Request  = require('request');
const Querystring  = require('querystring');
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
var csrf_guid = Guid.raw();
// We are using Account Kit which is version 1.0
// Facebook Graph API is version 2.6 and will be displayed in your
// Facebook app dashboard, but setting 2.6 for the api_version will not work here
const api_version = "v1.1";
const app_id = '891963814509105';
const app_secret = '3c4471baa18c9c469932d7e382a751ca';
const me_endpoint_base_url = 'https://graph.accountkit.com/v1.1/me';
const token_exchange_base_url = 'https://graph.accountkit.com/v1.1/access_token';
function loadLogin() {
  return fs.readFileSync('dist/login.html').toString();
}
app.get('/', function(request, response){
  var view = {
    appId: app_id,
    csrf: csrf_guid,
    version: api_version,
  };
  var html = Mustache.to_html(loadLogin(), view);
  response.send(html);
});
function loadLoginSuccess() {
  return fs.readFileSync('dist/login_success.html').toString();
}
app.post('/sendcode', function(request, response){
  // CSRF check
  if (request.body.csrf_nonce === csrf_guid) {
    var app_access_token = ['AA', app_id, app_secret].join('|');
    var params = {
      grant_type: 'authorization_code',
      code: request.body.code,
      access_token: app_access_token
    };
    // exchange tokens
    var token_exchange_url = token_exchange_base_url + '?' + Querystring.stringify(params);
    Request.get({url: token_exchange_url, json: true}, function(err, resp, respBody) {
      console.log(respBody);
      var view = {
        user_access_token: respBody.access_token,
        expires_at: respBody.expires_at,
        user_id: respBody.id,
      };
      // get account details at /me endpoint
      var me_endpoint_url = me_endpoint_base_url + '?access_token=' + respBody.access_token;
      Request.get({url: me_endpoint_url, json:true }, function(err, resp, respBody) {
        // send login_success.html
        console.log(respBody);
        if (respBody.phone) {
          view.method = "SMS"
          view.identity = respBody.phone.number;
        } else if (respBody.email) {
          view.method = "Email"
          view.identity = respBody.email.address;
        }
        var html = Mustache.to_html(loadLoginSuccess(), view);
        response.send(html);
      });
    });
  }
  else {
    // login failed
    response.writeHead(200, {'Content-Type': 'text/html'});
    response.end("Something went wrong. :( ");
  }
});
app.listen(3000);