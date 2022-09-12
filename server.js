const express = require('express');
const app = express();
// 서버에 데이터 전송을 위한 코드
const http = require('http').createServer(app); // socket.io 셋팅
const {Server} = require('socket.io');
const io = new Server(http); // const app = express() 밑에만 사용하면 됨. npm install socket.io

const bodyParser = require('body-parser');
const {ObjectId} = require('mongodb');
app.use(bodyParser.urlencoded({extended : true}));
const methodOverride = require('method-override'); // npm install method-override, put, delete 사용위함
app.use(methodOverride('_method'));
app.set('view engine', 'ejs'); //npm install ejs
app.use('/public', express.static('public')); // 미들웨어, static 파일을 보관하기 위해 public 폴더를 사용할 것임을 명시. 서버 중간에 작동
const MongoClient = require('mongodb').MongoClient;
const passport = require('passport'); // install
const LocalStrategy = require('passport-local').Strategy;//install
const session = require('express-session');//install
require('dotenv').config();
app.use(session({secret : 'secretCode', resave : true, saveUninitialized : false}));
app.use(passport.initialize());
app.use(passport.session());
//app.use(미들웨어) : 요청 - 응답 중간에 뭔가 실행되는 코드
//multer을 이용한 이미지 하드에 저장하기

let multer = require('multer'); //npm install multer
var storage = multer.diskStorage({
    destination : function(req, file, cb) {
        cb(null, './public/image');
    },
    filename : function(req, file, cb) { // 저장한 이미지의 파일명 설정하는 부분
        cb(null, file.originalname);
    },
    // 확장자 필터 가능
});
var upload = multer({storage : storage}); // 미들웨어로 사용

var db;
MongoClient.connect(process.env.DB_URL, function(error, client) {

    if (error) {return console.log(error)}

    db = client.db('todoapp');
    app.db = db;

    
    http.listen(8080, function() { //socket.io 사용할 경우 app.listen 대신 http.listen 사용
      console.log('listening on process.env.PORT');
    });
});

// 서버에서는 무조건 client로 응답을 보내줘야 함
// app.use('/', require('./routes/member'));

// app.use('/', require('./routes/posts'));
app.get('/login', loginCheck, function(req, res){
    res.render('index.ejs');
});

app.post('/login', passport.authenticate('local', {
    failureRedirect : '/fail'
}) /* 검사 */, function(req, res){
    res.redirect('/');
});

app.get('/logout', loginCheck, function(req, res) {
    req.session.destroy(function(error, result) {
        if (error) return console.log(error);
        res.clearCookie('connect.sid');
        res.render('login.ejs');
    });
    
})

app.get('/mypage', loginCheck /* 미들웨어 */, function(req, res) {
    console.log(req.user);
    res.render('mypage.ejs', {user : req.user});
});

app.get('/fail', function(req, res) {
    res.redirect('/login');
})


app.get('/register', function(req, res) {
    res.render('signUp.ejs');
});

// 회원기능이 필요하면 passport 세팅하는 부분이 위에 있어야함
app.post('/register', function(req, res) {
    db.collection('login').insertOne({id : req.body.id, pw : req.body.pw}, function(error, result) {
        if (error) return console.log(error)
        res.redirect('/');
    });
});

app.get('/', function(req, res) {
    // res.sendFile(__dirname + '/index.html');
    res.render('index.ejs');
});

app.get('/write', loginCheck, function(req, res) {
    // res.sendFile(__dirname + '/write.html');
    res.render('write.ejs')
});

app.post('/add', loginCheck, function(req, res) {
    

    db.collection('counter').findOne({name : 'totalNumber'}, function(error, result) {// counter 라는 collection에 있는 db정보 중 name 이 totalNumber 인 데이터를 가져온다
        console.log(result.totalPost); // 총 게시물 개수

        var totalNumber = result.totalPost; // 0

        var push = {_id : totalNumber + 1, title : req.body.title, date : req.body.date, writer : req.user._id }// 작성자 정보 추가  

        /*  console.log(req.body.title); // body 까지만 쓰면 객체가 전달됨
        console.log(req.body.date); */
        db.collection('post').insertOne(push, function(error, result) {
            console.log('저장완료');

            // totalPost + 1
            db.collection('counter').updateOne({name : 'totalNumber'},{$inc /* operator  ex)$set 값 바꾸기*/ : {totalPost : 1}},function(error, result){
            if (error) {return console.log(error)}
            }); 
        });

        res.redirect('/list')
    });
  

   
});

