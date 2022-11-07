require('dotenv').config();
const bodyParser = require('body-parser')
const express = require('express');
const cors = require('cors');
const app = express();
const dns = require("dns");
const mongoose = require('mongoose');
const e = require('express');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use(bodyParser.urlencoded({"extended": false}));
app.use('/public', express.static(`${process.cwd()}/public`));

let urlSchema = new mongoose.Schema({
  original_url : {type: String},
  short_url : {type: Number}
});
let Url = new mongoose.model("Url", urlSchema);

const verifyUrl = (url, done) => {
  let urlWithoutProtocol
  try {
    urlWithoutProtocol = new URL(url).hostname
  } catch(error) {
    console.log(error)
    return done(error, url)
  }
  dns.lookup(urlWithoutProtocol.toString(), function(error){
    if(error){
      console.log(error)
      done(error, url)
    } 
    done(null, url)
  });
}

const findUrl = (urlToFind, done) => {
  Url.find({original_url: urlToFind}, (err, docs) => {
    if(err) done(err, docs)
    done(null, docs)
  })
}

const findShortUrl = (urlToFind, done) => {
  Url.find({short_url: urlToFind}, (err, docs) => {
    if(err) done(err, docs)
    done(null, docs)
  })
}

const createAndSaveUrl = (urlToSave, done) => {
  Url.estimatedDocumentCount((error, count) =>{
    if(error) done(error, count)
    let url = new Url({original_url: urlToSave, short_url: parseInt(count)})
    url.save(function(err, data){
      if(err) done(err, data)
      done(null, data)
    });
  })
}

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.post('/api/shorturl', function(req,res){
  findUrl(req.body.url, (error, foundUrl) => {
    if(error){
      return console.log(error)
    } else if (foundUrl.length === 0){
      verifyUrl(req.body.url, (error, verifiedUrl) => {
        if(error){
          res.json({error: 'invalid url'});
        } else {
          createAndSaveUrl(verifiedUrl, (error, url) => {
            if(error) return console.log(error)
            console.log(url)
            res.json({original_url: url.original_url, short_url: url.short_url})
          }) 
        }
      })
    } else { 
      res.json({original_url: foundUrl[0].original_url, short_url: foundUrl[0].short_url})
    }
  });
});

app.get('/api/shorturl/:url', function(req, res){
  findShortUrl(req.params.url, (error, foundUrl) =>{
    if(error || foundUrl.length === 0){
      res.json({error: 'short url not found'})
    } else {
      res.redirect(foundUrl[0].original_url)
    }
  })
})

app.listen(port, function(err) {
  if(err) console.log(err)
  console.log(`Listening on port ${port}`);
});
