// 引入express模块
const express = require("express");

// 引入路径处理模块，由于window的路径是\  Linux的路径是/ 
const path = require("path");

// 引入ejs模块
const ejs = require("ejs");

// 导入body-parser处理请求体模块 处理post请求携带额参数
const bodyParser = require("body-parser");

// 导入express-session模块
const session = require("express-session");

// 导入jsonwebtoken模块
const jsonwebtoken = require("jsonwebtoken");

// 导入发送邮箱的模块
const nodemailer = require("nodemailer");

// 导入sequelize模块 （用于操作数据库 - mysql）
// DataTypes 是数据类型的说明     Model 是表模型的基类
const { Sequelize, DataTypes, Model, UUID } = require('sequelize');

// uuid模块生成唯一id
// UUID.v1()  ==> 基于时间戳方式生成
// UUID.v4()  ==> 基于随机数方式生成
// 导入UUID模块
const uuid = require("uuid");

// 创建实例化app
let app = express();

// 创建数据库连接
// new Sequelize(数据库名称, 数据库登录用户, 数据库密码, 配置选项)
// 连接实例
const sequelize = new Sequelize('kai', 'root', '12345678', {
  // 主机
  host: 'localhost',
  // 数据库类型
  dialect: "mysql",  /* 选择 'mysql' | 'mariadb' | 'postgres' | 'mssql' 其一 */
  // 定义命名规则
  define: {
    // underscored: true 字段名以 _ 分隔命名  如 userId  -->  user_id
    // underscored: false 字段名以 驼峰式 命名  如 userId  （默认是false）
    underscored: true
  },
  // 使用东八区的标准时间，没有这个就会相差8个小时
  timezone: "+08:00"
});

// 测试连接数据库是否成功的立即执行函数
// (async function(){
//   // 你可以使用 .authenticate() 函数测试连接是否正常
//   try{
//     await sequelize.authenticate();
//     console.log("连接数据库成功啦");
//   }catch(err){
//     console.log("连接数据库失败 =>",err);
//   }
// })()

// 定义一个User表，基于Model模型
class User extends Model{}

User.init({
  id: {
    // 数据类型：INTEGER整形 的 UNSIGNED无符号
    type: DataTypes.INTEGER.UNSIGNED,
    // 是否允许为null
    allowNull: false,
    // 是否为主键
    primaryKey: true,
    // 自动递增
    autoIncrement: true,
    // 注释
    comment: "表id"
  },
  userId: {
    // 数据类型为 STRING字符串
    type: DataTypes.UUID,
    allowNull: false,
    // 默认值
    defaultValue: "",
    // 是否具有唯一约束，用户id不能有重复
    unique: true,
    comment: "用户唯一id"
  },
  sex: {
    // 数据类型为Boolen 布尔
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: 2,
    comment: "性别 0女 1男 2未知"
  },
  phone: {
    // UUID(11) 表示11位
    type: DataTypes.UUID(11),
    allowNull: false,
    defaultValue: "",
    comment: "手机号"
  }
}, {
  // 需要传递连接的实例
  sequelize,

  // 需要选择模型的名称  默认情况下,当未提供表名时,Sequelize 会自动将模型名复数并将其用作表名.
  // 即 User --> Users
  // modelName: "User",

  // 可以使用 freezeTableName: true 参数停止 Sequelize 执行自动复数化. 这样,Sequelize 将推断表名称等于模型名称,而无需进行任何修改
  // freezeTableName: true,

  // 如果不想 modelName 和 freezeTableName，可以直接指定表名
  tableName: "kai_table"
});

// 同步数据库   
// force: false : 将创建表,如果表已经存在,不创建表，如果表不存在，则新建一个表
// force: true : 将创建表,如果表已经存在,则将其首先删除
User.sync({ force: false });

// 解析post请求体 application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// 解析 application/json 会在req对象添加一个body属性，该属性保存在post请求体的参数
app.use(bodyParser.json());

