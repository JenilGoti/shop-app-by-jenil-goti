const path = require('path');

const express = require('express');
const {
    check,
    body,
    validationResult
} = require('express-validator');

const authController = require('../controllers/auth');

const User = require('../models/user');

const router = express.Router();



router.get("/login", authController.getLogin);

router.get("/singup", authController.getSingup);

router.get("/reset", authController.getReset);

router.get("/reset/:token", authController.getNewPassword);

router.post("/login", [body('email')
    .isEmail()
    .withMessage('Please enter the valid email')
    .normalizeEmail(),
    body('password')
    .isAlphanumeric()
    .trim()

], authController.postLogin);

router.post("/singup", [check('email')
    .isEmail()
    .withMessage('Please enter the valid email')
    .custom((value, {
        req
    }) => {
        // if (value === 'test@test.com') {
        //     throw new Error('This email address is forbidden');
        // }
        return User.findOne({
                email: value
            })
            .then(userDoc => {
                if (userDoc) {
                    return Promise.reject('E-mail already exist,please pike a diffrent one.');
                }
            });
    })
    .normalizeEmail(),
    body('password', 'Please enter a password with only numbers and text and at least 5 characters.').isLength({
        min: 5
    })
    .trim(),
    check('confirmPassword').custom((value, {
        req
    }) => {
        console.log(value);
        console.log(req.body.password);
        if (value !== req.body.password) {
            throw new Error('Password Have to match!');
        }
        return true;
    })
    .trim()
], authController.postSingup);

router.post("/logout", authController.postLogout);

router.post("/reset", authController.postReset);

router.post('/new-password', authController.postNewPassword);



module.exports = router;
