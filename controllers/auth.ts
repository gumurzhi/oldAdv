///<reference path="../typings/tsd.d.ts"/>
import {authenticate} from 'passport';
import * as express from 'express';
import {getLogger} from 'log4js';
let logger = getLogger('auth');
export module auth {
    // export function register(req:express.Request, res:express.Response, next?:any) {
    //     // authenticate('local', {
    //     //     successRedirect: '/home', // redirect to the secure home section
    //     //     failureRedirect: '/signup', // redirect back to the signup page if there is an error
    //     //     failureFlash: true // allow flash messages
    //     // })(req, res, next);
    //    
    // }

    export function login(req:express.Request, res:express.Response, next:any) {
        authenticate('local', function(err, user, info) {
            if (err) {
                logger.error(err);
                return next(err); }
            if (!user) {
                logger.error('there are no such user');
                return res.json({error: 'wrong username or password'});
            }
            req.logIn(user, function(err) {
                if (err) { return next(err); }
                delete user.password;
                if(user.wallet) user.wallet /= 1000;
                return res.json(user);
            });
        })(req, res, next);
    }

    // export function login(req:express.Request, res:express.Response, next:any) {
    //     // logger.info('req.body' ,req.body);
    //     authenticate('local', function (err, user, info) {
    //         req.logIn(user, function (err) {
    //             if (err) {
    //                 logger.error('authenticate error:', err);
    //                 return res.json({error: 'wrong username or password'});
    //             }
    //             return res.json({username: user.username, wallet: user.wallet, email: user.email});
    //         })
    //     })(req, res, next);
    // }

    export function logout(req:express.Request, res:express.Response) {
        req.session.destroy(function (err) {
            res.redirect('/'); //Inside a callback… bulletproof!
        });

    }
}