//CORS 跨域资源共享
//app.all(*)表示所有请求路径必须经过
app.all('*', (req, res, next) => {
  // 指定允许跨域地址
  // res.header("Access-Control-Allow-Origin", "http://127.0.0.1:5500/");

  // 动态允许跨域的地址 获取请求的域名：req.headers.origin 等同于 *
  res.header("Access-Control-Allow-Origin", req.headers.origin);

  // *表示允许所有域请求，在实际开发中，一般指定允许某个域请求，如上面设置 当使用了*时，不能和跨域携带cookie一起使用的
  // res.header("Access-Control-Allow-Origin", "*");

  //如果浏览器请求包括Access-Control-Request-Headers字段，则Access-Control-Allow-Headers字段是必需的。它也是一个逗号分隔的字符串，表明服务器支持的所有头信息字段，不限于浏览器在"预检"中请求的字段。
  res.header("Access-Control-Allow-Headers", "X-Requested-With,token,content-type");

  //该字段必需，它的值是逗号分隔的一个字符串，表明服务器支持的所有跨域请求的方法。注意，返回的是所有支持的方法，而不单是浏览器请求的那个方法。这是为了避免多次"预检"请求。
  res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");

  //该字段可选。它的值是一个布尔值，表示是否允许发送Cookie。默认情况下，Cookie不包括在CORS请求之中。设为true，即表示服务器明确许可，Cookie可以包含在请求中，一起发给服务器。这个值也只能设为true，如果服务器不要浏览器发送Cookie，删除该字段即可
  // res.header("Access-Control-Allow-Origin", "*") 和 res.header('Access-Control-Allow-Credentials', true) 不能一起使用的
  res.header('Access-Control-Allow-Credentials', true);

  // 是中间件，需要next()
  next();

});

// 当一访问服务器时，就会生成一个会话session
app.use(session({
  // 必须参数，用来当会话session的唯一标识
  secret: "my_session",
  // 设置cookie的sessionId的键名
  name: "sessionId",
  // 设置cookie的有效期
  cookie: {
    // 单位ms  设置20分钟有效期
    maxAge: 20 * 60 * 1000
  },
  // 当session没有改变时，无需重新保存
  resave: false,
  // 强制未初始化session，当session未初始化时，强制初始化
  saveUninitialized: true,
  // 当每次访问服务器，将cookie有效期重置
  rolling: true
}))

// 中间件 当请求的域名不正确时，拦截访问
app.use((req, res, next) => {
  // 设置请求域的白名单
  let hosts = [
    "127.0.0.1"
  ];

  // 获取用户的请求域名
  let host = req.headers.host.split(":")[0];

  if (hosts.indexOf(host) > -1) {
    // 携带请求参数
    req.userId = "user-kai";

    // 运行下一个路由的访问
    next();
  } else {
    res.send("请求域名不正确！");
  }
});

// 第二个中间件
app.use((req, res, next) => {
  // 设置请求的url白名单
  let whiteUrl = [
    "/cookie",
    "/like"
  ];

  // 获取请求的url
  let url = req.url.split("?")[0];

  // 判断白名单是否有请求的url，有，则需要验证token
  if(whiteUrl.indexOf(url) > -1){
    // 获取请求头的cookie
    let cookie = req.headers.cookie;
    // 把cookie分割
    let cookieArr = cookie.split("; ");
    let cookieObj = {};
    cookieArr.forEach(item => {
      let itemArr = item.split("=");
      cookieObj[itemArr[0]] = itemArr[1];
    });
    // 拼接成之前的token，用 . 连接字符串
    let token = `${cookieObj.ydts}.${cookieObj.asdw}.${cookieObj.klia}`;
    
    // 验证token是否合法 "secret"为之前生成token的加盐字符串
    jsonwebtoken.verify(token, "secret", (err, decoded) => {
      if(err){
        // 验证token失败
        res.send({msg: "请先登录!"});
      }else{
        // 在验证token成功后，把验证出来的uid存到请求参数里去
        req.uid = decoded.data;
        // 允许通过中间件
        next();
      }
    })
  }else{
    // 允许通过中间件
    next();
  }

})

