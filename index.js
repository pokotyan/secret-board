'use strict';
const http = require('http');
const auth = require('http-auth');
const router = require('./lib/router');

const basic = auth.basic({
  realm: 'Enter username and password.', //basic認証時のダイアログメッセージ
  file: './users.htpasswd'               //認証ユーザーの一覧にファイルを利用
})

const server = http.createServer((req, res)=>{
  router.route(req, res);
}).on('error',(e)=>{
  console.error('Server Error', e);
}).on('clientError',(e)=>{
  console.error('Client Error', e);
});

const port = 8000;
server.listen(port, ()=>{
  console.info('Listening on ' + port);
});