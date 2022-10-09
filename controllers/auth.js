const bcrypt = require('bcryptjs');
const User = require("../models/user");
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const {
    validationResult
} = require('express-validator');
const {
    errorStrictEqual
} = require('mongodb/lib/core/utils');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});



exports.getLogin = (req, res, next) => {
    // const isLoggedIn = req.get('Cookie').split('=')[1].trim() == 'true';
    // console.log(req.session.isLoggedIn);
    // console.log(req.flash(errorEmail));
    let emailError = req.flash('errorEmail');
    let passwordError = req.flash('errorPassword');
    if (emailError.length > 0) {
        emailError = emailError[0];
    } else {
        emailError = null;
    }
    if (passwordError.length > 0) {
        passwordError = passwordError[0];
    } else {
        passwordError = null;
    }
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        errorMessageEmail: emailError,
        errorMessagePassword: passwordError,
        oldInput: {}
    });
};

exports.getSingup = (req, res, next) => {
    // const isLoggedIn = req.get('Cookie').split('=')[1].trim() == 'true';
    // console.log(req.session.isLoggedIn);
    let emailError = req.flash('errorEmail');
    let passwordError = req.flash('errorPassword');
    if (emailError.length > 0) {
        emailError = emailError[0];
    } else {
        emailError = {};
    }
    if (passwordError.length > 0) {
        passwordError = passwordError[0];
    } else {
        passwordError = {};
    }
    // console.log('sing up');
    res.render('auth/singup', {
        path: '/singup',
        pageTitle: 'Singup',
        errorMessageEmail: emailError,
        errorMessagePassword: passwordError,
        oldInput: {}
    });
};

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const error = validationResult(req);
    console.log(error.array());
    emailError = null;
    passwordError = null;
    error.array().forEach(err => {
        if (err.param === 'email') {
            emailError = err.msg;
        }
        if (err.param === 'password' || err.param === 'confirm_password') {
            passwordError = err.msg;
        }
    })

    if (!error.isEmpty()) {
        return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessageEmail: emailError,
            errorMessagePassword: passwordError,
            oldInput: {
                email: email,
                password: password
            }
        });
    }

    return User.findOne({
            email: email
        }).then(user => {
            if (!user) {
                req.flash('errorEmail', '* Invalid email')
                return res.status(422).render('auth/login', {
                    path: '/login',
                    pageTitle: 'Login',
                    errorMessageEmail: 'Invalid Email',
                    errorMessagePassword: '',
                    oldInput: {}
                });
            }
            bcrypt.compare(password, user.password).then(result => {
                if (result) {
                    const mailConfigurations = {

                        from: 'gotijenil@gmail.com',

                        to: user.email,

                        subject: 'welcome',

                        text: 'welcome to our shop app'
                    };
                    transporter.sendMail(mailConfigurations).then().catch(err => {
                        console.log(err);
                    })
                    req.session.isLoggedIn = true;
                    req.session.user = user
                    return req.session.save((err) => {
                        if (err) {
                            console.log(err);
                        }
                        res.redirect('/');
                    });
                } else {
                    req.flash('errorPassword', '* Invalid Password')
                    return res.status(422).render('auth/login', {
                        path: '/login',
                        pageTitle: 'Login',
                        errorMessageEmail: emailError,
                        errorMessagePassword: 'Invalid Password',
                        oldInput: {
                            email: email,
                            password: ''
                        }
                    });
                }

            }).catch(err => {
                const error = new Error(err);
                error.httpStatusCode = 500;
                return next(error);

            });

        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        })


};
exports.postSingup = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    const error = validationResult(req);
    console.log(error.array());
    emailError = {};
    passwordError = {};
    error.array().forEach(err => {
        if (err.param === 'email') {
            emailError = err;
        }
        if (err.param === 'password' || err.param === 'confirmPassword') {
            passwordError = err;
        }
    })

    if (!error.isEmpty()) {
        return res.status(422).render('auth/singup', {
            path: '/singup',
            pageTitle: 'Singup',
            errorMessageEmail: emailError,
            errorMessagePassword: passwordError,
            oldInput: {
                email: email,
                password: password,
                confirmPassword: confirmPassword
            }
        });
    }
    bcrypt.hash(password, 12)
        .then((hasedPassword) => {
            // console.log(hasedPassword);

            const user = new User({
                email: email,
                password: hasedPassword,
                cart: {
                    items: []
                }
            });
            return user.save();
        })
        .then(result => {
            res.redirect('/login');
        }).catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });

};
exports.postLogout = (req, res, next) => {
    // req.session.isLoggedIn=true;
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        }
        res.redirect('/')
    })

};


exports.getReset = (req, res, next) => {
    let emailError = req.flash('errorEmail');
    if (emailError.length > 0) {
        emailError = emailError[0];
    } else {
        emailError = null;
    }
    res.render('auth/reset', {
        path: '/reset',
        pageTitle: 'Reset Password',
        errorMessageEmail: emailError,
    });

}


exports.postReset = (req, res, next) => {
    let tokan;
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            // req.flash('errorEmail', '* Email already Exist')
            console.log(err);
            return res.redirect('/reset')
        }
        tokan = buffer.toString('hex');
        User.findOne({
                email: req.body.email
            })
            .then(user => {
                if (!user) {
                    req.flash('errorEmail', 'no account with this email')
                    res.redirect('/reset')
                }
                user.resetToken = tokan;
                user.resetTokenExpiration = Date.now() + 3600000;
                return user.save();
            })
            .then(result => {
                res.redirect('/');
                const mailConfigurations = {

                    // It should be a string of sender email
                    from: 'gotijenil@gmail.com',

                    // Comma Separated list of mails
                    to: req.body.email,

                    // Subject of Email
                    subject: 'Pssword resrt',

                    // This would be the text of email body
                    html: `
                    <p> you requested a password reset </p>
                    <p> Click this link to set a new password.</p>
                    <a href="https://shop-app-by-jenil-goti.herokuapp.com/reset/${tokan}">Reset Password</a>
                    
                    `
                };
                transporter.sendMail(mailConfigurations).then().catch(err => {
                    console.log(err);
                })

            })
            .catch(err =>{
                const error=new Error(err);
                  error.httpStatusCode = 500;
                  return next(error);
              })
    })
}

exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;
    User.findOne({
        resetToken: token,
        resetTokenExpiration: {
            $gt: Date.now()
        }
    }).then(user => {
        res.render('auth/new-password', {
            path: '/new password',
            pageTitle: 'New Password',
            userId: user._id.toString(),
            passwordTokan: token
        });
    }).catch(err =>{
        const error=new Error(err);
          error.httpStatusCode = 500;
          return next(error);
      })


}

exports.postNewPassword = (req, res, next) => {
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordTokan = req.body.passwordTokan;

    let resetUser;
    User.findOne({
            resetToken: passwordTokan,
            resetTokenExpiration: {
                $gt: Date.now()
            },
            _id: userId
        }).then(user => {
            resetUser = user;
            return bcrypt.hash(newPassword, 12);
        })
        .then(hashedPassword => {
            resetUser.password = hashedPassword;
            resetUser.resetToken = null;
            resetUser.resetTokenExpiration = null;
            return resetUser.save()
        })
        .then(result => {
            res.redirect('/login');
        })
        .catch(err =>{
            const error=new Error(err);
              error.httpStatusCode = 500;
              return next(error);
          });

}