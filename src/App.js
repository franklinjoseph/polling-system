import React, { Component } from 'react';
import './App.css';
const { chain, isEmpty } = require('lodash');

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      choices: [],
      question: '',
      email: '',
      user_id: 0,
      username: '',
      choicesArr: [],
      answerArr: [],
      choiceAnswer: '',
      createQuestionFlag: '',
      isAuthenticated: false,
      authenticatedUsername: '',
      showResults: false,
      identify_error: '',
      poll_questions: [],
      poll_results: []
    }
  }

  //Retrive poll questions before rendering
  async componentDidMount() {
    console.log('component did mount');
    let poll = await fetch('http://localhost:5000/api/poll');
    let response = await poll.json();
    let result = chain(response.questions)
      .groupBy('question')
      .map((choices, question) => ({ choices, question }))
      .value();
    this.setState({
      poll_questions: result
    })
  }

  getPoll = async () => {
    let poll = await fetch('http://localhost:5000/api/poll');
    let response = await poll.json();
    let result = chain(response.questions)
      .groupBy('question')
      .map((choices, question) => ({ choices, question }))
      .value();
    this.setState({
      poll_questions: result
    })
  }

  //Function to handle form text inputs
  handleOnChange = (e, fieldName) => {
    if (fieldName === 'question') {
      this.setState({
        question: e.target.value
      })
    } else if (fieldName === 'username') {
      this.setState({
        username: e.target.value
      })
    } else if (fieldName === 'email') {
      this.setState({
        email: e.target.value
      })
    }
  }

  handleChoice = (e, choiceIndex) => {
    let choice = this.state.choicesArr;
    if (choice[choiceIndex])
      choice[choiceIndex].choiceName = e.target.value;
    else {
      choice[choiceIndex] = {}
      Object.assign(choice[choiceIndex], { choiceName: e.target.value });
    }
    this.setState({
      choicesArr: choice
    })
  }

  //Logic method to handle a choice's answer
  handleChoiceAnswer = (e, choiceIndex) => {
    let choiceAnswer = this.state.choiceAnswer;
    choiceAnswer = e.target.value;
    this.setState({ choiceAnswer })
  }

  //Logic method to handle creating a choice
  createChoice = (e) => {
    e.preventDefault();
    let choices = this.state.choices;
    choices.push('add')
    this.setState({
      choices: choices
    })
  }

  //Flag for opening new question section
  createQuestion = (e) => {
    e.preventDefault();
    this.setState({
      createQuestionFlag: true
    })
  }

  //Flag for close function
  closeQuestion = (e) => {
    e.preventDefault();
    this.setState({
      createQuestionFlag: false
    })
  }

  // Function to create a question with multiple choices
  submit = (e) => {
    e.preventDefault();
    var payload = {}
    if (this.state.choicesArr.length === 0) {
      alert('Please add choices first');
    }
    else if (this.state.choiceAnswer === '') {
      alert('You must choose the right choice to proceed');
    }
    else {
      //ready for form submit. Form payload for post
      payload.question = this.state.question;
      payload.choices = this.state.choicesArr;
      payload.rightAnswer = this.state.choiceAnswer;
      payload.email = this.state.email;

      fetch('http://localhost:5000/api/choice/create', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ payload })
      })
        .then((response) => {
          return response.json();
        })
        .then((data) => {
          this.setState({
            createQuestionFlag: false
          })
          this.getPoll();
        })
      // payload.[parseInt(this.state.choiceAnswer)].isAnswer = true;
    }
  }

  // Function to store and authenticate user
  handleAuthenticate = (e) => {
    e.preventDefault();
    let payload = {
      email: this.state.email,
      username: this.state.username,
    }
    fetch('http://localhost:5000/api/user/identify', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payload })
    })
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        if (data.msg === 'Success') {
          this.setState({
            isAuthenticated: true,
            authenticatedUsername: data.username,
            user_id: data.user_id,
          })
        } else if (data.msg === 'error') {
          this.setState({
            isAuthenticated: false,
            username: '',
            email: '',
            identify_error: data.error.sqlMessage,
          })
        }
      })
  }

  // Set flag to show results
  showResults = () => {
    this.setState({
      showResults: true
    })
  }

  // Submit poll to the backend and update ui
  submitPoll = async (e) => {
    e.preventDefault();
    fetch('http://localhost:5000/api/user/submit_poll', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ payload: this.state.answerArr }),
    })
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        this.showResults();
      })
  }

  //Logical function that handles radio button selection
  registerChoice = (e, question_id, user_id) => {
    let answerArr = this.state.answerArr;
    answerArr.push([question_id, parseInt(e.target.value), this.state.user_id]);
    this.setState({
      answerArr
    })
  }

  // Function to handle retry function
  handleRetry = async (e) => {
    e.preventDefault();
    fetch('http://localhost:5000/api/poll/delete', {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user_id: this.state.user_id }),
    })
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        if (data.msg === 'Success') {
          this.setState({
            showResults: false,
            identify_error: '',
            choicesArr: [],
            answerArr: [],
            poll_results: [],
          })
        }
      })
  }

  // Function to view results after submitting poll
  viewResults = async (e) => {
    // e.preventDefault();
    let poll = await fetch('http://localhost:5000/api/poll/results?username=' + this.state.authenticatedUsername);
    let response = await poll.json();
    let result = chain(response.results)
      .groupBy('question')
      .map((choices, question) => ({ choices, question }))
      .value();
    this.setState({
      poll_results: result
    })
  }

  render() {
    const { choices, identify_error, poll_results, showResults, createQuestionFlag, isAuthenticated, authenticatedUsername, poll_questions } = this.state;
    return (
      <div className="App">
        {/* Header section */}
        <header className="header">
          <div className="header-left-container">
            <h3>Polling System</h3>
            <p>Created by Franklin Joseph for LALCO coding challenge</p>
          </div>
          <div className="header-right-container">
            {isAuthenticated &&
              <>
                Hi, {authenticatedUsername}
              </>
            }
          </div>
        </header>
        <hr /><br />
        <div className="questions-section">
          <h3>Poll Questions:</h3>
          <br />
          <div className="poll-section">
            {!createQuestionFlag &&
              <button onClick={(e) => this.createQuestion(e)} className="btn btn-primary btn-small"> + Create Question</button>
            }
            <br />
            {/* Display New question section */}
            {createQuestionFlag &&
              <form onSubmit={(e) => this.submit(e)} className="jumbotron container">
                Question
              <input type="text" className="form-control" onChange={(e) => this.handleOnChange(e, 'question')} required />
                <br />
                <div className="col-4">
                  {choices.map((item, index) => {
                    return (
                      <div key={index} style={{ display: 'flex' }}>
                        <div>Choice #{index + 1} <input type="text" className="form-control" onChange={(e) => this.handleChoice(e, index)} required /></div>
                        <div>is answer? <input type="radio" name="choice" value={index} onChange={(e) => this.handleChoiceAnswer(e, index)} /></div>
                        <br />
                      </div>
                    )
                  })}
                </div>
                <button className="btn btn-primary btn-small" onClick={(e) => this.createChoice(e)}>Add Choice</button>
                <br /><br />
                <input type="submit" value="Submit Question" className="btn btn-primary btn-small" /> &nbsp;&nbsp;
                <button onClick={(e) => this.closeQuestion(e)} className="btn btn-danger btn-small"> Close</button>
              </form>
            }
            <br />
          </div>

          {/* Display the poll results */}
          {showResults &&
            <>
              <span className="badge badge-success">You have submitted the poll.</span>
              <br /><br />
              Retry? <button className="btn btn-primary btn-small" onClick={(e) => this.handleRetry(e)}>Click here</button>
              <br /><br />
              View Results? <button className="btn btn-primary btn-small" onClick={(e) => this.viewResults(e)}>Click here</button>
              <br /><br />
              {poll_results.map((poll, index) => {
                return (
                  <span key={index}>
                    {index + 1}, {poll.question} <br />
                    {poll.choices.map((choice, index2) => {
                      return (
                        <span key={index2}>
                          Attempt #{index2 + 1} {choice.choice}
                          {(choice.is_answer === 1 && choice.choice_id === choice.user_choice_id) &&
                            <>
                              <span class="glyphicon glyphicon-ok"></span>
                            </>
                          }
                          {(choice.is_answer !== 1 || choice.choice_id !== choice.user_choice_id) &&
                            <>
                              <span class="glyphicon glyphicon-remove"></span>
                            </>
                          }
                          &nbsp;&nbsp;
                        </span>
                      )
                    })}
                    <br /><br /><br />
                  </span>
                )
              })}
            </>
          }

          {/* Display Poll questions for users to answer */}
          {(!isEmpty(poll_questions) && !showResults) &&
            <>
              <form onSubmit={(e) => this.submitPoll(e)}>
                {poll_questions.map((poll, index) => {
                  return (
                    <span key={index}>
                      {index + 1}, {poll.question} <br />
                      {poll.choices.map((choice, index2) => {
                        return (
                          <span key={index2}>
                            <input type="radio"
                              name={`choiceAnswer - ${index}`}
                              value={choice.choice_id}
                              required
                              onChange={(e) => this.registerChoice(e, choice.question_id, choice.user_id)}
                            /> {choice.choice}  &nbsp;&nbsp;
                          </span>
                        )
                      })}
                      <br /><br /><br />
                    </span>
                  )
                })}
                <input type="submit" name="Submit" className="btn btn-primary btn-small" />
                <br /><br /><br />
              </form>
            </>
          }
          {isEmpty(poll_questions) &&
            <>
              No Questions Found
            </>
          }
        </div>
        {/* Display user authentication modal */}
        {!isAuthenticated &&
          <div className="modal">
            <div className="modal-container container">
              {identify_error}
              <form onSubmit={(e) => this.handleAuthenticate(e)}>
                <h3>Identify yourself</h3>
                <p>Please provide the following information to take part in the poll</p>
                <br />
                username
                <input type="text" className="form-control" onChange={(e) => this.handleOnChange(e, 'username')} required />
                <br />
                email
                <input type="email" className="form-control" onChange={(e) => this.handleOnChange(e, 'email')} required />
                <br />
                <input type="submit" name="Identify" className="btn btn-primary btn-small" />
              </form>

            </div>
          </div>
        }
      </div>
    );
  }

}

export default App;
