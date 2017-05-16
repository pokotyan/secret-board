'use strict';
const jade = require('jade');
const util = require('./handler-util');
const Post = require('./post');

function handle(req, res){
  switch(req.method){
    case 'GET':
      res.writeHead(200,{
        'Content-type':'text/html',
        'charset':'utf-8'
      });
      Post.findAll({
        order:'id DESC' //後で投稿されたものが先に表示されるように並べ替え
      }).then((posts)=>{
        res.end(jade.renderFile('./views/posts.jade',{ posts: posts }));
      });
      break;
    case 'POST':
      req.on('data',(data)=>{
        const decoded = decodeURIComponent(data);
        const content = decoded.split('content=')[1]; //内容は key=value の形式。フォームで設定した contentキーの値を取得。
        console.info('投稿されました: ' + content);
        Post.create({
          content: content,
          trackingCookie: null,
          postedBy: req.user
        }).then(()=>{
          handleRedirectPosts(req, res);              //投稿してdb保存後は一覧へリダイレクト
        });
      });
      break;
    default:
      util.handleBadRequest(req, res);                     //未対応メソッドは例外ページを表示させる
      break;
  }
}

function handleRedirectPosts(req, res){
  res.writeHead(303, {
    'Location': '/posts'
  });
  res.end();
}

module.exports = {
  handle: handle
}