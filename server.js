const express = require('express');
const path = require('path');
var cors = require('cors');
var app = express()
const bodyParser = require('body-parser');
const { isEmpty } = require('lodash');
const connection = require('./mysql-connection');
const query = require('./mysql-query');

//Cors whitelisting react origin requests
var whitelist = ['http://localhost:3000']

var corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}

//cors configuration to allow cross origin requests from http://localhost:3000 only
app.use(cors(corsOptions));

app.use(bodyParser.urlencoded({
  extended: true,
}));

//JSON parser config
app.use(bodyParser.json());

//DB Configuration. Advised to use values from .env file specific to the environment
const dbConfig = {
  host: process.env.host || '127.0.0.1',
  user: process.env.db_user || 'root',
  password: process.env.db_user || 'polldb123',
  database: process.env.db_pass || 'poll_db'
}

app.use(express.static(path.join(__dirname, 'public')));

//API endpoint to indentify the user.
//Performs 2 function  - 
// 1, Insert a new user or 2, Updates an existing user
app.post('/api/user/identify', async (req, res) => {
  try {
    const conn = await connection(dbConfig).catch(e => { })
    const users = await query(conn, `SELECT * FROM poll_db_users WHERE email = ?`, [req.body.payload.email])
      .then(async (users) => {
        if (!isEmpty(users)) {
          //Send json response back to UI
          res.json({ msg: 'Success', userType: 'old', username: users[0].username, user_id: users[0].user_id })
        } else {
          const results = await query(conn, `INSERT INTO poll_db_users
                            (email, username)
                            VALUE (?, ?)`, [req.body.payload.email, req.body.payload.username]
          )
            .then((data) => {
              //Send json response back to UI
              res.json({ msg: 'Success', userType: 'New', username: req.body.payload.username, user_id: data.insertId })
            })
            .catch((error) => {
              res.json({ msg: 'error', error })
            })
        }
      })
  } catch (error) {
    res.json({ msg: 'error', error })
  }
})

//API endpoint to create a question & multiple choices
//First the Question is inserted and wait for promise to insert the choices. Multiple choices are inserted using array
app.post('/api/choice/create', async (req, res) => {
  try {
    const conn = await connection(dbConfig).catch(e => { })
    //First find the id of the user who is the author or creater of the question.
    await query(conn, `SELECT * FROM poll_db_users WHERE email = ?`, [req.body.payload.email])
      .then(async (user) => {
        //insert question
        await query(conn, `INSERT INTO poll_db_questions
          (question, user_id)
          VALUE (?, ?)`, [req.body.payload.question, user[0].user_id]
        )
          .then(async (question) => {
            var inputArr = []
            //Form the array of values for the choices
            req.body.payload.choices.map((choice, index) => {
              var is_answer;
              if (index === parseInt(req.body.payload.rightAnswer)) {
                is_answer = true;
              } else {
                is_answer = false;
              }
              inputArr.push([question.insertId, user[0].user_id, is_answer, choice.choiceName])
            })
            //insert choices
            const res = await query(conn, `INSERT INTO poll_db_choices
                        (question_id, user_id, is_answer, choice)
                        VALUES ?`, [inputArr]
            )
              .then((choices) => {
                res.json({ msg: 'Success' })
              })
          })
          .catch((error) => {
            res.json({ msg: error })
          })
      })
      .catch((error) => {
        res.json({ msg: error })
      })
  } catch (error) {
    res.json({ msg: error })
  }
})

//API endpoint to fetch the poll questions. JOIN is used to collect data from 3 tables.
app.get('/api/poll', async (req, res) => {
  try {
    const conn = await connection(dbConfig).catch(e => { })
    await query(conn, `SELECT q.question, 
                              q.question_id,
                              c.choice,
                              c.choice_id,
                              c.is_answer,
                              u.username,
                              u.user_id
                      FROM
                          poll_db_questions q
                      LEFT JOIN poll_db_choices c
                            ON q.question_id = c.question_id
                      LEFT JOIN poll_db_users u
                            ON q.user_id = u.user_id
                      WHERE 
                          c.choice IS NOT NULL
                      ORDER BY
                            u.username,
                            q.question`)
      .then(async (questions) => {
        res.json({ questions: questions })
      });
  } catch (error) {
    res.json({ msg: error })
  }
})

//API endpoint to fetch the results for a user using username. JOIN is used for collection dta from 3 tables
app.get('/api/poll/results', async (req, res) => {
  try {
    const conn = await connection(dbConfig).catch(e => { })
    await query(conn, `SELECT * FROM poll_db_users WHERE username = ?`, [req.query.username])
      .then(async (users) => {
        await query(conn, `SELECT 
                                q.question,
                                c.choice,
                                c.choice_id,
                                c.is_answer,
                                d.user_choice_id
                          FROM
                              poll_db_user_answers d
                          LEFT JOIN poll_db_questions q
                              ON q.question_id = d.question_id
                          LEFT JOIN poll_db_choices c
                              ON d.user_choice_id = c.choice_id
                          WHERE 
                              d.user_id = ${users[0].user_id}
                  `)
          .then(async (results) => {
            res.json({ results })
          });
      })
  } catch (error) {
    res.json({ msg: error })
  }
})

//API endpoint to submit the poll answers. Id's of question, user choice & user id is captured.
app.post('/api/user/submit_poll', async (req, res) => {
  try {
    const conn = await connection(dbConfig).catch(e => { })
    const res = await query(conn, `INSERT INTO poll_db_user_answers
                        (question_id, user_choice_id, user_id)
                        VALUES ?`, [req.body.payload]
    )
      .then((choices) => {
        res.json({ msg: 'Success' })
      })
  } catch (error) {
    res.json({ msg: error })
  }
})

//API endpoint to delele upon retrying. THis is to illustrate the DELETE query with Express
app.delete('/api/poll/delete', async (req, res) => {
  try {
    const conn = await connection(dbConfig).catch(e => { })
    await query(conn, `DELETE FROM poll_db_user_answers WHERE user_id = ?`, [req.body.user_id])
                  .then((records) => {
                    res.json({msg: 'Success'})
                  })
  } catch (error) {
    res.json({msg: error})
  }
})


app.get('/poll', (req, res) => {
  res.sendFile(path.join(__dirname + '/public/index.html'));
});

const port = process.env.PORT || 5000;
app.listen(port)