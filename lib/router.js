'use strict';
const postsHandler = require('./posts-handler');
const util = require('./handler-util');

function route(req, res){
  //この if 文の条件は、 process.env.DATABASE_URL という環境変数がある場合、
  //つまり本番のデータベースが存在している Heroku 環境であり、かつ、 x-forwarded-proto というヘッダの値が http であるときのみ真となる条件となっています。
  //x-forwarded-proto ヘッダには、 Heroku が Node.js のアプリケーションに対して内部的にリクエストを受け渡す際にアクセスで利用されたプロトコルが含まれています。
  //この値を使うことで、 HTTP なのか HTTPS なのかを判定することができるのです。
  if (process.env.DATABASE_URL
    && req.headers['x-forwarded-proto'] === 'http') {
    util.handleNotFound(req, res);
  }
  switch(req.url){
    case '/posts':
      postsHandler.handle(req, res);
      break;
    case '/posts?delete=1':
      postsHandler.handleDelete(req, res);
      break;
    case '/logout':
      util.handleLogout(req, res);
      break;
    case '/favicon.ico':
      util.handleFavicon(req, res);
      break;
    default:
      util.handleNotFound(req, res);
      break;
  }
}

module.exports = {
  route: route
};