app.get('/list', loginCheck, function(req, res) {

    db.collection('post').find().toArray(function(error, result) { // db에 저장된 post 라는 collection안의 모든 데이터를 꺼내기
        if (error) {return console.error}
        console.log(result);
        res.render('list.ejs', {posts : result}); //꺼낸 데이터 ejs파일에 집어넣기 
    });
});

app.delete('/delete', function(req, res) {
    console.log(req.body); // 자료 넘어올 때 숫자가 문자로 치환되어 넘어옴
    req.body._id = parseInt(req.body._id);

    var deleteData = {_id : req.body._id, writer : req.user._id} // 자신이 작성한 글만 삭제 가능

    db.collection('post').deleteOne(deleteData, function(error, result) {
        if (error) {return console.log(error)}
        console.log(result);
        if (result.deletedCount == 1) {
            console.log('삭제완료')
            res.status(200).send({ message : '성공했습니다.'}); // 요청 성공
        } else {
            console.log('삭제 실패');
            res.status(400).send({ message : '실패했습니다.'}); // 요청 실패
        }
    }); 
});

app.get('/detail/:id', loginCheck, function(req, res) {
    db.collection('post').findOne({_id : parseInt(req.params.id)}, function(error, result) { // 파라미터로 넘어오면서 문자로 치환됨. 정수로 바꿔야함
        if (error) {return console.log(error)}
        console.log(result);
        if (result == null) {
            res.status(400).send({message : '데이터가 없습니다'});
        }
        res.render('detail.ejs', {data : result});
    });
    
});

app.get('/edit/:id', loginCheck, function(req, res) {
    db.collection('post').findOne({_id : parseInt(req.params.id)}, function(error, result) {
        if (error) {return console.log(error)}
        console.log(result);
        if (result == null) {
            res.status(400).send({message : '데이터가 없습니다.'});
        }
        res.render('edit.ejs', {data : result});
    })
    
});

app.put('/edit', loginCheck, function(req, res) { // _id를 url의 파라미터에 넣어서 전송받아도 됨
    db.collection('post').updateOne({_id : parseInt(req.body._id)}, {$set : {title : req.body.title, date : req.body.date}}, function(error, result){
        if (error) {return console.log(error)}
        console.log('수정완료');
        res.redirect('/list');
    });
});


app.get('/search', function(req, res) {
    var searchCondition = [
        {
            $search: {
                index : 'titleSearch', // 만들었던 search index 이름
                text : {
                    query : req.query.value,
                    path : "title" // 제목 날짜 둘다 검사하고싶으면 ['제목', '날짜]
                }
            }
        },
        //{ $sort : {_id : 1}}, // id 오름차순으로 정렬
        //{ $limit : 10} // 상위 10개 까지만 검색
        //{ $project : {title : 1, _id:0, score: {$meta: "searchScore"}}} //위의 두개 조건 안쓸 때 검색 스코어 순으로 출력 가능 (검색 정확도)
    ]
    console.log(req.query);
    db.collection('post').aggregate(searchCondition).toArray(function(error, result) { //db 에 데이터가 많으면 찾는데 오래걸림. -> indexing(정렬) mongodb index, binary search 사용
        if (error) return console.log(error);
        if (!result) {
            return console.log('일치하는 결과가 없습니다.');
        } else {
            res.render('search.ejs', {posts : result});
        }
    });
}); //단어 띄어쓰기하면 or 검색, -붙이고 검색하면 제외가능, ""안에 넣으면 정확한 검색 가능, text index 쓰면 띄어쓰기 단위로 검색(한글이랑 맞지 않음)
    // 해결책 1. text index 사용하지 않고 검색할 문서의 양을 제한두기 (ex. 날짜) 2.mongodb 내부 search index 사용

app.get('/upload', function(req, res) {
    res.render('upload.ejs');
});    

app.post('/upload', upload.single(/* input의 name 속성 */'profile'), function(req, res) { //미들웨어로 upload 사용, 여러개 파일 올리려면 upload.array('input name', 10(개수))
    res.redirect('/image/' + req.file.originalname);
})

app.get('/image/:uploaded', function(req, res) {
    res.sendFile(__dirname + '/public/image/' + req.params.uploaded);
})


