const express = require('express');
const router = express.Router();


const TwitterStrategy = require('passport-twitter').Strategy;
const passport = require('passport');
const Twitter_User = require('../models/twitter_user');
const {User} = require('../models/user');
const Twit = require('twit');
const CryptoJs = require('crypto-js');
const auth = require('../middleware/auth');
const isLoggedIn = require('../middleware/isLoggedIn');

const path = require('path');



passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.deserializeUser(function(user, done) {
    done(null, user);
});


passport.use(new TwitterStrategy({
    consumerKey: 'F8Rb3OmQlwfwDsMGmicRKWvlw',
    consumerSecret: 'nLCmsuy0dM2GIBXbBtV2EdXm8ebnw6YZf7Gwg1ep72eIcAgBri',
    callbackURL: 'http://localhost/twitter/return',
  },
  async function(accessToken, refreshToken, profile, done) {
      
      
      let user = await Twitter_User.findOne({twitterId: profile.id});
      if (user) return done(null, profile); 
  
      
      
      user = new Twitter_User({
          twitterId: profile.id,
          username: profile.username,
          token: accessToken,
          tokenSecret: refreshToken
      });

      user.token = CryptoJs.AES.encrypt(user.token, 'secret 123').toString();
      user.tokenSecret = CryptoJs.AES.encrypt(user.tokenSecret, 'secret 123').toString();
  
      await user.save();
  
      return done(null, profile); 
    
  }
  ));

router.get('/login', passport.authenticate('twitter'));

router.get('/return', passport.authenticate('twitter', { failureRedirect: '/auth/error' }),
async function(req, res) {

  const user = await Twitter_User.findOne({twitterId: req.user.id});
  const token = user.generateAuthToken();

  //res.cookie('x-auth-token', token).sendFile('main.html', { root: path.join(__dirname, '../public') });
  //res.redirect('/twitter/main')
  res.cookie('x-auth-token', token).redirect('http://localhost/home.html')
});


router.get('/main', isLoggedIn, async (req,res) => {
    
    const user = await Twitter_User.findOne({twitterId: req.user.id});
    const token = user.generateAuthToken();

    res.cookie('x-auth-token', token).sendFile('main.html', { root: path.join(__dirname, '../public') });

})

router.get('/main_style.css', async(req, res) => {
  res.sendFile('main_style.css', { root: path.join(__dirname, '../public') });
})

router.get('/tweets', auth, async (req,res) => {
 
    const user = await Twitter_User.findById(req.user._id);
    if (!user) {
      const u = await User.findById(req.user._id);
      if (u)
         return res.status(401).send('no logged :(');
    }
    let bytes  = CryptoJs.AES.decrypt(user.token, 'secret 123');
    const tok_originalText = bytes.toString(CryptoJs.enc.Utf8);
    bytes  = CryptoJs.AES.decrypt(user.tokenSecret, 'secret 123');
    const sec_originalText = bytes.toString(CryptoJs.enc.Utf8);

    var T = new Twit({
      consumer_key:         'F8Rb3OmQlwfwDsMGmicRKWvlw',
      consumer_secret:      'nLCmsuy0dM2GIBXbBtV2EdXm8ebnw6YZf7Gwg1ep72eIcAgBri',
      access_token:         tok_originalText,
      access_token_secret:  sec_originalText,
      timeout_ms:           60*1000
    })
 
    T.get('search/tweets', { q: 'israel', count: 4,  locale: 'it', result_type: 'popular'} , function(err, data, response) {
      res.send({
        't1': data.statuses[0].text,
        't2': data.statuses[1].text,
        't3': data.statuses[2].text,
        't4': data.statuses[3].text,
      })
      
      
    })
  
})

router.get('/tweets/:topic', auth, async (req,res) => {
 
  const user = await Twitter_User.findById(req.user._id);
  if (!user) {
    const u = await User.findById(req.user._id);
    if (u)
      res.send('no logged :(');
  }
  let bytes  = CryptoJs.AES.decrypt(user.token, 'secret 123');
  const tok_originalText = bytes.toString(CryptoJs.enc.Utf8);
  bytes  = CryptoJs.AES.decrypt(user.tokenSecret, 'secret 123');
  const sec_originalText = bytes.toString(CryptoJs.enc.Utf8);

  var T = new Twit({
    consumer_key:         'F8Rb3OmQlwfwDsMGmicRKWvlw',
    consumer_secret:      'nLCmsuy0dM2GIBXbBtV2EdXm8ebnw6YZf7Gwg1ep72eIcAgBri',
    access_token:         tok_originalText,
    access_token_secret:  sec_originalText,
    timeout_ms:           60*1000
  })

  T.get('search/tweets', { q: `${req.params.topic}`, count: 4,  locale: 'it', result_type: 'popular'} , function(err, data, response) {
    res.send({
      't1': data.statuses[0].text,
      't2': data.statuses[1].text,
      't3': data.statuses[2].text,
      't4': data.statuses[3].text,
    })

    
  })

})
router.post('/tweets', auth, async (req, res) => {
    const user = await Twitter_User.findById(req.user._id);
    let bytes  = CryptoJs.AES.decrypt(user.token, 'secret 123');
    const tok_originalText = bytes.toString(CryptoJs.enc.Utf8);
    bytes  = CryptoJs.AES.decrypt(user.tokenSecret, 'secret 123');
    const sec_originalText = bytes.toString(CryptoJs.enc.Utf8);
    
    var T = new Twit({
      consumer_key:         'F8Rb3OmQlwfwDsMGmicRKWvlw',
      consumer_secret:      'nLCmsuy0dM2GIBXbBtV2EdXm8ebnw6YZf7Gwg1ep72eIcAgBri',
      access_token:         tok_originalText,
      access_token_secret:  sec_originalText,
      timeout_ms:           60*1000
    })
    T.post('statuses/update', {status: `${req.body.tweet}`}, function(err, data, response) {
      res.status(200).send(data);
    })

})

module.exports = router;