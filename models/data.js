const mongoose = require('mongoose');
const { isEmail } = require('validator');
const bcrypt = require('bcrypt');

const dataSchema = new mongoose.Schema({
    firstName:{
        type: String,
        required: [true, "Enter your first name"]
    },
    lastName:{
        type: String,
        required: [true, "Enter your last name"]
    },
    email:{
        type: String,
        required: [true, "Please enter an email"],
        unique: true,
        lowercase: true,
        validate: [ isEmail, "Please enter a valid email"]
    },
    password:{
        type: String,
        required: [true, "Please enter a password"],
        minlength: [6, "Minimum password length is 6 characters"]
    },
    loanAmount:{
        type: Number,
        required: false,
        default: 0
    },
    loanDate:{
        type: String,
        required: false
    },
    monthlyCont:{
        type: Number,
        required: false,
        default: 0
    },
    totalCont:{
        type: Number,
        required: false,
        default: 0
    }
}, {timestamps: true}); 

//mongoose pre hook
dataSchema.pre('save', async function (next){ // fires a function after a document has been saved to the database
    try{
       const salt = await bcrypt.genSalt();
       this.password =await bcrypt.hash(this.password, salt);
    }
    catch(err){
        console.log(err.message);
    } 
    next();
})

//static method to log in user
dataSchema.statics.login = async function (email, password) {
    const user = await this.findOne({ email });
    if(user) {
      const auth = await bcrypt.compare(password, user.password)  // used to compare the user login password and the hashed password
      if(auth) {
          return user;
      }
    }
    throw Error ('incorrect email or password');
}

const dataModel = mongoose.model('Userdata', dataSchema);

module.exports = dataModel;
