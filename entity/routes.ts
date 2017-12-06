///<reference path="../typings/tsd.d.ts"/>
import * as express from 'express';
import {auth} from '../controllers/auth';
import {varInterfaces} from './varInterfaces';
import {restController} from '../controllers/restController';
import {paypalController} from '../controllers/paypalController';
import {stripeController} from '../controllers/stripeController';
export var routes: varInterfaces.Routes[] = [
    {
        path: '/',
        httpMethod: 'GET',
        authToUse: false,
        middleware: [function (req: express.Request, res: express.Response, next:any) {
            res.sendFile('index.html');
        }]
    },
    // // show the login form
    // {
    //     path: '/login',
    //     httpMethod: 'GET',
    //     authToUse: false,
    //     middleware: [function (req: express.Request, res: express.Response, next:any) {
    //
    //         // render the page and pass in any flash data if it exists
    //         res.render('login.jade');
    //
    //     }]
    // },
    {
        path: '/login',
        httpMethod: 'POST',
        authToUse: false,
        middleware: [auth.login]
    },

    {
        path: '/signup',
        httpMethod: 'POST',
        authToUse: 'isLoggedIn',
        middleware: [restController.createNewUser]
    },
    {
        path: '/logout',
        httpMethod: 'GET',
        authToUse: false,
        middleware: [auth.logout]
    },
    // {
    //     path: '/home',
    //     httpMethod: 'GET',
    //     authToUse: 'isLoggedIn',
    //     middleware: [function (req: express.Request, res: express.Response, next:any) {
    //         res.render('home');
    //     }]
    // },
    {
        path: '/user/getInfo',
        httpMethod: 'GET',
        authToUse: 'isLoggedIn',
        middleware: [restController.getUserData]
    },
    {
        path: '/user/profile',
        httpMethod: 'GET',
        authToUse: 'isLoggedIn',
        middleware: [restController.getUserProfile]
    },
    {
        path: '/user/profile',
        httpMethod: 'POST',
        authToUse: 'isLoggedIn',
        middleware: [restController.setUserProfile]
    },
    {
        path: '/user/changePassword',
        httpMethod: 'POST',
        authToUse: 'isLoggedIn',
        middleware: [restController.changePassword]
    },
    {
        path: '/adv/addCampaign',
        httpMethod: 'POST',
        authToUse: 'isLoggedIn',
        middleware: [restController.addAdvCamp]
    },
    {
        path: '/adv/update',
        httpMethod: 'POST',
        authToUse: 'isLoggedIn',
        middleware: [restController.changeAdvCamp]
    },
    // {
    //     path: '/adv/remove',
    //     httpMethod: 'POST',
    //     authToUse: 'isLoggedIn',
    //     middleware: [restController.removeCampaign]
    // },
    {
        path: '/adv/getMy',
        httpMethod: 'GET',
        authToUse: 'isLoggedIn',
        middleware: [restController.getMyCampaigns]
    },
    {
        path: '/adv/changeStatus',
        httpMethod: 'POST',
        authToUse: 'isLoggedIn',
        middleware: [restController.changeCampaignStatus]
    },
    {
        path: '/adv/getCampaign',
        httpMethod: 'POST',
        authToUse: 'isLoggedIn',
        middleware: [restController.getAdvCampaign]
    },
    {
        path: '/adv/getPrediction',
        httpMethod: 'POST',
        authToUse: 'isLoggedIn',
        middleware: [function(req, res){
            restController.getAdvPrediction(req, res);
        }]
    },
    {
        path: '/abuse/set',
        httpMethod: 'POST',
        authToUse: 'isLoggedIn',
        middleware: [restController.setAbuse]
    },
    {
        path: '/paypal/create',
        httpMethod: 'POST',
        authToUse: 'isLoggedIn',
        middleware: [function(req, res){
            paypalController.createPayment(req, res)
        }]
    },
    {
        path: '/paypal/execute',
        httpMethod: 'GET',
        authToUse: 'isLoggedIn',
        middleware: [function(req, res){
            paypalController.execute(req, res)
        }]
    },
    {
        path: '/paypal/cancel',
        httpMethod: 'GET',
        authToUse: 'isLoggedIn',
        middleware: [function(req, res){
            paypalController.cancel(req, res)
        }]
    },
    {
        path: '/stripe/charge',
        httpMethod: 'POST',
        authToUse: 'isLoggedIn',
        middleware: [stripeController.charge]
    }
   
];