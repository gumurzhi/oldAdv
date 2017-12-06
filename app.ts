
///<reference path="./typings/tsd.d.ts"/>
import {config} from './config/appConfig';
import * as express from 'express';
import * as path from 'path';
//import * as favicon from 'serve-favicon';
import * as cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';
var flash = require('connect-flash');
import {connection} from 'mongoose';
import * as session from 'express-session';
const MongoStore = require('connect-mongo')(session);
import * as passport from 'passport';
import {routeController} from './controllers/routeController';
import {passportConfig} from './config/passportConfig';
passportConfig.configure(passport);
import {configure} from "log4js";
configure('./config/log4js.json');
export var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'public/master/jade/pages'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: config.sessionSecret,
  //  store: sessionStore,
    store: new MongoStore({mongooseConnection: connection}),
    cookie: {maxAge: 315360000000},
    resave: true,
    saveUninitialized: false
}));
app.use(flash()); // use connect-flash for flash messages stored in session

var router = express.Router();
app.use(passport.initialize());
app.use(passport.session());

routeController(router);
app.use('/', router);


app.use(function (req: express.Request, res: express.Response, next: any) {
    var err: any = new Error('Page not found');
    err.status = 404;
    res.render('404');
    //next(err);
});

app.use(function (err: any, req: express.Request, res: express.Response) {
    console.log('sending error to customer');
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});