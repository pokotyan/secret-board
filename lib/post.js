'use strict';
//sequelize をモジュールとして読み込み、 DB の設定を渡したうえで秘密の匿名掲示板を表すデータベースのオブジェクトを作成しています。
//また、 sequelize が出すログの設定をオフにしています。
const Sequelize = require('sequelize');
const sequelize = new Sequelize(                         //参考：http://docs.sequelizejs.com/class/lib/sequelize.js~Sequelize.html#instance-constructor-constructor
  process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost/secret_board', //データベースの名前。psqlでポスグレと対話する際に \c secret_board でdbへ接続出来るようになる
  { logging: false });                                   //何かを記録するたびに実行される関数(デフォルトはconsole.log)をfalse

//以下は上記で定義したデータモデルを、 sequelize の形式にしたがって記述したものです。
//投稿を Post という名前のオブジェクトとして定義しています。
//モデル定義の参考：http://docs.sequelizejs.com/manual/tutorial/models-definition.html
const Post = sequelize.define('Post',{
  id:{                   //主キー
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  content:{              //投稿内容
    type: Sequelize.TEXT
  },
  postedBy:{             //投稿したユーザーの名前
    type: Sequelize.STRING
  },
  trackingCookie:{       //ユーザーごとに付与する Cookie に保存する値
    type: Sequelize.STRING
  }
},{
  freezeTableName: true, //テーブルの名前を Post という名前に固定するという設定
  timestamps: true       //createdAt(作成日時)と updatedAt(更新日時)を自動的に追加してくれる設定
});

Post.sync();             //定義をした Post というオブジェクト自体をデータベースに適用して同期を取る
module.exports = Post;
