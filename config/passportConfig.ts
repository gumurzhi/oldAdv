import {dbController} from '../controllers/dbController';
import {Strategy} from 'passport-local';
//import log4js = require('log4js');
import {getLogger} from 'log4js';
let logger = getLogger('passportConfig');
import bcrypt = require('bcrypt-nodejs');
import mongoose = require("mongoose");

export module passportConfig {
    export function configure(passport: any) {
        // used to serialize the userModel for the session
        passport.serializeUser(function (user:mongoose.Document, done:any) {
            logger.debug('it\'s a user:', user);
            done(null, user._id);
        });

        // used to deserialize the userModel
        passport.deserializeUser(function (id:string, done: any) {
            dbController.getUserById(id)
            .then(function(user){
               done(null, user);
            })
            .catch(function(err){
                logger.error(err);
                done(err)
            });
        });
        passport.use(new Strategy(
            function (username:string, password:string, callback:any) {
                dbController.getUser({username: username})
                    .then(function (user) {
                        if (!user) {
                            return callback(null, false, {message: 'Incorrect username.'});
                        } else if (!bcrypt.compareSync(password, user.password)) {
                            return callback(null, false, {message: 'Incorrect password.'});
                        }
                        //logger.trace('passport.use returns:', user);
                        return callback(null, user);
                    })
                    .catch(function (err) {
                        logger.error(err);
                        return callback(err);
                    });
            }
        ));
    }
}