// 使用express的静态文件模块，从而让ejs可以使用public文件的静态文件
// /assets/common 添加伪装路径，该路径服务器不存在的，这样做可以将服务器的静态文件隐藏起来
// app.use("/assets/common",express.static(path.resolve(__dirname,"public")));
app.use(express.static(path.resolve(__dirname, "public")));
// 可以设置多个静态目录
app.use(express.static(path.resolve(__dirname, "assets")));

// __dirname 是当前 app.js 的绝对路径 ，即 E:\黄恺web资料\node学习\expressServer
// 设置ejs渲染模板路径
app.set("views", path.resolve(__dirname, "views"));
// 设置ejs引擎 ，即访问的index文件的后缀为 ejs
// app.set("view engine", "ejs");

// 当要解析文件后缀为html时
app.set("view engine", "html");
app.engine(".html", ejs.__express);

// 路由
app.get("/", (req, res) => {
  // req请求对象，res响应对象

  // res.send 向前端响应数据，可以响应任何数据
  // res.send("<h1>express 服务器</h1>");

  // res.json返回的是一个json对象
  // res.json({a: 520});

  // 渲染 views里面的index.ejs文件
  res.render("index");
});

app.get("/cart", (req, res) => {
  res.send({ msg: "成功", code: 200, data: { uname: "kai" } });
});

// get 请求
app.get("/ejs", (req, res) => {
  // res.send 和 res.render 只能有一个
  res.render("ejs", { isShow: false, books: ["node", "ejs", "express", "hk"], userId: req.userId });

  let query = req.query;
  // get请求是查询参数 req.query：用户页面请求携带的参数data
  console.log(query);
});

// post 请求
app.post("/ejs", (req,res) => {
  let params = req.body;
  // post请求是请求体 req.body
  // 如果前端发起post请求，需要安装 npm i body-parser --save  来解析body 请求体，否则req.body会是undefined
  console.log("body 的 params =>",params);
  res.send(params);
});

// 登录的路由
app.get("/login", (req,res) => {
  // 当登录了，弄个登录的标识
  req.session.isLogin = true;

  // 当用户登录了，需要生成一个token
  // 定义一个用户id，用来签名一个token
  let userId = "uid_1314520";
  // "secret"是加盐（强化加密）
  // expiresIn: "1d" => 1天 , "3 days" => 3天 , "5h" => 5个小时 , 100 => 100秒 , "300" => 300ms
  let token = jsonwebtoken.sign({
    // 签名token的数据
    data: userId
  }, "secret", { expiresIn: 60 * 60 });

  // 需要对生成的token进行切片，防止被攻击
  let tokens = token.split(".");

  // 重新排序tokens
  let ts = {
    asdw: tokens[1],
    ydts: tokens[0],
    klia: tokens[2],
    // 干扰项
    yoka: "9qY7e8VoXMAHWIDkTLPSWnTMzNzkxMzgsImV4cCIjcsI"
  }

  res.send({msg: "登录成功！",code: 200, data: ts});
});

// 收藏路由
app.get("/like", (req,res) => {
  if(req.session.isLogin){
    res.send({msg: "收藏成功！", code: 200});
  }else{
    res.send({msg: "请先登录！", code: 201});
  }
});

// 跨域携带cookie
app.get("/cookie",(req,res) => {
  console.log("uid =>",req.uid);
  res.send({msg: "成功！"});
});

