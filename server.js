const express = require('express')
const mongoose = require('mongoose')
const dataModel = require('./models/data')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')

// server created
const server = express()

// database
const dbURI =
  'mongodb+srv://jameson:jameson@cluster0.pcwhc.mongodb.net/?retryWrites=true&w=majority'
mongoose
  .connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true }) // used to remove deprication warning (not very important)
  .then((result) => {
    server.listen(3000) // listen for requests after connection to db is succesful
    console.log(
      'Connection to database successful, port 3000 listening for requests'
    ) // confirms db connection
  })
  .catch((err) => {
    console.log(err.message) // error catch
  })

// view engine
server.set('view engine', 'ejs')

// middleware
server.use(express.static('public')) // makes files in the public folder accessible
server.use(express.json())
server.use(express.urlencoded({ extended: true }))
server.use(cookieParser())

server.use((req, res, next) => {
  // app.use() executes for all requests coming from the client
  console.log('new request made:')
  console.log('host:', req.hostname)
  console.log('path:', req.path)
  console.log('method:', req.method)
  console.log('body:', req.body)
  next() // tells the server to execute next command for the request
})

// checks jwt
const requireAuth = (req, res, next) => {
  // this middleware has to be used for specific routes, not all routes hence no server.use
  const token = req.cookies.jwt

  // check json web token exists and is verified
  if (token) {
    jwt.verify(token, 'jamie arodi secret', (err, decodedToken) => {
      if (err) {
        console.log(err.message)
      } else {
        console.log(decodedToken)
        next()
      }
    })
  } else {
    res.redirect('/login')
  }
}

// check current user

const checkUser = (req, res, next) => {
  const token = req.cookies.jwt

  if (token) {
    jwt.verify(token, 'jamie arodi secret', async (err, decodedToken) => {
      if (err) {
        console.log(err.message)
        res.locals.user = null
        next()
      } else {
        console.log(decodedToken)
        const user = await dataModel.findById(decodedToken.id)
        res.locals.user = user
        // res.locals.data = data;
        next()
      }
    })
  } else {
    res.locals.user = null
    next()
  }
}

//  --ROUTES--
server.get('*', checkUser)

// homepage
server.get('/', requireAuth, (req, res) => {
  res.render('index', { title: 'Home' })
})

// signup page
// get
server.get('/signup', (req, res) => {
  res.render('signup', { title: 'Sign up' })
})

// post
server.post('/signup', async (req, res) => {
  const { firstName, lastName, email, password } = req.body

  try {
    const userA = await dataModel.create({
      firstName,
      lastName,
      email,
      password
    })

    const token = createToken(userA._id)
    res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 })
    res.status(201).json({ userA })
  } catch (err) {
    const errors = handleErrors(err)
    res.status(400).json(errors)
  }
})

// Login page
// post
server.post('/login', async (req, res) => {
  // const data = await dataModel.find();

  const { email, password } = req.body

  try {
    const user = await dataModel.login(email, password)
    if (user) {
      console.log('user has been identified and returned')
    }

    const token = createToken(user._id)
    res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 })

    res.status(200).json({ user: user._id })
    if (res.json()) {
      console.log('info sent to browser')
    }
  } catch (err) {
    const errors = handleErrors(err)
    res.status(400).json(errors)
  }
})

// get
server.get('/login', (req, res) => {
  res.render('login')
})

// logout
server.get('/logout', (req, res) => {
  res.cookie('jwt', '', { maxAge: 1 })
  res.redirect('/login')
})

server.post('/loans', async (req, res) => {
  const toChangeData = await dataModel.findOne({ email: req.body.email })
  const { email, totalCont, loanAmount } = toChangeData

  const docA = await dataModel
    .findOneAndUpdate(
      { email: req.body.email },
      {
        $set: {
          loanAmount: req.body.loanAmount,
          loanDate: req.body.loanDate,
          new: true
        }
      }
    )
    .then((result) => {
      res.redirect('/#section4')
    })
})

server.post('/contribution', async (req, res) => {
  const docB = await dataModel
    .findOneAndUpdate(
      { email: req.body.email },
      {
        $set: {
          monthlyCont: req.body.monthlyCont,
          totalCont:
            parseInt(req.body.totalCont) + parseInt(req.body.monthlyCont),
          new: true
        }
      }
    )
    .then((result) => {
      console.log(result)
      res.redirect('/#section3')
    })
})

server.get('/home', (req, res) => {
  res.render('home')
})

server.get('/#section5', async (req, res) => {
  const totals = await dataModel.find()
  res.json(totals)
})

// handling errors
const handleErrors = (err) => {
  console.log(err.message, err.code)

  const errors = {
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  }

  // duplicate error code
  if (err.code === 11000) {
    errors.email = 'That email has already been used'

    return errors
  }

  // invalid email/password for login
  if (err.message === 'incorrect email or password') {
    errors.email = 'incorrect email or password'
  }

  // validation errors
  if (err.message.includes('Userdata validation failed')) {
    Object.values(err.errors).forEach((error) => {
      errors[error.properties.path] = error.properties.message
    })
  }
  return errors
}

const maxAge = 3 * 24 * 60 * 60

const createToken = (id) => {
  return jwt.sign({ id }, 'jamie arodi secret', { expiresIn: maxAge })
}

// renders response for 404s
server.use((req, res) => {
  res.status(404).render('404', { title: 'Not found' })
})
