'use strict';
const jade = require('jade');
const Cookies = require('cookies');
const util = require('./handler-util');
const Post = require('./post');

function handle(req, res){
  const cookies = new Cookies(req, res);
  addTrackingCookie(cookies);

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

function addTrackingCookie(cookies){
  if(!cookies.get('tracking_id')){                                           //'tracking_id'のクッキーがブラウザになければ
    const trackingId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);  //ランダムな整数値を生成して
    const tomorrow = new Date(new Date().getTime() + (1000 * 60 * 60 * 24)); //今の時刻の1日後のdateオブジェクト作って
    //ミリ秒を渡してDateオブジェクトを生成すると、
    //そのミリ秒が指し示す時刻の Date オブジェクトが生成できます。
    //現在のミリ秒: new Date().getTime()
    //1 日分のミリ秒: 1000 * 60 * 60 * 24
    cookies.set('tracking_id', trackingId, { expires: tomorrow });           //'tracking_id'にランダムな整数値（有効期限は1日後）を設定
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