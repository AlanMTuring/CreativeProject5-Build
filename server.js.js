//Express Setup
const express = require('express');
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static('public'));

// Knex Setup
const env = process.env.NODE_ENV || 'development';
const config = require('./knexfile')[env];  
const knex = require('knex')(config);

// bcrypt setup
let bcrypt = require('bcrypt');
const saltRounds = 10;

app.listen(3010, () => console.log('Server listening on port 3010!'));


// LOGIN -------
app.post('/api/login', (req, res) => {
  if (!req.body.email || !req.body.password)
    return res.status(400).send();
  knex('users').where('email',req.body.email).first().then(user => {
    if (user === undefined) {
      res.status(403).send("Invalid credentials");
      throw new Error('abort');
    }
    return [bcrypt.compare(req.body.password, user.hash),user];
  }).spread((result,user) => {
    if (result)
      res.status(200).json({user:{username:user.username,name:user.name,id:user.id}});
    else
      res.status(403).send("Invalid credentials");
    return;
  }).catch(error => {
    if (error.message !== 'abort') {
      console.log(error);
      res.status(500).json({ error });
    }
  });
});

// REGISTER ----------
app.post('/api/users', (req, res) => {
    if (!req.body.email || !req.body.password || !req.body.username || !req.body.name)
        return res.status(400).send();
    knex('users').where('email',req.body.email).first().then(user => {
        if (user !== undefined) {
            res.status(403).send("Email address already exists");
            throw new Error('abort');
        }
        return knex('users').where('username',req.body.username).first();
    }).then(user => {
        if (user !== undefined) {
            res.status(409).send("User name already exists");
            throw new Error('abort');
        }
        return bcrypt.hash(req.body.password, saltRounds);
    }).then(hash => {
        return knex('users').insert({email: req.body.email, hash: hash, username:req.body.username,
                 name:req.body.name, role: 'user'});
    }).then(ids => {
        return knex('users').where('id',ids[0]).first().select('username','name','id');
    }).then(user => {
        res.status(200).json({user:user});
        return;
    }).catch(error => {
        if (error.message !== 'abort') {
            console.log(error);
            res.status(500).json({ error });
        }
    });
});


// GETTING A LIST OF SONGS
app.get('/api/users/:id/songs', (req, res) => {
  let id = parseInt(req.params.id);
  knex('users').join('songs','users.id','songs.user_id')
    .where('users.id',id)
    //.orderBy('created','desc')
    .select('song','username','name','created','songs.id').then(songs => {
      res.status(200).json({songs:songs});
    }).catch(error => {
      res.status(500).json({ error });
    });
});

//ADDING SONGS
app.post('/api/users/:id/songs', (req, res) => {
  let id = parseInt(req.params.id);
  knex('users').where('id',id).first().then(user => {
    return knex('songs').insert({user_id: id, song:req.body.song, created: new Date()});
  }).then(ids => {
    return knex('songs').where('id',ids[0]).first();
  }).then(song => {
    res.status(200).json({song:song});
    return;
  }).catch(error => {
    console.log(error);
    res.status(500).json({ error });
  });
});

app.delete('/api/users/:id/songs/:songId', (req, res) => {
    let id = parseInt(req.params.id);
    let songId = parseInt(req.params.songId);
    knex('users').where('id',id).first().then(user => {
      return knex('songs').where({'user_id':id,id:songId}).first().del();
    }).then(songs => {
      res.sendStatus(200);    
    }).catch(error => {
      console.log(error);
      res.status(500).json({ error });
    });
  });

//I THINK THIS IS GOING TO A USER PAGE
// app.get('/api/users/:id', (req, res) => {
//   let id = parseInt(req.params.id);
//   // get user record
//   knex('users').where('id',id).first().select('username','name','id').then(user => {
//     res.status(200).json({user:user});
//    }).catch(error => {
//      res.status(500).json({ error });
//    });
//  });
