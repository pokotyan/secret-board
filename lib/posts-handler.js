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
        //全ての投稿内容を再描画
        res.end(jade.renderFile('./views/posts.jade',{ 
          posts: posts,
          user: req.user 
        }));
        // /postsへgetリクエストがくるたびに誰が閲覧したかログに残す
        console.info(
          `閲覧されました： user ${req.user},` +
          `trackingId: ${cookies.get('tracking_id')},` +
          `remoteAddress: ${req.connection.remoteAddress},` +
          `userAgent: ${req.headers['user-agent']}`
        );
      });
      break;
    case 'POST':
      req.on('data',(data)=>{
        const decoded = decodeURIComponent(data);
        const content = decoded.split('content=')[1]; //内容は key=value の形式。フォームで設定した contentキーの値を取得。
        console.info('投稿されました: ' + content);
        Post.create({
          content: content,
          trackingCookie: cookies.get('tracking_id'),
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

function handleDelete(req, res) {
  //req.setEncoding('utf8');                      //３）実はこのコードを使えば、dataイベントが提供するチャンクがutf8になるので ２）のデコードが不要になる
  switch (req.method) {
    case 'POST':
      req.on('data', (data) => {                  //１）dataイベントはBufferオブジェクト（バイト配列）を提供する。
        console.log(data);                        //=> <Buffer 69 64 3d 35>

        const decoded = decodeURIComponent(data); //２）バイト配列なのでデコードが必要。デコードすればフォームから送られてきたデータになる。
        console.log(decoded);                     //=> id=7

        const id = decoded.split('id=')[1];       //=> 7
        Post.findById(id).then((post) => {        //投稿データが取得できたら
          if (req.user === post.postedBy) {       //basic認証のユーザー名と投稿データのユーザー名が一緒なら　（※）
            post.destroy();                       //投稿を削除
          }
          handleRedirectPosts(req, res);          //一覧ページにリダイレクト
        });
      });
      break;
    default:                                      //url直うちなどで/posts?delete=1にアクセスした場合（GETなど）、例外ページに飛ばす
      util.handleBadRequest(req, res);
      break;
  }
}
//※ 認証と認可
// この実装では、そもそも投稿した本人にしか削除ボタンは表示されないようになっているのに、サーバー上でも改めて投稿した本人かどうかを if 文でチェックしています。
// これは今の実装のままではサーバーに来た HTTP のリクエストが、どのようなクライアントからのリクエストであるかを完全に保証することはできないためです。
// 例えば、他の認証ユーザーが悪意を持って、 curl などのコマンドラインツールから他人の投稿の削除を試みる可能性があります。
// そのようなリクエストが来た場合に削除が行われないよう、サーバー上でもしっかりチェックを行う必要があるのです。
// このような特定の機能を利用する権限があるかを、認証されたユーザーに対して確認し、資格に応じて許可することを認可といいます。
// 認証と認可は、セキュリティ上非常に重要な機能となっており、かならずサーバー上でチェックする必要があります。


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
  handle: handle,
  handleDelete: handleDelete
}