app.post('/chatroom', loginCheck, function(req, res) {
    var save = {
        title : '채팅방 이름',
        member : [ObjectId(req.body.receiveId), req.user._id],
        date : new Date()
    }
    db.collection('chatroom').insertOne(save).then((result) =>{
       
        res.redirect('/chat');
        console.log(result);
    }); // 콜백함수 function 대신에 이렇게 써도 됨

    
});


app.get('/chat', function(req, res) {
    db.collection('chatroom').find({member : req.user._id}).toArray().then((result) =>{
        res.render('chat.ejs', {data : result})
    }); 
    
});

app.post('/message', function(req, res) {
    var save = {
        parent : req.body.parent,
        content : req.body.content,
        userId : req.user._id,
        date : new Date()
    }

    db.collection('message').insertOne(save).then(()=> {
        console.log('db저장 성공');
        res.send('db저장 성공');
    }).catch(()=> {
        console.log('db 저장 실패');
    });
});

app.get('/message/:id', loginCheck, function(req, res) { // 서버와 유저간 실시간 소통채널 열기
    res.writeHead(200, { // 이 코드 덕분에 응답을 여러번 보낼 수 있음
        "Connection" : "keep-alive",
        "Content-Type" : "text/event-stream",
        "Cache-Control" : "no-cache",
     });

     /* res.write('event: test\n');
     res.write('data: 안녕하세요\n\n'); */

     db.collection('message').find({ parent : req.params.id}).toArray().then((result) =>{
        res.write('event: test\n'); // 보낼 데이터 이름 //event: 띄어쓰기 항상 확인
        res.write('data: ' + JSON.stringify(result) + '\n\n'); // 보낼 데이터 (문자 형태로만 전송 가능)
     });

     const pipeline = [  // db가 업데이트 -> 서버에게 알려줌 -> 유저에게 전달, mongodb language (Change Stream), 암기
        {$match: {'fullDocument.parent' : req.params.id} } //fullDocument  꼭 붙여야함
     ];
     const collection = db.collection('message');
     const changeStream = collection.watch(pipeline); // .watch() 붙이면 실시간 감시함
     changeStream.on('change', (result) => { //db에 변동사항이 생기면 밑 함수 실행
        console.log(result.fullDocument);
        res.write('event: test\n'); // event: 띄어쓰기 항상 확인
        res.write('data: ' + JSON.stringify([result.fullDocument]) + '\n\n'); // array 로 전송, 위 어레이 전송 코드와 규격 통일
     });
     
});

app.get('/socket', function(req, res) {
    res.render('socket.ejs');
});

io.on('connection', function(socket) { //웹소켓에 접속시 서버가 실행하는 것
    console.log('유저 접속함');

    socket.on('user-send', function(data) { //누가 user-send 이름으로 메세지 보내면 내부 코드 실행
        console.log(data); //유저가 보낸 메세지
    })
});







//미들웨어 함수 생성
function loginCheck(req, res, next) { // 로그인 후 세션이 있으면 req.user 가 항상 있음
    if (req.user) {
        next();
    } else {
        res.render('login.ejs');
    }
} 





// 로그인 인증하는 코드
passport.use(new LocalStrategy({
    usernameField : 'id',
    passwordField : 'pw',
    session : true, // 로그인 후 세션을 저장할 것인지
    passReqToCallback : false, //아이디 비밀번호 말고 다른 정보 검증 시
}, function(inputId, inputPw, done) {
    console.log(inputId, inputPw);
    db.collection('login').findOne({id : inputId}, function(error, result){
        if (error) return done(error)
        if (!result) return done(null, false, {message : '존재하지 않는 아이디입니다.'}) // result 가 아무것도 없을 때, null은 에러처리
        if (inputPw == result.pw) {
            return done(null, result)
        } else {
            return done(null, false, {message : '비밀번호가 일치하지 않습니다.'})
        }
    });
})); 


// 세션 + 쿠키 만들어 줌
passport.serializeUser(function(user, done){  // id를 이용해서 세션을 저장시키는 코드 (로그인 성공시 발동), user 은 위 코드에서의 result 값임
    done(null, user.id);
});

//위의 user.id 와 밑의 id 는 동일함
passport.deserializeUser(function(id, done) { //마이페이지 접속시 발동, 로그인한 유저의 세션아이디를 바탕으로 개인정보를 db에서 찾는 역할
    db.collection('login').findOne({id : id}, function(error, result) {
        if (error) return console.log(error);
        done(null, result); 
    })
    
});