// 发送邮箱的接口
app.post("/email",(req,res) => {
  // 创建邮箱传输对象
  let transporter = nodemailer.createTransport({
    // 发送的地址
    host: "smtp.126.com",
    // 端口
    port: 465,
    // 安全，当设置port为465，需要将secure设置为true
    secure: true,
    // 授权用户
    auth: {
      // 用户名，邮箱号，即发送邮件的人
      user: "hkhuangkai520@126.com",
      // 授权码
      pass: "VGQRZDZPHRVPSAHC"
    }
  });

  // 发邮件
  transporter.sendMail({
    // 发送者的邮箱地址
    from: "hkhuangkai520@126.com",
    // 接收邮箱地址，如果存在多个接收地址，每一个邮箱地址需要使用 逗号 隔开
    to: "2360490189@qq.com, 1409357675@qq.com, 2271235639@qq.com",
    // 邮件主题
    subject: "黄恺发送的邮件",
    // 邮件文本内容
    text: "你好呀！爱你哦~~",
    // 邮件HTML内容
    html: "<a href='https://github.com/hkhk520/nicemall.git'>你好呀！爱你哦~~</a>"
  }, (err, info) => {
    if(err){
      // 发送失败
      res.send({msg: "邮件发送失败！"});
    }else{
      // 发送成功
      res.send({msg: "邮件发送成功", data: info});
    }
  })
});

// 注册的接口
app.post("/resigter", (req,res) => {
  let userId = uuid.v1();
  // let userId = uuid.v4();
  // console.log("userId =>",userId);
  // console.log("用户信息 =>",req.body);
  // console.log("用户手机号 =>",req.body.phone);

  // 把前端传过来的数据，写入到后端去
  User.create({
    phone: req.body.phone,
    sex: req.body.sex,
    userId
  }).then( result => {
    res.send({msg: "注册成功", data: result})
  }).catch(err => {
    res.send({msg: "注册失败"})
  });

});

app.post("/update", (req,res) => {
  // 模型.update(values, condition)
  // values: 需要修改的数据，object
  // condition: 条件，object

  User.update({
    phone: req.body.phone
  }, {
    where: {
      userId: "a6b66b60-8b8b-11eb-8f29-b5d51b7f4a5f"
    }
  }).then( result => {
    res.send({msg: "更新手机号成功", data: result})
  }).catch(err => {
    res.send({msg: "更新手机号失败"})
  })
});

app.post("/delete", (req,res) => {
  User.destroy({
    where: {
      phone: req.body.phone
    }
  }).then( result => {
    res.send({msg: "删除手机号成功", data: result})
  }).catch(err => {
    res.send({msg: "删除手机号失败"})
  })
});

// 查询数据库数据的接口
app.post("/findAll", (req,res) => {
  // 无条件查询数据，即查询全部数据
  User.findAll().then( result => {
    res.send({msg: "无条件查询数据成功", data: result})
  }).catch(err => {
    res.send({msg: "无条件查询数据失败"})
  })
});

// 指定条件查询的接口
app.post("/findSome", (req,res) => {
  // 指定条件查询，没有指定查询的字段
  // User.findAll({
  //   where: {
  //     sex: 1
  //   }
  // }).then( result => {
  //   res.send({msg: "指定条件查询成功", data: result})
  // }).catch(err => {
  //   res.send({msg: "指定条件查询失败"})
  // });

  // 指定返回的字段
  User.findAll({
    // 指定查询条件
    where: {
      sex: 1
    },
    // 指定返回的查询字段
    attributes: ["phone", "userId"]
  }).then( result => {
    res.send({msg: "指定条件查询和返回查询的字段成功", data: result})
  }).catch(err => {
    res.send({msg: "指定条件查询和返回查询的字段失败"})
  })
});

// 当前面的路由都匹配不到时，就会匹配use这个
app.use((req, res) => {
  // 设置状态码为404，即找不到路由
  res.status(404);
  res.send("Not Fount!");
})

// app的监听端口
app.listen(8080, () => {
  console.log("express server running");
})