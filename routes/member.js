var router = require('express').Router();
const passport = require('passport'); // install
const LocalStrategy = require('passport-local').Strategy;//install
// router.use(loginCheck) 여기 모든 라우터에 이 미들웨어 적용

router.get('/login', loginCheck, function(req, res){
    res.render('index.ejs');
});

router.post('/login', passport.authenticate('local', {
    failureRedirect : '/fail'
}) /* 검사 */, function(req, res){
    res.redirect('/');
});

router.get('/logout', loginCheck, function(req, res) {
    req.session.destroy(function(error, result) {
        if (error) return console.log(error);
        res.clearCookie('connect.sid');
        res.render('login.ejs');
    });
    
})

router.get('/mypage', loginCheck /* 미들웨어 */, function(req, res) {
    console.log(req.user);
    res.render('mypage.ejs', {user : req.user});
});

router.get('/fail', function(req, res) {
    res.redirect('/login');
})


router.get('/register', function(req, res) {
    res.render('signUp.ejs');
});

// 회원기능이 필요하면 passport 세팅하는 부분이 위에 있어야함
router.post('/register', function(req, res) {
    db.collection('login').insertOne({id : req.body.id, pw : req.body.pw}, function(error, result) {
        if (error) return console.log(error)
        res.redirect('/');
    });
});

//미들웨어 함수 생성
function loginCheck(req, res, next) { // 로그인 후 세션이 있으면 req.user 가 항상 있음
    if (req.user) {
        next();
    } else {
        res.render('login.ejs');
    }
} 




module.exports = router;